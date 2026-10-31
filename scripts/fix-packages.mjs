import fs from 'node:fs'
import path from 'node:path'

const workspace = path.resolve(import.meta.dirname, '..')
const mainJava = path.join(workspace, 'backend', 'src', 'main', 'java')
const testJava = path.join(workspace, 'backend', 'src', 'test', 'java')

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

function fixPackages(rootDir) {
  const files = walk(rootDir).filter(f => f.endsWith('.java'))
  for (const file of files) {
    const relDir = path.dirname(path.relative(rootDir, file))
    const expectedPackage = relDir === '.' ? 'vn.doan.assetmanager' : relDir.split(path.sep).join('.')
    let content = fs.readFileSync(file, 'utf8')
    content = content.replace(/^package\s+[^;]+;/m, `package ${expectedPackage};`)
    fs.writeFileSync(file, content, 'utf8')
  }
}

fixPackages(mainJava)
fixPackages(testJava)
console.log('Fixed package declarations in all Java files based on actual directory locations!')
