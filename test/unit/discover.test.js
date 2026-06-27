import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { keyFor, discoverEntries } from '../../src/utils/discover.js'

let pages

before(() => {
  pages = join(tmpdir(), `vyro-discover-${Date.now()}`)
  mkdirSync(join(pages, 'blog'), { recursive: true })
  mkdirSync(join(pages, 'dashboard'), { recursive: true })
  mkdirSync(join(pages, 'both'), { recursive: true }) // has index.html AND index.vue
  writeFileSync(join(pages, 'index.html'),      '<h1>Home</h1>')
  writeFileSync(join(pages, 'about.html'),      '<h1>About</h1>')
  writeFileSync(join(pages, 'profile.vue'),     '<template><div/></template>')
  writeFileSync(join(pages, 'blog', 'index.vue'),  '<template><div/></template>')
  writeFileSync(join(pages, 'blog', 'card.vue'),   '<template><div/></template>') // non-index — ignored
  writeFileSync(join(pages, 'dashboard', 'index.html'), '<h1>Dashboard</h1>')
  writeFileSync(join(pages, 'both', 'index.html'), '<h1>Both</h1>')
  writeFileSync(join(pages, 'both', 'index.vue'),  '<template><div/></template>') // suppressed by index.html
})

after(() => rmSync(pages, { recursive: true, force: true }))

// --- keyFor ---

test('keyFor: root index.html → "index"', () => {
  assert.equal(keyFor(pages, join(pages, 'index.html')), 'index')
})

test('keyFor: root about.html → "about"', () => {
  assert.equal(keyFor(pages, join(pages, 'about.html')), 'about')
})

test('keyFor: nested dashboard/index.html → "dashboard-index"', () => {
  assert.equal(keyFor(pages, join(pages, 'dashboard', 'index.html')), 'dashboard-index')
})

// --- discoverEntries ---

test('discovers all valid pages', () => {
  const keys = discoverEntries(pages).map(e => e.key).sort()
  assert.deepEqual(keys, ['about', 'blog-index', 'both-index', 'dashboard-index', 'index', 'profile'].sort())
})

test('HTML entries have needsWrapper=false', () => {
  const entries = discoverEntries(pages).filter(e => e.ext === '.html')
  assert.ok(entries.length > 0)
  assert.ok(entries.every(e => !e.needsWrapper))
})

test('component entries have needsWrapper=true', () => {
  const entries = discoverEntries(pages).filter(e => e.ext !== '.html')
  assert.ok(entries.length > 0)
  assert.ok(entries.every(e => e.needsWrapper))
})

test('non-index .vue in subfolder is ignored', () => {
  const keys = discoverEntries(pages).map(e => e.key)
  assert.ok(!keys.some(k => k.includes('card')))
})

test('index.vue suppressed when index.html exists in same folder', () => {
  const entries  = discoverEntries(pages)
  const bothEntry = entries.filter(e => e.key === 'both-index')
  // only one entry for the "both" folder — the html one
  assert.equal(bothEntry.length, 1)
  assert.equal(bothEntry[0].ext, '.html')
})

test('returns [] for missing pagesDir', () => {
  assert.deepEqual(discoverEntries('/does/not/exist'), [])
})
