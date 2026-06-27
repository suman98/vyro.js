import fs from 'fs'

export function renderPage(title, headExtra, bodyHtml) {
  return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${title}</title>\n${headExtra}</head>\n<body>\n${bodyHtml}\n</body>\n</html>`
}

export function buildComponentBody(ext, srcUrl, srcFile, { dev = false } = {}) {
  if (ext === '.vue') {
    return {
      headExtra: '',
      bodyHtml: [
        '  <div id="app"></div>',
        '  <script type="module">',
        `    import { createApp } from 'vue'`,
        `    import App from '${srcUrl}'`,
        `    createApp(App).mount('#app')`,
        '  </script>',
      ].join('\n'),
    }
  }

  // JSX / TSX
  const code        = fs.readFileSync(srcFile, 'utf-8')
  const styleMatch  = code.match(/^\s*<style[^>]*>([\s\S]*?)<\/style>\s*/)
  const inlineStyle = styleMatch?.[1]?.trim() ?? ''
  const headExtra   = inlineStyle ? `  <style>\n${inlineStyle}\n  </style>\n` : ''
  const stripped    = styleMatch ? code.slice(styleMatch[0].length) : code
  const selfMounts  = /createRoot\s*\(|ReactDOM\s*\.\s*render\s*\(/.test(stripped)

  let bodyHtml
  if (selfMounts) {
    bodyHtml = dev
      ? [
          '  <div id="root"></div>',
          '  <script type="module">',
          `    import '${srcUrl}'`,
          '  </script>',
        ].join('\n')
      : `  <div id="root"></div>\n  <script type="module" src="${srcUrl}"></script>`
  } else {
    bodyHtml = [
      '  <div id="root"></div>',
      '  <script type="module">',
      `    import { createElement } from 'react'`,
      `    import { createRoot } from 'react-dom/client'`,
      `    import App from '${srcUrl}'`,
      `    createRoot(document.getElementById('root')).render(createElement(App))`,
      '  </script>',
    ].join('\n')
  }

  return { headExtra, bodyHtml }
}
