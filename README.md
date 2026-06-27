# vyro-js-plugin

Zero-config Vite plugin for multi-page apps. Drop HTML, React (`.jsx`/`.tsx`), or Vue (`.vue`) files into `src/pages/` — each becomes its own standalone page. No route table, no manual entry list. The filesystem **is** the routing table.

---

## Install

```bash
npm install vyro-js-plugin
```

## Usage

```js
// vite.config.js
import { defineConfig } from 'vite'
import vyroJs from 'vyro-js-plugin'

export default defineConfig({
  plugins: [
    vyroJs({
      pagesDir: 'src/pages',   // default
      prettyUrls: true,         // default
      obfuscate: false,         // default
      // debug: true,           // no minify, no split, source maps
    }),
  ],
})
```

---

## Page discovery rules

Pages are discovered by scanning `pagesDir`.

### Root of `pagesDir`

Every `*.{html,vue,jsx,tsx}` file becomes a page.

| File | URL | Output |
|------|-----|--------|
| `index.tsx` | `/` | `dist/index.html` |
| `about.html` | `/about` | `dist/about.html` |
| `profile.vue` | `/profile` | `dist/profile.html` |

### Inside a subfolder

| What | Page? | Notes |
|------|:-----:|-------|
| Any `*.html` (any name, any depth) | ✅ | `docs/intro.html` → `/docs/intro` |
| `index.{vue,jsx,tsx}` | ✅ | Folder app at `/<folder>` |
| Non-index `*.{vue,jsx,tsx}` | ❌ | Component/partial — importable, not a page |
| `.ts`, `.scss`, etc. | ❌ | Module imports only |

---

## Page types

Plain `.html` pages are used as-is. The plugin generates in-memory HTML wrappers for component pages:

- **`.vue`** → `createApp(App).mount('#app')`
- **`.jsx` / `.tsx`** → `createRoot(...).render(<App/>)`. Self-mounting files (call `createRoot` directly) are loaded as-is.

Wrappers are never written to disk. Source tree stays untouched.

---

## Build pipeline

1. Discover entries
2. Generate in-memory wrappers for component pages
3. Extract inline `<style>`/`<script>` from HTML pages into virtual modules
4. Bundle + split vendors: React → `vendor-react`, Vue → `vendor-vue`
5. Minify HTML (html-minifier-terser)
6. Pretty URLs — each page emitted flat and as directory index
7. Obfuscate JS (javascript-obfuscator) — only when `obfuscate: true`

### Output layout

```
dist/
  css/<name>-<hash>.css
  js/<name>-<hash>.js
  index.html
  about.html          ← flat form
  about/index.html    ← directory-index form
```

---

## Clean URLs

Each page is emitted twice so dumb static hosts (GitHub Pages, S3) serve clean URLs natively — zero server config.

| Source | Works as |
|--------|---------|
| `about.html` | `/about`, `/about/`, `/about.html` |
| `admin/index.vue` | `/admin`, `/admin/`, `/admin.html` |

Dev and preview middleware mirror this behavior locally.

---

## 404 handling

Place a `404.html` in `pagesDir`. It's served with status `404` for missing page navigations in dev, preview, and on static hosts that honor `/404.html`. Delete it to fall back to the default.

---

## Path aliases

The plugin sets these automatically:

| Alias | Resolves to |
|-------|-------------|
| `@/*` | `src/*` |
| `@pages/*` | `pagesDir/*` |

---

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `pagesDir` | `string` | `'src/pages'` | Directory scanned for pages |
| `prettyUrls` | `boolean` | `true` | Emit each page flat + as directory index |
| `obfuscate` | `boolean` | `false` | Run javascript-obfuscator on `dist/js/` |
| `debug` | `boolean` | `false` | No minify, no chunk split, source maps on |

---

## Peer dependencies

```json
{
  "peerDependencies": {
    "vite": ">=5.0.0"
  }
}
```

React and Vue support is included — install whichever you use:

```bash
npm install react react-dom        # React pages
npm install vue                    # Vue pages
```

---

## Repository layout

```
index.js              ← plugin source (this package's main export)
bridge/
  index.ts            ← @vyro/bridge: reactToVue / vueToReact utilities
create-vyro-app/
  index.js            ← create-vyro-app scaffolder CLI
  templates/          ← JS + TS starter templates
test/
  real/               ← local test app (gitignored, imports from ../../index.js)
src/
  pages/              ← demo site pages (uses this plugin)
public/               ← static assets
vite.config.js        ← demo site config
```

---

## @vyro/bridge

Mix React and Vue components in the same page:

```ts
import { reactToVue, vueToReact } from '@vyro/bridge'

// Use a React component inside Vue
const ReactBtn = reactToVue(MyReactButton)

// Use a Vue component inside React JSX
const VueCard = vueToReact(MyVueCard)
```

---

## Tech stack

Vite 6 · React 18 · Vue 3 · TypeScript · SCSS · html-minifier-terser · javascript-obfuscator
