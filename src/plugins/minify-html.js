import { minify as minifyHtml } from 'html-minifier-terser'

export function minifyHtmlPlugin() {
  return {
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
}
