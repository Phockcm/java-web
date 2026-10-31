import fs from 'node:fs'
import path from 'node:path'

const workspace = path.resolve(import.meta.dirname, '..')
const frontendSource = path.join(workspace, 'frontend', 'src')
const backendJava = path.join(workspace, 'backend', 'src', 'main', 'java')
const backendTests = path.join(workspace, 'backend', 'src', 'test', 'java')

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(fullPath) : [fullPath]
  })
}

function mkdirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function addMove(moves, from, to) {
  moves.set(path.resolve(from), path.resolve(to))
}

const frontendMoves = new Map()
const sourceComponents = path.join(frontendSource, 'components')
const shopComponents = new Set([
  'StorefrontView.tsx',
  'StorefrontView.test.tsx',
  'StoreCustomerViews.tsx',
  'StoreCustomerViews.test.tsx',
])
const sharedComponents = new Set([
  'Pagination.tsx',
  'Pagination.test.tsx',
  'WarrantyInfo.tsx',
])

for (const name of fs.readdirSync(sourceComponents)) {
  const destination = shopComponents.has(name)
    ? path.join(frontendSource, 'shop', 'components', name)
    : sharedComponents.has(name)
      ? path.join(frontendSource, 'shared', 'components', name)
      : path.join(frontendSource, 'system', 'components', name)
  addMove(frontendMoves, path.join(sourceComponents, name), destination)
}

addMove(frontendMoves, path.join(frontendSource, 'App.tsx'), path.join(frontendSource, 'system', 'App.tsx'))
for (const name of ['api.ts', 'types.ts', 'utils.ts', 'utils.test.ts']) {
  addMove(frontendMoves, path.join(frontendSource, name), path.join(frontendSource, 'shared', name))
}

function resolveFrontendImport(fromFile, specifier) {
  const base = path.resolve(path.dirname(fromFile), specifier)
  const candidates = path.extname(base)
    ? [base]
    : ['', '.ts', '.tsx', '.js', '.jsx', '.css', '.d.ts'].map(extension => `${base}${extension}`)
  return candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null
}

function rewriteFrontendImports(content, fromFile, toFile) {
  return content.replace(/((?:from\s*|import\s*)['"])(\.[^'"]+)(['"])/g, (match, prefix, specifier, suffix) => {
    const target = resolveFrontendImport(fromFile, specifier)
    if (!target) return match
    const newTarget = frontendMoves.get(path.resolve(target)) ?? path.resolve(target)
    let relative = path.posix.relative(
      path.posix.dirname(toFile.split(path.sep).join('/')),
      newTarget.split(path.sep).join('/'),
    )
    const extension = path.posix.extname(specifier)
    if (!extension) relative = relative.replace(/\.(?:ts|tsx|js|jsx|d\.ts)$/, '')
    if (!relative.startsWith('.')) relative = `./${relative}`
    return `${prefix}${relative}${suffix}`
  })
}

const frontendFiles = walk(frontendSource).filter(file => /\.(?:ts|tsx)$/.test(file))
const frontendContents = frontendFiles.map(from => {
  const to = frontendMoves.get(path.resolve(from)) ?? path.resolve(from)
  let content = fs.readFileSync(from, 'utf8')
  content = rewriteFrontendImports(content, from, to)
  content = content.replaceAll("'CASHIER'", "'STAFF'").replaceAll('"CASHIER"', '"STAFF"')
  content = content.replaceAll('isCashier', 'isStaff')
  content = content.replaceAll('Thu ngân', 'Nhân viên')
  return { from, to, content }
})

for (const { from, to } of frontendContents) {
  if (from === to) continue
  mkdirFor(to)
  fs.renameSync(from, to)
}
for (const { to, content } of frontendContents) fs.writeFileSync(to, content, 'utf8')
if (fs.existsSync(sourceComponents) && fs.readdirSync(sourceComponents).length === 0) fs.rmdirSync(sourceComponents)

const systemControllers = new Set([
  'AssetController.java', 'AssignmentController.java', 'AuthController.java', 'CustomerController.java',
  'DashboardController.java', 'MaintenanceController.java', 'ProductBrandController.java',
  'ProductReviewController.java', 'SaleOrderController.java', 'SystemController.java', 'TrashController.java',
  'UserController.java',
])
const shopControllers = new Set(['CustomerAccountController.java', 'CustomerRepairRequestController.java', 'StoreController.java'])
const systemServices = new Set([
  'AssetService.java', 'AssignmentService.java', 'AuthService.java', 'DashboardService.java',
  'MaintenanceService.java', 'ProductBrandService.java', 'TrashService.java', 'UserService.java',
])
const shopServices = new Set(['CustomerAccountService.java', 'CustomerRepairRequestService.java'])
const shopModels = new Set(['CustomerAccount.java', 'CustomerRepairRequest.java'])
const systemModels = new Set(['AppUser.java', 'UserRole.java'])
const shopRepositories = new Set(['CustomerAccountRepository.java', 'CustomerRepairRequestRepository.java'])
const systemRepositories = new Set(['AppUserRepository.java'])
const shopRequests = new Set([
  'CreateCustomerRepairRequest.java', 'CreateStoreOrderRequest.java', 'CustomerAccountAdminRequest.java',
  'CustomerLoginRequest.java', 'CustomerProfileRequest.java', 'CustomerRegistrationRequest.java',
])
const shopResponses = new Set([
  'CustomerAccountResponse.java', 'CustomerAuthResponse.java', 'CustomerRepairRequestResponse.java',
  'StoreProductResponse.java',
])

function backendDestination(relativePath) {
  const [layer, ...rest] = relativePath.split(path.sep)
  const fileName = rest.at(-1)
  let module
  let destinationLayer = layer

  if (layer === 'controller') module = shopControllers.has(fileName) ? 'shop' : 'system'
  else if (layer === 'service') module = shopServices.has(fileName) ? 'shop' : 'system'
  else if (layer === 'model') {
    module = shopModels.has(fileName) ? 'shop' : systemModels.has(fileName) ? 'system' : 'shared'
  } else if (layer === 'repository') {
    module = shopRepositories.has(fileName) ? 'shop' : systemRepositories.has(fileName) ? 'system' : 'shared'
  } else if (layer === 'dto') {
    const section = rest[0]
    module = section === 'request'
      ? shopRequests.has(fileName) ? 'shop' : 'system'
      : shopResponses.has(fileName) ? 'shop' : 'system'
  } else if (layer === 'config' || layer === 'security') module = 'system'
  else if (layer === 'exception') module = 'shared'
  else return null

  if (layer === 'config' || layer === 'security') destinationLayer = layer
  else if (layer === 'dto') destinationLayer = path.join('dto', rest[0])
  return path.join(backendJava, module, destinationLayer, ...rest.slice(layer === 'dto' ? 1 : 0))
}

const javaFiles = [...walk(backendJava), ...walk(backendTests)].filter(file => file.endsWith('.java'))
const javaMoves = new Map()
for (const file of walk(backendJava).filter(file => file.endsWith('.java'))) {
  const relativePath = path.relative(backendJava, file)
  const destination = backendDestination(relativePath)
  if (destination) addMove(javaMoves, file, destination)
}

const typeMoves = new Map()
for (const [from, to] of javaMoves) {
  const fromRelative = path.relative(backendJava, from)
  const toRelative = path.relative(backendJava, to)
  const fromPackage = `vn.doan.assetmanager.${path.dirname(fromRelative).split(path.sep).join('.')}`
  const toPackage = `vn.doan.assetmanager.${path.dirname(toRelative).split(path.sep).join('.')}`
  typeMoves.set(`${fromPackage}.${path.basename(from, '.java')}`, `${toPackage}.${path.basename(from)}`)
}

const wildcardPackages = new Map([
  ['vn.doan.assetmanager.controller', ['system.controller', 'shop.controller']],
  ['vn.doan.assetmanager.service', ['system.service', 'shop.service']],
  ['vn.doan.assetmanager.model', ['shared.model', 'system.model', 'shop.model']],
  ['vn.doan.assetmanager.repository', ['shared.repository', 'system.repository', 'shop.repository']],
  ['vn.doan.assetmanager.dto.request', ['system.dto.request', 'shop.dto.request']],
  ['vn.doan.assetmanager.dto.response', ['system.dto.response', 'shop.dto.response']],
  ['vn.doan.assetmanager.exception', ['shared.exception']],
  ['vn.doan.assetmanager.config', ['system.config']],
  ['vn.doan.assetmanager.security', ['system.security']],
])

const javaContents = javaFiles.map(from => {
  const to = javaMoves.get(path.resolve(from)) ?? path.resolve(from)
  let content = fs.readFileSync(from, 'utf8')
  const sortedTypeMoves = [...typeMoves.entries()].sort((left, right) => right[0].length - left[0].length)
  for (const [oldName, newName] of sortedTypeMoves) content = content.replaceAll(oldName, newName)

  for (const [oldPackage, newPackages] of wildcardPackages) {
    content = content.replaceAll(
      `import ${oldPackage}.*;`,
      newPackages.map(packageName => `import vn.doan.assetmanager.${packageName}.*;`).join('\n'),
    )
  }

  if (javaMoves.has(path.resolve(from))) {
    const fromRelative = path.relative(backendJava, from)
    const toRelative = path.relative(backendJava, to)
    const oldPackage = `package vn.doan.assetmanager.${path.dirname(fromRelative).split(path.sep).join('.')};`
    const newPackage = `package vn.doan.assetmanager.${path.dirname(toRelative).split(path.sep).join('.')};`
    content = content.replace(oldPackage, newPackage)
  }

  content = content.replaceAll('CASHIER', 'STAFF')
  content = content.replaceAll('cashierToken', 'staffToken').replaceAll('cashierId', 'staffId')
  content = content.replaceAll('cashierCanView', 'staffCanView').replaceAll('cashierCannot', 'staffCannot')
  content = content.replaceAll('cashierUsername', 'staffUsername')
  content = content.replaceAll('Thu ngân', 'Nhân viên')
  content = content.replaceAll('cashierCanViewInventory', 'staffCanViewInventory')
  content = content.replaceAll('cashierCannotSetReview', 'staffCannotSetReview')
  return { from, to, content }
})

for (const { from, to } of javaContents) {
  if (from === to) continue
  mkdirFor(to)
  fs.renameSync(from, to)
}
for (const { to, content } of javaContents) fs.writeFileSync(to, content, 'utf8')

console.log(`Moved ${frontendMoves.size} frontend files and ${javaMoves.size} backend Java files into shop/system/shared domains.`)