// Inline classic <script> blocks define functions/vars in the global scope, and
// inline handlers like onclick="doThing()" rely on that. When we extract such a
// block into an ES module, those declarations become module-scoped and the inline
// handlers break. To preserve the original behavior we re-expose every top-level
// declaration on `window`.

function collectPattern(id, out) {
  if (!id) return
  switch (id.type) {
    case 'Identifier':
      out.push(id.name)
      break
    case 'ObjectPattern':
      for (const p of id.properties) {
        if (p.type === 'RestElement') collectPattern(p.argument, out)
        else collectPattern(p.value, out)
      }
      break
    case 'ArrayPattern':
      for (const el of id.elements) if (el) collectPattern(el, out)
      break
    case 'AssignmentPattern':
      collectPattern(id.left, out)
      break
    case 'RestElement':
      collectPattern(id.argument, out)
      break
  }
}

function namesFromAst(ast) {
  const names = []
  for (const node of ast.body ?? []) {
    if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) {
      names.push(node.id.name)
    } else if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) collectPattern(d.id, names)
    }
  }
  return names
}

// Fallback when no AST parser is available. Over-capture (e.g. nested declarations)
// is harmless because the emitted assignment is guarded by `typeof`.
function namesFromRegex(code) {
  const names = []
  const re = /^[ \t]*(?:export\s+)?(?:async\s+)?(?:function\s*\*?|class|const|let|var)\s+([A-Za-z_$][\w$]*)/gm
  let m
  while ((m = re.exec(code))) names.push(m[1])
  return names
}

/**
 * Build a footer that re-exposes a script's top-level declarations on `window`.
 * @param {string} code  extracted inline JS
 * @param {Function} [parse]  Rollup's this.parse (acorn). Optional.
 * @returns {string} footer to append, or '' if nothing to expose
 */
export function buildExposeFooter(code, parse) {
  let names = []
  if (typeof parse === 'function') {
    try {
      names = namesFromAst(parse(code))
    } catch {
      names = namesFromRegex(code)
    }
  } else {
    names = namesFromRegex(code)
  }

  const unique = [...new Set(names)].filter(Boolean)
  if (unique.length === 0) return ''

  const lines = unique.map((n) => `  if (typeof ${n} !== 'undefined') window.${n} = ${n};`)
  return (
    '\n\n/* vyro: expose top-level declarations so inline handlers (onclick="...") resolve */\n' +
    `try {\n${lines.join('\n')}\n} catch (e) {}\n`
  )
}
