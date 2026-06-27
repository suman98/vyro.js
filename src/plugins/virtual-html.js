export function virtualHtmlPlugin(ctx) {
  return {
    name: 'vyro:virtual-html',
    apply: 'build',
    enforce: 'pre',
    resolveId(id) {
      if (ctx.htmlCache.has(id)) return id
    },
    load(id) {
      return ctx.htmlCache.get(id) ?? null
    },
  }
}
