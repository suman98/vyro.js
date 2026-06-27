import { resolve } from 'path'
import fs from 'fs'
import JavaScriptObfuscator from 'javascript-obfuscator'

export function obfuscateJsPlugin(ctx) {
  return {
    name: 'vyro:obfuscate-js',
    apply: 'build',
    writeBundle() {
      const distJsDir = resolve(ctx.distDir, 'js')
      if (!fs.existsSync(distJsDir)) return
      for (const file of fs.readdirSync(distJsDir)) {
        if (!file.endsWith('.js')) continue
        const filePath = resolve(distJsDir, file)
        const code     = fs.readFileSync(filePath, 'utf-8')
        const result   = JavaScriptObfuscator.obfuscate(code, {
          compact: true,
          identifierNamesGenerator: 'hexadecimal',
          renameGlobals: false,
          stringArray: true,
          stringArrayCallsTransform: true,
          stringArrayEncoding: ['base64'],
          stringArrayThreshold: 0.75,
          controlFlowFlattening: false,
          deadCodeInjection: false,
          selfDefending: false,
          transformObjectKeys: false,
        })
        fs.writeFileSync(filePath, result.getObfuscatedCode())
      }
    },
  }
}
