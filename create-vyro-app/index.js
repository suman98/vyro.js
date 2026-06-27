#!/usr/bin/env node

import { resolve, join } from 'path'
import { mkdirSync, writeFileSync, cpSync, existsSync, readdirSync } from 'fs'
import { createInterface } from 'readline'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { spawnSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---- CLI args ----

const name = process.argv[2]

if (!name) {
  console.error('\nUsage: npm create vyro-app@latest <project-name>\n')
  process.exit(1)
}

const dest = resolve(process.cwd(), name)

if (existsSync(dest)) {
  console.error(`\nError: directory "${name}" already exists.\n`)
  process.exit(1)
}

// ---- Prompt helper ----

function prompt(question, choices) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    const choiceList = choices.map((c, i) => `  ${i + 1}. ${c}`).join('\n')
    rl.question(`\n${question}\n${choiceList}\n\n  Choice (1): `, (answer) => {
      rl.close()
      const idx = parseInt(answer.trim()) - 1
      resolve(choices[idx >= 0 && idx < choices.length ? idx : 0])
    })
  })
}

// ---- Template copy (renames _gitignore → .gitignore) ----

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true })
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name)
    const destName = entry.name.startsWith('_') ? '.' + entry.name.slice(1) : entry.name
    const dstPath  = join(dst, destName)
    entry.isDirectory() ? copyDir(srcPath, dstPath) : cpSync(srcPath, dstPath)
  }
}

// ---- Main ----

console.log(`\nVyroJs — scaffolding "${name}"\n`)

const lang = await prompt('Select language:', ['TypeScript', 'JavaScript'])
const useTs = lang === 'TypeScript'

console.log(`\n  Creating ${useTs ? 'TypeScript' : 'JavaScript'} project...\n`)

mkdirSync(dest, { recursive: true })

// Copy shared base template
copyDir(join(__dirname, 'templates/shared'), dest)

// Copy language-specific template overlay
copyDir(join(__dirname, `templates/${useTs ? 'ts' : 'js'}`), dest)

// Write package.json with project name + correct deps
writeFileSync(
  join(dest, 'package.json'),
  JSON.stringify(
    {
      name,
      version: '0.0.1',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        ...(useTs ? { typecheck: 'tsc --noEmit' } : {}),
      },
      dependencies: {
        react: '^18.3.1',
        'react-dom': '^18.3.1',
        vue: '^3.5.0',
      },
      devDependencies: {
        vite: '^6.0.0',
        'vyro-js-plugin': 'github:suman98/vyro.js',
        sass: '^1.0.0',
        ...(useTs
          ? {
              typescript: '^6.0.0',
              '@types/react': '^19.0.0',
              '@types/react-dom': '^19.0.0',
            }
          : {}),
      },
    },
    null,
    2,
  ),
)

// Install dependencies
console.log('  Installing dependencies...\n')
const install = spawnSync('npm', ['install'], { cwd: dest, stdio: 'inherit' })
if (install.status !== 0) {
  console.error('\n  npm install failed. Run it manually:\n')
  console.error(`    cd ${name} && npm install\n`)
  process.exit(install.status ?? 1)
}

// Success output
console.log(`\n  Done! Start your app:\n`)
console.log(`    cd ${name}`)
console.log('    npm run dev\n')
console.log('  File → route mapping:')
console.log('    src/pages/index.html          →  /')
console.log('    src/pages/about.html          →  /about')
console.log('    src/pages/blog/index.vue      →  /blog')
console.log(`    src/pages/profile/index.${useTs ? 'tsx' : 'jsx'}  →  /profile\n`)
