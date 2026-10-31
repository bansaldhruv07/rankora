// PDF.js loads standard fonts, CJK character maps and its WASM decoders from URLs. Self-host them
// (instead of a third-party CDN) by copying them into public/pdfjs, which Vite serves and builds.
// Runs after `npm install`; the copied files are git-ignored.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const from = (name) => fileURLToPath(new URL(`../node_modules/pdfjs-dist/${name}`, import.meta.url))
const to = fileURLToPath(new URL('../public/pdfjs', import.meta.url))

if (!existsSync(from('package.json'))) {
  console.log('pdfjs-dist is not installed yet; skipping asset copy')
  process.exit(0)
}
rmSync(to, { recursive: true, force: true })
mkdirSync(to, { recursive: true })
for (const dir of ['standard_fonts', 'cmaps', 'wasm', 'iccs']) cpSync(from(dir), `${to}/${dir}`, { recursive: true })
console.log('Copied PDF.js assets to public/pdfjs')
