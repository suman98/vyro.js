import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sampleDir = resolve(__dirname, '../sample')
const distDir   = resolve(sampleDir, 'dist')

before(() => {
  rmSync(distDir, { recursive: true, force: true })

  if (!existsSync(resolve(sampleDir, 'node_modules'))) {
    const install = spawnSync('npm', ['install'], { cwd: sampleDir, stdio: 'inherit' })
    if (install.status !== 0) throw new Error('npm install failed in test/sample')
  }
})

after(() => {
  rmSync(distDir, { recursive: true, force: true })
})

// ---- Build ----

test('sample app builds without error', { timeout: 120_000 }, () => {
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: sampleDir,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
  })
  assert.equal(result.status, 0, `Build failed:\n${result.stderr || result.stdout}`)
})

// ---- HTML pages ----

test('dist/index.html exists', () => {
  assert.ok(existsSync(resolve(distDir, 'index.html')))
})

test('dist/404.html exists', () => {
  assert.ok(existsSync(resolve(distDir, '404.html')))
})

test('dist/vue.html exists (Vue page)', () => {
  assert.ok(existsSync(resolve(distDir, 'vue.html')))
})

test('dist/dashboard/index.html exists (TSX wrapper)', () => {
  assert.ok(existsSync(resolve(distDir, 'dashboard', 'index.html')))
})

// ---- Pretty URLs ----

test('dist/dashboard.html exists (pretty URL)', () => {
  assert.ok(existsSync(resolve(distDir, 'dashboard.html')))
})

test('dist/vue/index.html exists (pretty URL)', () => {
  // vue.html → vue/index.html (directory-index form)
  assert.ok(existsSync(resolve(distDir, 'vue', 'index.html')))
})

// ---- Assets ----

test('dist/js/ contains bundles', () => {
  const files = readdirSync(resolve(distDir, 'js')).filter(f => f.endsWith('.js'))
  assert.ok(files.length > 0, 'no JS bundles')
})

test('dist/css/ contains styles', () => {
  const files = readdirSync(resolve(distDir, 'css')).filter(f => f.endsWith('.css'))
  assert.ok(files.length > 0, 'no CSS bundles')
})

// ---- Vendor splitting ----

test('vendor-react chunk exists', () => {
  const files = readdirSync(resolve(distDir, 'js'))
  assert.ok(files.some(f => f.startsWith('vendor-react')), 'missing vendor-react chunk')
})

test('vendor-vue chunk exists', () => {
  const files = readdirSync(resolve(distDir, 'js'))
  assert.ok(files.some(f => f.startsWith('vendor-vue')), 'missing vendor-vue chunk')
})

// ---- HTML correctness ----

test('index.html references a CSS asset', () => {
  const html = readFileSync(resolve(distDir, 'index.html'), 'utf8')
  assert.ok(html.includes('.css'), 'index.html missing CSS link')
})

test('dashboard/index.html references a JS bundle', () => {
  const html = readFileSync(resolve(distDir, 'dashboard', 'index.html'), 'utf8')
  assert.ok(html.includes('.js'), 'dashboard html missing JS reference')
})

test('inline <script> in index.html is extracted (not left inline)', () => {
  const html = readFileSync(resolve(distDir, 'index.html'), 'utf8')
  // The template index.html has an inline <script> — plugin extracts it as a module
  assert.ok(!html.includes('function test()'), 'inline script was not extracted')
})

// ---- Inline event handlers survive extraction (regression: onclick="fn()") ----

test('tools/counter.html keeps its inline onclick handlers', () => {
  const html = readFileSync(resolve(distDir, 'tools', 'counter.html'), 'utf8')
  assert.ok(html.includes('onclick="inc()"'),   'lost onclick="inc()"')
  assert.ok(html.includes('onclick="dec()"'),   'lost onclick="dec()"')
  assert.ok(html.includes('onclick="reset()"'), 'lost onclick="reset()"')
})

test('extracted counter JS re-exposes its functions on window', () => {
  const jsDir = resolve(distDir, 'js')
  const file  = readdirSync(jsDir).find((f) => f.startsWith('tools-counter'))
  assert.ok(file, 'no tools-counter bundle emitted')
  const code = readFileSync(resolve(jsDir, file), 'utf8')
  // Property names (the bit inline handlers look up) must be preserved verbatim.
  assert.ok(code.includes('window.inc'),   'window.inc not set')
  assert.ok(code.includes('window.dec'),   'window.dec not set')
  assert.ok(code.includes('window.reset'), 'window.reset not set')
})
