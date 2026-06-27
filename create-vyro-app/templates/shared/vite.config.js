import { defineConfig } from 'vite'
import vyroJs from 'vyro-js-plugin'

export default defineConfig({
  plugins: [
    vyroJs({
      pagesDir: 'src/pages',  // default
      obfuscate: false,       // default
      prettyUrls: true,       // default
      // debug: true,         // readable output: no minify, no split, source maps
    }),
  ],
})
