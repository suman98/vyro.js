import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const realDir   = resolve(__dirname, '../real')
const distDir   = resolve(realDir, 'dist')

before(() => {
  rmSync(distDir, { recursive: true, force: true })
})

after(() => {
  rmSync(distDir, { recursive: true, force: true })
})

test('vite build exits 0', { timeout: 120_000 }, () => {
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: realDir,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' },
  })
  assert.equal(
    result.status,
    0,
    `Build failed (exit ${result.status}):\n${result.stderr || result.stdout}`,
  )
})

test('dist/index.html exists', () => {
  assert.ok(existsSync(resolve(distDir, 'index.html')), 'missing dist/index.html')
})

test('dist/404.html exists', () => {
  assert.ok(existsSync(resolve(distDir, '404.html')), 'missing dist/404.html')
})

test('dist/dashboard/index.html exists (tsx wrapper)', () => {
  assert.ok(existsSync(resolve(distDir, 'dashboard', 'index.html')), 'missing dist/dashboard/index.html')
})

test('dist/dashboard.html exists (pretty URL)', () => {
  assert.ok(existsSync(resolve(distDir, 'dashboard.html')), 'missing dist/dashboard.html (pretty URL)')
})

test('dist/js/ contains bundled scripts', () => {
  const jsDir   = resolve(distDir, 'js')
  const jsFiles = existsSync(jsDir) ? readdirSync(jsDir).filter(f => f.endsWith('.js')) : []
  assert.ok(jsFiles.length > 0, 'no JS bundles in dist/js/')
})

test('dist/css/ contains bundled styles', () => {
  const cssDir   = resolve(distDir, 'css')
  const cssFiles = existsSync(cssDir) ? readdirSync(cssDir).filter(f => f.endsWith('.css')) : []
  assert.ok(cssFiles.length > 0, 'no CSS bundles in dist/css/')
})

test('vendor chunks are split (react + vue separate)', () => {
  const jsDir   = resolve(distDir, 'js')
  const jsFiles = existsSync(jsDir) ? readdirSync(jsDir) : []
  const hasReactVendor = jsFiles.some(f => f.startsWith('vendor-react'))
  const hasVueVendor   = jsFiles.some(f => f.startsWith('vendor-vue'))
  assert.ok(hasReactVendor, 'missing vendor-react chunk')
  assert.ok(hasVueVendor,   'missing vendor-vue chunk')
})
