import { defineConfig } from 'vite'
import { codeInspectorPlugin } from 'code-inspector-plugin'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import vyroJs from './index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ command }) => ({
  plugins: [
    // Dev only: hold Option/Alt and click any element to jump to its source in the editor.
    ...(command === 'serve'
      ? [codeInspectorPlugin({ bundler: 'vite', showSwitch: true, hotKeys: ['altKey'] })]
      : []),
    vyroJs({
      pagesDir: 'src/pages',
      obfuscate: true,
      prettyUrls: true,
    }),
  ],
  // Dev server at http://parcel.local:5574 (needs hosts entry: parcel.local → 127.0.0.1)
  server: {
    host: true,
    port: 5574,
    strictPort: true,
    allowedHosts: ['parcel.local'],
    fs: { allow: [resolve(__dirname)] },
  },
}))
