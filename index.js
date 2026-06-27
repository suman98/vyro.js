import { minify as minifyHtml } from 'html-minifier-terser'
import JavaScriptObfuscator from 'javascript-obfuscator'
import { resolve, dirname, basename, extname, relative } from 'path'
import fs from 'fs'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'

const WRAP_EXTS = ['.vue', '.jsx', '.tsx']
const ALL_EXTS = ['.html', ...WRAP_EXTS]

function keyFor(pagesDir, htmlPath) {
  return relative(pagesDir, htmlPath).replace(/\.html$/, '').replace(/[/\\]/g, '-') || 'index'
}

function walkFolder(pagesDir, dir, entries) {
  const hasIndexHtml = fs.existsSync(resolve(dir, 'index.html'))
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, dirent.name)
    if (dirent.isDirectory()) {
      walkFolder(pagesDir, full, entries)
      continue
    }
    const ext = extname(dirent.name)
    const base = basename(dirent.name, ext)
    if (ext === '.html') {
      entries.push({ srcFile: full, htmlPath: full, dir, base, ext, needsWrapper: false, key: keyFor(pagesDir, full) })
    } else if (WRAP_EXTS.includes(ext) && base === 'index' && !hasIndexHtml) {
      const htmlPath = resolve(dir, 'index.html')
      entries.push({ srcFile: full, htmlPath, dir, base: 'index', ext, needsWrapper: true, key: keyFor(pagesDir, htmlPath) })
    }
  }
}

function discoverEntries(pagesDir) {
  const entries = []
  if (!fs.existsSync(pagesDir)) return entries
  for (const dirent of fs.readdirSync(pagesDir, { withFileTypes: true })) {
    if (dirent.isFile()) {
      const ext = extname(dirent.name)
      if (!ALL_EXTS.includes(ext)) continue
      const srcFile = resolve(pagesDir, dirent.name)
      const base = basename(dirent.name, ext)
      entries.push({
        srcFile,
        htmlPath: resolve(pagesDir, `${base}.html`),
        dir: pagesDir,
        base,
        ext,
        needsWrapper: ext !== '.html',
        key: base,
      })
    } else if (dirent.isDirectory()) {
      walkFolder(pagesDir, resolve(pagesDir, dirent.name), entries)
    }
  }
  return entries
}

export default function vyroJs(options = {}) {
  const {
    pagesDir: pagesDirOption = 'src/pages',
    obfuscate = false,
    prettyUrls = true,
    debug = false,
  } = options

  const minify      = !debug
  const splitChunks = !debug
  const sourcemap   = debug

  // Shared context — populated in the config hook and reused across all sub-plugins.
  const ctx = {
    projectRoot: null,
    pagesDir: null,
    distDir: null,
    htmlCache: new Map(),   // abs htmlPath → html string (wrapper entries only)
    cachedEntries: null,
  }

  function generateWrappers() {
    ctx.cachedEntries = discoverEntries(ctx.pagesDir)
    ctx.htmlCache.clear()

    for (const entry of ctx.cachedEntries) {
      if (!entry.needsWrapper) continue
      const { srcFile, htmlPath, dir, base, ext } = entry
      const srcUrl = '/' + relative(ctx.pagesDir, srcFile).replace(/\\/g, '/')
      const title  = base === 'index' ? basename(dir) : base

      let headExtra = ''
      let bodyHtml  = ''

      if (ext === '.vue') {
        bodyHtml = [
          `  <div id="app"></div>`,
          `  <script type="module">`,
          `    import { createApp } from 'vue'`,
          `    import App from '${srcUrl}'`,
          `    createApp(App).mount('#app')`,
          `  </script>`,
        ].join('\n')
      } else {
        const code       = fs.readFileSync(srcFile, 'utf-8')
        const styleMatch = code.match(/^\s*<style[^>]*>([\s\S]*?)<\/style>\s*/)
        if (styleMatch?.[1]?.trim()) {
          headExtra = `  <style>\n${styleMatch[1].trim()}\n  </style>\n`
        }
        const stripped   = styleMatch ? code.slice(styleMatch[0].length) : code
        const selfMounts = /createRoot\s*\(|ReactDOM\s*\.\s*render\s*\(/.test(stripped)

        bodyHtml = selfMounts
          ? `  <div id="root"></div>\n  <script type="module" src="${srcUrl}"></script>`
          : [
              `  <div id="root"></div>`,
              `  <script type="module">`,
              `    import { createElement } from 'react'`,
              `    import { createRoot } from 'react-dom/client'`,
              `    import App from '${srcUrl}'`,
              `    createRoot(document.getElementById('root')).render(createElement(App))`,
              `  </script>`,
            ].join('\n')
      }

      ctx.htmlCache.set(
        htmlPath,
        `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${title}</title>\n${headExtra}</head>\n<body>\n${bodyHtml}\n</body>\n</html>`,
      )
    }
  }

  function buildInput() {
    const e = ctx.cachedEntries ?? discoverEntries(ctx.pagesDir)
    if (e.length === 0) return undefined
    return Object.fromEntries(e.map(({ key, htmlPath }) => [key, htmlPath]))
  }

  // ---- Plugin: config ----
  const configPlugin = {
    name: 'vyro:config',
    enforce: 'pre',

    config(userConfig, { command }) {
      const projectRoot = resolve(userConfig.root ?? process.cwd())
      ctx.projectRoot   = projectRoot
      ctx.pagesDir      = resolve(projectRoot, pagesDirOption)
      ctx.distDir       = resolve(projectRoot, 'dist')

      if (command === 'build') {
        generateWrappers()
        const input = buildInput()
        if (!input) {
          console.warn('[vyro] No pages found in', pagesDirOption)
          process.exit(0)
        }
      }

      return {
        root: ctx.pagesDir,
        publicDir: resolve(projectRoot, 'public'),
        appType: 'mpa',
        resolve: {
          alias: {
            '@': resolve(projectRoot, 'src'),
            '@pages': ctx.pagesDir,
          },
        },
        css: {
          preprocessorOptions: {
            scss: { api: 'modern-compiler' },
          },
        },
        optimizeDeps: { include: ['react', 'react-dom', 'vue'] },
        build: {
          outDir: ctx.distDir,
          emptyOutDir: true,
          minify,
          sourcemap,
          chunkSizeWarningLimit: 500,
          rollupOptions: {
            input: command === 'build' ? buildInput() : undefined,
            output: {
              entryFileNames: 'js/[name]-[hash].js',
              chunkFileNames: 'js/[name]-[hash].js',
              assetFileNames: ({ name }) => {
                if (name?.endsWith('.css')) return 'css/[name]-[hash][extname]'
                if (name?.endsWith('.js'))  return 'js/[name]-[hash][extname]'
                return 'assets/[name]-[hash][extname]'
              },
              manualChunks: splitChunks
                ? (id) => {
                    if (!id.includes('/node_modules/')) return
                    if (/\/react(-dom)?\/|\/react\/|\/scheduler\//.test(id)) return 'vendor-react'
                    if (/\/@?vue\/|\/vue\//.test(id)) return 'vendor-vue'
                    return 'vendor'
                  }
                : undefined,
            },
          },
        },
        server: {
          fs: { allow: [projectRoot] },
        },
      }
    },
  }

  // ---- Plugin: virtual HTML (build only) ----
  const virtualHtmlPlugin = {
    name: 'vyro:virtual-html',
    apply: 'build',
    enforce: 'pre',
    resolveId(id) {
      if (ctx.htmlCache.has(id)) return id
    },
    load(id) {
      return ctx.htmlCache.get(id) ?? null
    },
  }

  // ---- Plugin: strip leading <style> from JSX/TSX ----
  const stripJsxStylePlugin = {
    name: 'vyro:strip-jsx-style',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.(jsx|tsx)$/.test(id)) return
      const m = code.match(/^\s*<style[^>]*>[\s\S]*?<\/style>\s*/)
      if (!m) return
      return { code: code.slice(m[0].length), map: null }
    },
  }

  // ---- Plugin: extract inline <style>/<script> from .html pages (build only) ----
  const extractInlineAssetsPlugin = {
    name: 'vyro:extract-inline-assets',
    apply: 'build',
    enforce: 'pre',

    buildStart() {
      this._extractMap = new Map()
      this._contentMap = new Map()

      const htmlEntries = (ctx.cachedEntries ?? discoverEntries(ctx.pagesDir))
        .filter((e) => e.ext === '.html')
        .map((e) => e.htmlPath)

      for (const htmlPath of htmlEntries) {
        if (!fs.existsSync(htmlPath)) continue
        const html = fs.readFileSync(htmlPath, 'utf-8')
        const base = relative(ctx.pagesDir, htmlPath).replace(/\.html$/, '').replace(/[/\\]/g, '-')

        const cssBlocks = []
        for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
          if (m[1].trim()) cssBlocks.push(m[1].trim())
        }
        const jsBlocks = []
        for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
          const attrs = m[1], content = m[2].trim()
          if (!attrs.includes('src=') && !attrs.includes('type=') && content) jsBlocks.push(content)
        }

        const hasCss = cssBlocks.length > 0
        const hasJs  = jsBlocks.length  > 0
        if (!hasCss && !hasJs) continue

        if (hasCss) this._contentMap.set(`${base}.css`, cssBlocks.join('\n\n'))
        if (hasJs)  this._contentMap.set(`${base}.js`,  jsBlocks.join('\n\n'))
        this._extractMap.set(htmlPath, { hasCss, hasJs, base })
      }
    },

    resolveId(id) {
      if (id.startsWith('/@vyro-inline/')) {
        const name = id.slice('/@vyro-inline/'.length)
        if (this._contentMap?.has(name)) return '\0vyro-inline:' + name
      }
    },

    load(id) {
      if (id.startsWith('\0vyro-inline:')) {
        return this._contentMap?.get(id.slice('\0vyro-inline:'.length)) ?? null
      }
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx2) {
        const entry = this._extractMap?.get(ctx2.filename)
        if (!entry) return html
        const { hasCss, hasJs, base } = entry
        const VIRTUAL_PREFIX = '/@vyro-inline/'
        let result = html
        if (hasCss) {
          result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          result = result.replace('</head>', `<link rel="stylesheet" href="${VIRTUAL_PREFIX}${base}.css">\n</head>`)
        }
        if (hasJs) {
          result = result.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, content) =>
            !attrs.includes('src=') && !attrs.includes('type=') && content.trim() ? '' : m,
          )
          result = result.replace('</body>', `<script type="module" src="${VIRTUAL_PREFIX}${base}.js"></script>\n</body>`)
        }
        return result
      },
    },
  }

  // ---- Plugin: dev server wrappers (serve only) ----
  const devWrappersPlugin = {
    name: 'vyro:dev-wrappers',
    apply: 'serve',

    configureServer(server) {
      const entries      = discoverEntries(ctx.pagesDir)
      const virtualPages = new Map()

      for (const { srcFile, htmlPath, ext, dir, base, needsWrapper } of entries) {
        if (!needsWrapper) continue
        const urlPath = '/' + relative(ctx.pagesDir, htmlPath).replace(/\\/g, '/')
        const srcUrl  = '/' + relative(ctx.pagesDir, srcFile).replace(/\\/g, '/')
        const title   = base === 'index' ? basename(dir) : base

        let inlineStyle = ''
        let bodyHtml    = ''

        if (ext === '.vue') {
          bodyHtml = [
            `  <div id="app"></div>`,
            `  <script type="module">`,
            `    import { createApp } from 'vue'`,
            `    import App from '${srcUrl}'`,
            `    createApp(App).mount('#app')`,
            `  </script>`,
          ].join('\n')
        } else {
          const code       = fs.readFileSync(srcFile, 'utf-8')
          const styleMatch = code.match(/^\s*<style[^>]*>([\s\S]*?)<\/style>\s*/)
          if (styleMatch?.[1]?.trim()) inlineStyle = styleMatch[1].trim()
          const stripped   = styleMatch ? code.slice(styleMatch[0].length) : code
          const selfMounts = /createRoot\s*\(|ReactDOM\s*\.\s*render\s*\(/.test(stripped)

          bodyHtml = selfMounts
            ? `  <div id="root"></div>\n  <script type="module">\n    import '${srcUrl}'\n  </script>`
            : [
                `  <div id="root"></div>`,
                `  <script type="module">`,
                `    import { createElement } from 'react'`,
                `    import { createRoot } from 'react-dom/client'`,
                `    import App from '${srcUrl}'`,
                `    createRoot(document.getElementById('root')).render(createElement(App))`,
                `  </script>`,
              ].join('\n')
        }

        const styleTag = inlineStyle ? `  <style>\n${inlineStyle}\n  </style>\n` : ''
        virtualPages.set(
          urlPath,
          `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${title}</title>\n${styleTag}</head>\n<body>\n${bodyHtml}\n</body>\n</html>`,
        )
      }

      server.middlewares.use(async (req, res, next) => {
        try {
          const [path] = (req.url ?? '/').split('?')

          let candidates
          if (path === '/')            candidates = ['/index.html']
          else if (path.endsWith('/')) candidates = [path + 'index.html']
          else if (!extname(path))     candidates = [path + '.html', path + '/index.html']
          else                         candidates = [path]

          for (const c of candidates) {
            if (virtualPages.has(c)) {
              const html = await server.transformIndexHtml(c, virtualPages.get(c))
              res.statusCode = 200
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.end(html)
              return
            }
          }

          for (const c of candidates) {
            const abs = resolve(ctx.pagesDir, '.' + c)
            if (c.endsWith('.html') && fs.existsSync(abs)) {
              const html = await server.transformIndexHtml(c, fs.readFileSync(abs, 'utf-8'), req.originalUrl)
              res.statusCode = 200
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.end(html)
              return
            }
          }

          const isAsset    = !!extname(path) && !path.endsWith('.html')
          const isInternal = path.startsWith('/@') || path.startsWith('/node_modules') || path.includes('/.vite/')
          const wantsHtml  = (req.headers.accept ?? '').includes('text/html')
          if (!isAsset && !isInternal && wantsHtml) {
            const notFound = resolve(ctx.pagesDir, '404.html')
            if (fs.existsSync(notFound)) {
              const html = await server.transformIndexHtml('/404.html', fs.readFileSync(notFound, 'utf-8'))
              res.statusCode = 404
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.end(html)
              return
            }
          }
          return next()
        } catch (e) {
          next(e)
        }
      })
    },

    configurePreviewServer(server) {
      const distDir = ctx.distDir ?? resolve(process.cwd(), 'dist')
      const resolveDist = (path) => {
        let cands
        if (path === '/')            cands = ['/index.html']
        else if (path.endsWith('/')) cands = [path + 'index.html']
        else if (!extname(path))     cands = [path + '.html', path + '/index.html']
        else                         cands = [path]
        return cands.find((c) => fs.existsSync(resolve(distDir, '.' + c))) ?? null
      }

      server.middlewares.use((req, res, next) => {
        const [path, qs] = (req.url ?? '/').split('?')
        const hit        = resolveDist(path)
        if (hit) {
          req.url = hit + (qs ? '?' + qs : '')
          return next()
        }
        const isAsset   = !!extname(path) && !path.endsWith('.html')
        const wantsHtml = (req.headers.accept ?? '').includes('text/html')
        const notFound  = resolve(distDir, '404.html')
        if (!isAsset && wantsHtml && fs.existsSync(notFound)) {
          res.statusCode = 404
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(fs.readFileSync(notFound))
          return
        }
        next()
      })
    },
  }

  // ---- Plugin: minify HTML (build only) ----
  const minifyHtmlPlugin = minify
    ? {
        name: 'vyro:minify-html',
        apply: 'build',
        transformIndexHtml: {
          order: 'post',
          async handler(html) {
            return minifyHtml(html, {
              collapseWhitespace: true,
              removeComments: true,
              removeRedundantAttributes: true,
              removeScriptTypeAttributes: true,
              removeStyleLinkTypeAttributes: true,
              useShortDoctype: true,
              minifyCSS: true,
              minifyJS: true,
            })
          },
        },
      }
    : null

  // ---- Plugin: pretty URLs (build only) ----
  const prettyUrlsPlugin = prettyUrls
    ? {
        name: 'vyro:pretty-urls',
        apply: 'build',
        writeBundle() {
          const distDir = ctx.distDir
          for (const { htmlPath } of ctx.cachedEntries ?? discoverEntries(ctx.pagesDir)) {
            const rel  = relative(ctx.pagesDir, htmlPath)
            const flat = resolve(distDir, rel)
            if (!fs.existsSync(flat)) continue

            if (basename(rel) === 'index.html') {
              const parent = dirname(flat)
              if (parent !== distDir) fs.copyFileSync(flat, `${parent}.html`)
            } else {
              const dir = flat.slice(0, -5)
              fs.mkdirSync(dir, { recursive: true })
              fs.copyFileSync(flat, resolve(dir, 'index.html'))
            }
          }
        },
      }
    : null

  // ---- Plugin: obfuscate JS (build only) ----
  const obfuscateJsPlugin = obfuscate && !debug
    ? {
        name: 'vyro:obfuscate-js',
        apply: 'build',
        writeBundle() {
          const distJsDir = resolve(ctx.distDir, 'js')
          if (!fs.existsSync(distJsDir)) return
          for (const file of fs.readdirSync(distJsDir)) {
            if (!file.endsWith('.js')) continue
            const filePath = resolve(distJsDir, file)
            const code     = fs.readFileSync(filePath, 'utf-8')
            const result   = JavaScriptObfuscator.obfuscate(code, {
              compact: true,
              identifierNamesGenerator: 'hexadecimal',
              renameGlobals: false,
              stringArray: true,
              stringArrayCallsTransform: true,
              stringArrayEncoding: ['base64'],
              stringArrayThreshold: 0.75,
              controlFlowFlattening: false,
              deadCodeInjection: false,
              selfDefending: false,
              transformObjectKeys: false,
            })
            fs.writeFileSync(filePath, result.getObfuscatedCode())
          }
        },
      }
    : null

  return [
    configPlugin,
    virtualHtmlPlugin,
    stripJsxStylePlugin,
    vue(),
    react(),
    extractInlineAssetsPlugin,
    devWrappersPlugin,
    minifyHtmlPlugin,
    prettyUrlsPlugin,
    obfuscateJsPlugin,
  ].filter(Boolean)
}
