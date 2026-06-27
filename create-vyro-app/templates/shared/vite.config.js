import { defineConfig } from 'vite'
import { createRequire } from 'node:module'
import vyroJs from 'vyro-js-plugin'

const require = createRequire(import.meta.url)

export default defineConfig({
  plugins: [
    vyroJs({
      pagesDir: 'src/pages',
      prettyUrls: true,
    }),
  ],
  resolve: {
    alias: {
      // @vyro/bridge ships inside vyro-js-plugin — usable from any page (Vue or JSX)
      '@vyro/bridge': require.resolve('vyro-js-plugin/bridge'),
    },
  },
})
