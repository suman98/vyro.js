import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { renderPage, buildComponentBody } from '../../src/utils/html.js'

let tmp

before(() => {
  tmp = join(tmpdir(), `vyro-html-${Date.now()}`)
  mkdirSync(tmp, { recursive: true })
})

after(() => rmSync(tmp, { recursive: true, force: true }))

// --- renderPage ---

test('renderPage: produces valid HTML shell', () => {
  const html = renderPage('My App', '', '<p>content</p>')
  assert.ok(html.startsWith('<!DOCTYPE html>'))
  assert.ok(html.includes('<title>My App</title>'))
  assert.ok(html.includes('<p>content</p>'))
  assert.ok(html.endsWith('</html>'))
})

test('renderPage: empty headExtra puts </head> directly after title', () => {
  const html = renderPage('T', '', 'body')
  assert.ok(html.includes('</title>\n</head>'))
})

test('renderPage: headExtra appears between title and </head>', () => {
  const extra = '  <style>body{margin:0}</style>\n'
  const html  = renderPage('T', extra, 'body')
  assert.ok(html.includes(`</title>\n${extra}</head>`))
})

// --- buildComponentBody: Vue ---

test('Vue: mounts via createApp', () => {
  const { headExtra, bodyHtml } = buildComponentBody('.vue', '/App.vue', '/fake.vue')
  assert.equal(headExtra, '')
  assert.ok(bodyHtml.includes("import { createApp } from 'vue'"))
  assert.ok(bodyHtml.includes("import App from '/App.vue'"))
  assert.ok(bodyHtml.includes("createApp(App).mount('#app')"))
  assert.ok(bodyHtml.includes('<div id="app">'))
})

// --- buildComponentBody: JSX non-self-mounting ---

test('JSX non-selfmount: renders via createRoot', () => {
  const src = join(tmp, 'Button.jsx')
  writeFileSync(src, 'export default function Button() { return <button>Click</button> }')
  const { headExtra, bodyHtml } = buildComponentBody('.jsx', '/Button.jsx', src)
  assert.equal(headExtra, '')
  assert.ok(bodyHtml.includes("import App from '/Button.jsx'"))
  assert.ok(bodyHtml.includes('createRoot'))
  assert.ok(bodyHtml.includes('createElement(App)'))
})

// --- buildComponentBody: JSX self-mounting ---

test('JSX selfmount build: uses <script src>', () => {
  const src = join(tmp, 'Main.jsx')
  writeFileSync(src, `import { createRoot } from 'react-dom/client'\ncreateRoot(document.getElementById('root')).render(<div/>)`)
  const { bodyHtml } = buildComponentBody('.jsx', '/Main.jsx', src, { dev: false })
  assert.ok(bodyHtml.includes('src="/Main.jsx"'))
  assert.ok(!bodyHtml.includes("import '/Main.jsx'"))
})

test('JSX selfmount dev: uses inline import', () => {
  const src = join(tmp, 'MainDev.jsx')
  writeFileSync(src, `import { createRoot } from 'react-dom/client'\ncreateRoot(document.getElementById('root')).render(<div/>)`)
  const { bodyHtml } = buildComponentBody('.jsx', '/MainDev.jsx', src, { dev: true })
  assert.ok(bodyHtml.includes("import '/MainDev.jsx'"))
  assert.ok(!bodyHtml.includes('src="/MainDev.jsx"'))
})

// --- buildComponentBody: JSX with leading <style> ---

test('JSX with leading <style>: extracted into headExtra', () => {
  const src = join(tmp, 'Styled.jsx')
  writeFileSync(src, '<style>body { margin: 0 }</style>\nexport default function App() {}')
  const { headExtra, bodyHtml } = buildComponentBody('.jsx', '/Styled.jsx', src)
  assert.ok(headExtra.includes('<style>'))
  assert.ok(headExtra.includes('body { margin: 0 }'))
  assert.ok(headExtra.endsWith('\n'))   // trailing newline for correct </head> placement
  assert.ok(!bodyHtml.includes('<style>'))
})
