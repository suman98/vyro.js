import { resolve, relative, basename, dirname } from 'path'
import fs from 'fs'
import { discoverEntries } from '../utils/discover.js'

export function prettyUrlsPlugin(ctx) {
  return {
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
}
