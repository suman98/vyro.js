import { relative } from 'path'
import fs from 'fs'
import { discoverEntries } from '../utils/discover.js'
import { buildExposeFooter } from '../utils/expose-globals.js'

const VIRTUAL_PREFIX = '/@vyro-inline/'

export function extractInlineAssetsPlugin(ctx) {
  const extractMap = new Map()
  const contentMap = new Map()

  return {
    name: 'vyro:extract-inline-assets',
    apply: 'build',
    enforce: 'pre',

    buildStart() {
      extractMap.clear()
      contentMap.clear()

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
        const hasJs  = jsBlocks.length > 0
        if (!hasCss && !hasJs) continue

        if (hasCss) contentMap.set(`${base}.css`, cssBlocks.join('\n\n'))
        if (hasJs)  contentMap.set(`${base}.js`,  jsBlocks.join('\n\n'))
        extractMap.set(htmlPath, { hasCss, hasJs, base })
      }
    },

    resolveId(id) {
      if (id.startsWith(VIRTUAL_PREFIX)) {
        const name = id.slice(VIRTUAL_PREFIX.length)
        if (contentMap.has(name)) return '\0vyro-inline:' + name
      }
    },

    load(id) {
      if (!id.startsWith('\0vyro-inline:')) return
      const name    = id.slice('\0vyro-inline:'.length)
      const content = contentMap.get(name)
      if (content == null) return null
      if (!name.endsWith('.js')) return content   // CSS — no scope concern

      // Re-expose top-level declarations as globals so inline event handlers
      // (onclick="doThing()") still resolve after extraction into a module.
      const parse  = typeof this?.parse === 'function' ? this.parse.bind(this) : null
      const footer = buildExposeFooter(content, parse)
      return footer ? content + footer : content
    },

    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx2) {
        const entry = extractMap.get(ctx2.filename)
        if (!entry) return html
        const { hasCss, hasJs, base } = entry
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
}
