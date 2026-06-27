export function stripJsxStylePlugin() {
  return {
    name: 'vyro:strip-jsx-style',
    enforce: 'pre',
    transform(code, id) {
      if (!/\.(jsx|tsx)$/.test(id)) return
      const m = code.match(/^\s*<style[^>]*>[\s\S]*?<\/style>\s*/)
      if (!m) return
      return { code: code.slice(m[0].length), map: null }
    },
  }
}
