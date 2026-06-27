import { resolve, basename, extname, relative } from 'path'
import fs from 'fs'

export const WRAP_EXTS = ['.vue', '.jsx', '.tsx']
export const ALL_EXTS  = ['.html', ...WRAP_EXTS]

export function keyFor(pagesDir, htmlPath) {
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
    const ext  = extname(dirent.name)
    const base = basename(dirent.name, ext)
    if (ext === '.html') {
      entries.push({ srcFile: full, htmlPath: full, dir, base, ext, needsWrapper: false, key: keyFor(pagesDir, full) })
    } else if (WRAP_EXTS.includes(ext) && base === 'index' && !hasIndexHtml) {
      const htmlPath = resolve(dir, 'index.html')
      entries.push({ srcFile: full, htmlPath, dir, base: 'index', ext, needsWrapper: true, key: keyFor(pagesDir, htmlPath) })
    }
  }
}

export function discoverEntries(pagesDir) {
  const entries = []
  if (!fs.existsSync(pagesDir)) return entries
  for (const dirent of fs.readdirSync(pagesDir, { withFileTypes: true })) {
    if (dirent.isFile()) {
      const ext = extname(dirent.name)
      if (!ALL_EXTS.includes(ext)) continue
      const srcFile = resolve(pagesDir, dirent.name)
      const base    = basename(dirent.name, ext)
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
