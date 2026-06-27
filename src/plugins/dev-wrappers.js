import { resolve, relative, extname, basename } from 'path'
import fs from 'fs'
import { discoverEntries } from '../utils/discover.js'
import { buildComponentBody, renderPage } from '../utils/html.js'

export function devWrappersPlugin(ctx) {
  return {
    name: 'vyro:dev-wrappers',
    apply: 'serve',

    configureServer(server) {
      const entries      = discoverEntries(ctx.pagesDir)
      const virtualPages = new Map()

      for (const { srcFile, htmlPath, ext, dir, base, needsWrapper } of entries) {
        if (!needsWrapper) continue
        const urlPath             = '/' + relative(ctx.pagesDir, htmlPath).replace(/\\/g, '/')
        const srcUrl              = '/' + relative(ctx.pagesDir, srcFile).replace(/\\/g, '/')
        const title               = base === 'index' ? basename(dir) : base
        const { headExtra, bodyHtml } = buildComponentBody(ext, srcUrl, srcFile, { dev: true })
        virtualPages.set(urlPath, renderPage(title, headExtra, bodyHtml))
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
}
