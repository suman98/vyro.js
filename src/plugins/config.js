import { resolve, relative, basename } from 'path'
import { discoverEntries } from '../utils/discover.js'
import { buildComponentBody, renderPage } from '../utils/html.js'

function generateWrappers(ctx) {
  ctx.cachedEntries = discoverEntries(ctx.pagesDir)
  ctx.htmlCache.clear()

  for (const entry of ctx.cachedEntries) {
    if (!entry.needsWrapper) continue
    const { srcFile, htmlPath, dir, base, ext } = entry
    const srcUrl              = '/' + relative(ctx.pagesDir, srcFile).replace(/\\/g, '/')
    const title               = base === 'index' ? basename(dir) : base
    const { headExtra, bodyHtml } = buildComponentBody(ext, srcUrl, srcFile)
    ctx.htmlCache.set(htmlPath, renderPage(title, headExtra, bodyHtml))
  }
}

function buildInput(ctx) {
  const entries = ctx.cachedEntries ?? discoverEntries(ctx.pagesDir)
  if (entries.length === 0) return undefined
  return Object.fromEntries(entries.map(({ key, htmlPath }) => [key, htmlPath]))
}

export function configPlugin(ctx, { pagesDirOption, minify, splitChunks, sourcemap }) {
  return {
    name: 'vyro:config',
    enforce: 'pre',

    config(userConfig, { command }) {
      const projectRoot = resolve(userConfig.root ?? process.cwd())
      ctx.projectRoot   = projectRoot
      ctx.pagesDir      = resolve(projectRoot, pagesDirOption)
      ctx.distDir       = resolve(projectRoot, 'dist')

      if (command === 'build') {
        generateWrappers(ctx)
        const input = buildInput(ctx)
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
            input: command === 'build' ? buildInput(ctx) : undefined,
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
}
