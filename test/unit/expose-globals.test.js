import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildExposeFooter } from '../../src/utils/expose-globals.js'

// Minimal acorn-like parser stand-in is not used; we test the regex fallback
// (parse = undefined) AND a real AST via Node's built-in not available, so we
// rely on the regex path which the plugin falls back to when this.parse is absent.

test('exposes top-level function declarations', () => {
  const code = 'function generateSchema() {}\nfunction clearAll() {}'
  const footer = buildExposeFooter(code)
  assert.ok(footer.includes('window.generateSchema = generateSchema'))
  assert.ok(footer.includes('window.clearAll = clearAll'))
})

test('exposes const / let / var declarations', () => {
  const code = 'const a = 1\nlet b = 2\nvar c = 3'
  const footer = buildExposeFooter(code)
  assert.ok(footer.includes('window.a = a'))
  assert.ok(footer.includes('window.b = b'))
  assert.ok(footer.includes('window.c = c'))
})

test('exposes class and async function declarations', () => {
  const code = 'class Foo {}\nasync function bar() {}'
  const footer = buildExposeFooter(code)
  assert.ok(footer.includes('window.Foo = Foo'))
  assert.ok(footer.includes('window.bar = bar'))
})

test('every assignment is guarded by typeof', () => {
  const footer = buildExposeFooter('function x() {}')
  assert.ok(footer.includes("if (typeof x !== 'undefined') window.x = x"))
})

test('returns empty string when nothing to expose', () => {
  assert.equal(buildExposeFooter('console.log("hi")'), '')
  assert.equal(buildExposeFooter(''), '')
})

test('deduplicates repeated names', () => {
  const code = 'var x = 1\nfunction x() {}'
  const footer = buildExposeFooter(code)
  const occurrences = footer.split('window.x = x').length - 1
  assert.equal(occurrences, 1)
})

test('prefers AST when a parser is provided', () => {
  // Fake parser returns an AST exposing only `realTop`, ignoring nested `nested`.
  const fakeParse = () => ({
    body: [
      { type: 'FunctionDeclaration', id: { type: 'Identifier', name: 'realTop' } },
    ],
  })
  const footer = buildExposeFooter('function realTop() { function nested() {} }', fakeParse)
  assert.ok(footer.includes('window.realTop = realTop'))
  assert.ok(!footer.includes('window.nested'))
})

test('AST path handles destructuring patterns', () => {
  const fakeParse = () => ({
    body: [
      {
        type: 'VariableDeclaration',
        declarations: [
          {
            id: {
              type: 'ObjectPattern',
              properties: [
                { type: 'Property', value: { type: 'Identifier', name: 'a' } },
                { type: 'RestElement', argument: { type: 'Identifier', name: 'rest' } },
              ],
            },
          },
        ],
      },
    ],
  })
  const footer = buildExposeFooter('const { a, ...rest } = obj', fakeParse)
  assert.ok(footer.includes('window.a = a'))
  assert.ok(footer.includes('window.rest = rest'))
})
