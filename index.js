import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'

import { configPlugin }              from './src/plugins/config.js'
import { virtualHtmlPlugin }         from './src/plugins/virtual-html.js'
import { stripJsxStylePlugin }       from './src/plugins/strip-jsx-style.js'
import { extractInlineAssetsPlugin } from './src/plugins/extract-inline-assets.js'
import { devWrappersPlugin }         from './src/plugins/dev-wrappers.js'
import { minifyHtmlPlugin }          from './src/plugins/minify-html.js'
import { prettyUrlsPlugin }          from './src/plugins/pretty-urls.js'
import { obfuscateJsPlugin }         from './src/plugins/obfuscate-js.js'

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

  const ctx = {
    projectRoot:    null,
    pagesDir:       null,
    distDir:        null,
    htmlCache:      new Map(),
    cachedEntries:  null,
  }

  return [
    configPlugin(ctx, { pagesDirOption, minify, splitChunks, sourcemap }),
    virtualHtmlPlugin(ctx),
    stripJsxStylePlugin(),
    vue(),
    react(),
    extractInlineAssetsPlugin(ctx),
    devWrappersPlugin(ctx),
    minify      ? minifyHtmlPlugin()      : null,
    prettyUrls  ? prettyUrlsPlugin(ctx)   : null,
    obfuscate && !debug ? obfuscateJsPlugin(ctx) : null,
  ].filter(Boolean)
}
