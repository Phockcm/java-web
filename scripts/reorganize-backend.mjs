import fs from 'node:fs'
import path from 'node:path'

const workspace = path.resolve(import.meta.dirname, '..')
const backendMainRoot = path.join(workspace, 'backend', 'src', 'main', 'java')
const backendTestRoot = path.join(workspace, 'backend', 'src', 'test', 'java')
const basePackageDir = path.join(backendMainRoot, 'vn', 'doan', 'assetmanager')

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

const shopControllers = new Set(['CustomerAccountController.java', 'CustomerRepairRequestController.java', 'StoreController.java'])
const systemControllers = new Set([
  'AssetController.java', 'AssignmentController.java', 'AuthController.java', 'CustomerController.java',
  'DashboardController.java', 'MaintenanceController.java', 'ProductBrandController.java',
  'ProductReviewController.java', 'SaleOrderController.java', 'SystemController.java', 'TrashController.java',
  'UserController.java',
])

const shopServices = new Set(['CustomerAccountService.java', 'CustomerRepairRequestService.java'])
const systemServices = new Set([
  'AssetService.java', 'AssignmentService.java', 'AuthService.java', 'DashboardService.java',
  'MaintenanceService.java', 'ProductBrandService.java', 'TrashService.java', 'UserService.java',
])

const shopModels = new Set(['CustomerAccount.java', 'CustomerRepairRequest.java'])
const systemModels = new Set(['AppUser.java'])
// All other models belong to shared:
// AssetStatus, AssetType, AssignmentRecord, ComputerAsset, Customer, MaintenanceRecord,
// MaintenanceStatus, ProductBrand, ProductReview, SaleOrder, TrashRecord, UserRole

const shopRepositories = new Set(['CustomerAccountRepository.java', 'CustomerRepairRequestRepository.java'])
const systemRepositories = new Set(['AppUserRepository.java'])
// All other repositories belong to shared:
// AssetRepository, AssignmentRepository, CustomerRepository, MaintenanceRepository,
// ProductBrandRepository, ProductReviewRepository, SaleOrderRepository, TrashRecordRepository

const shopRequests = new Set([
  'CreateCustomerRepairRequest.java', 'CreateStoreOrderRequest.java', 'CustomerAccountAdminRequest.java',
  'CustomerLoginRequest.java', 'CustomerProfileRequest.java', 'CustomerRegistrationRequest.java',
])
// Other requests belong to system:
// AssetRequest, AssignmentRequest, CreateSaleOrderRequest, CreateUserRequest, LoginRequest,
// MaintenanceCloseRequest, MaintenanceRequest, MoveToTrashRequest, ProductBrandRequest,
// ProductReviewRequest, ReturnRequest, UpdateUserRequest

const shopResponses = new Set([
  'CustomerAccountResponse.java', 'CustomerAuthResponse.java', 'CustomerRepairRequestResponse.java',
  'StoreProductResponse.java',
])
const sharedResponses = new Set(['ErrorResponse.java'])
// Other responses belong to system:
// AssetResponse, AssignmentResponse, DashboardResponse, LoginResponse, MaintenanceResponse,
// ProductBrandResponse, TrashRecordResponse, UserResponse

function getDestination(relativeFromBase) {
  const parts = relativeFromBase.split(path.sep)
  const fileName = parts.at(-1)
  if (parts.length === 1) {
    // Root files like AssetManagerApplication.java
    return null
  }
  const layer = parts[0] // controller, service, model, repository, dto, exception, config, security

  let domain = 'shared'
  let subDir = layer

  if (layer === 'controller') {
    domain = shopControllers.has(fileName) ? 'shop' : 'system'
  } else if (layer === 'service') {
    domain = shopServices.has(fileName) ? 'shop' : 'system'
  } else if (layer === 'model') {
    domain = shopModels.has(fileName) ? 'shop' : systemModels.has(fileName) ? 'system' : 'shared'
  } else if (layer === 'repository') {
    domain = shopRepositories.has(fileName) ? 'shop' : systemRepositories.has(fileName) ? 'system' : 'shared'
  } else if (layer === 'dto') {
    const kind = parts[1] // request or response
    subDir = path.join('dto', kind)
    if (kind === 'request') {
      domain = shopRequests.has(fileName) ? 'shop' : 'system'
    } else {
      domain = shopResponses.has(fileName) ? 'shop' : sharedResponses.has(fileName) ? 'shared' : 'system'
    }
  } else if (layer === 'exception') {
    domain = 'shared'
  } else if (layer === 'config' || layer === 'security') {
    domain = 'system'
  } else {
    // Already in a subfolder or unknown
    return null
  }

  return { domain, subDir, fileName }
}

// 1. Gather all main Java files
const allMainJavaFiles = walk(basePackageDir).filter(f => f.endsWith('.java'))
const moves = []
const typePackageMap = new Map()

for (const filePath of allMainJavaFiles) {
  const rel = path.relative(basePackageDir, filePath)
  const destInfo = getDestination(rel)
  const className = path.basename(filePath, '.java')

  if (destInfo) {
    const destRel = path.join(destInfo.domain, destInfo.subDir, destInfo.fileName)
    const targetPath = path.join(basePackageDir, destRel)
    const newPackage = `vn.doan.assetmanager.${destInfo.domain}.${destInfo.subDir.split(path.sep).join('.')}`
    moves.push({ from: filePath, to: targetPath, newPackage, className })
    typePackageMap.set(className, newPackage)
  } else {
    // E.g. AssetManagerApplication
    if (path.basename(filePath) === 'AssetManagerApplication.java') {
      typePackageMap.set(className, 'vn.doan.assetmanager')
    }
  }
}

console.log(`Found ${moves.length} main Java files to move into shop/system/shared domains.`)

// Read all main and test files
const allFilesToUpdate = [
  ...walk(basePackageDir).filter(f => f.endsWith('.java')),
  ...walk(backendTestRoot).filter(f => f.endsWith('.java')),
]

const fileContents = new Map()
for (const file of allFilesToUpdate) {
  fileContents.set(path.resolve(file), fs.readFileSync(file, 'utf8'))
}

// 2. Perform file moves
for (const { from, to, newPackage } of moves) {
  const absFrom = path.resolve(from)
  const absTo = path.resolve(to)
  let content = fileContents.get(absFrom) ?? fs.readFileSync(from, 'utf8')

  // Update package statement
  content = content.replace(/^package\s+vn\.doan\.assetmanager[^;]*;/m, `package ${newPackage};`)
  fileContents.delete(absFrom)
  fileContents.set(absTo, content)

  mkdirFor(to)
  if (absFrom !== absTo) {
    fs.renameSync(from, to)
  }
}

// 3. Move test service files
const testServiceDir = path.join(backendTestRoot, 'vn', 'doan', 'assetmanager', 'service')
if (fs.existsSync(testServiceDir)) {
  const targetTestDir = path.join(backendTestRoot, 'vn', 'doan', 'assetmanager', 'system', 'service')
  mkdirFor(path.join(targetTestDir, 'dummy.txt'))
  for (const f of fs.readdirSync(testServiceDir)) {
    if (f.endsWith('.java')) {
      const oldP = path.join(testServiceDir, f)
      const newP = path.join(targetTestDir, f)
      let c = fs.readFileSync(oldP, 'utf8')
      c = c.replace(/^package\s+vn\.doan\.assetmanager\.service;/m, 'package vn.doan.assetmanager.system.service;')
      fs.writeFileSync(newP, c, 'utf8')
      fs.unlinkSync(oldP)
      fileContents.set(path.resolve(newP), c)
    }
  }
  try { fs.rmdirSync(testServiceDir) } catch {}
}

// Clean up empty directories in basePackageDir
function removeEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const full = path.join(dir, entry.name)
      removeEmptyDirs(full)
      try {
        if (fs.readdirSync(full).length === 0) fs.rmdirSync(full)
      } catch {}
    }
  }
}
removeEmptyDirs(basePackageDir)

// 4. Update imports across all files in main and test
const updatedFiles = [
  ...walk(basePackageDir).filter(f => f.endsWith('.java')),
  ...walk(backendTestRoot).filter(f => f.endsWith('.java')),
]

for (const file of updatedFiles) {
  let content = fs.readFileSync(file, 'utf8')

  // Remove any stale broken wildcard imports from previous bad runs
  content = content.replace(/import\s+vn\.doan\.assetmanager\.(shared|system|shop)\.(model|repository|service|controller|exception|dto\.(request|response))\.\*;\r?\n?/g, '')
  content = content.replace(/import\s+vn\.doan\.assetmanager\.(model|repository|service|controller|exception|config|security|dto\.(request|response))\.\*;\r?\n?/g, '')

  // Add the standard clean wildcard imports that provide full access to all domains
  const packageMatch = content.match(/^package\s+([^;]+);/m)
  if (packageMatch) {
    const pkg = packageMatch[1]
    const importsToAdd = [
      'import vn.doan.assetmanager.shared.model.*;',
      'import vn.doan.assetmanager.shared.repository.*;',
      'import vn.doan.assetmanager.shared.exception.*;',
      'import vn.doan.assetmanager.shared.dto.response.*;',
      'import vn.doan.assetmanager.shop.model.*;',
      'import vn.doan.assetmanager.shop.repository.*;',
      'import vn.doan.assetmanager.shop.service.*;',
      'import vn.doan.assetmanager.shop.dto.request.*;',
      'import vn.doan.assetmanager.shop.dto.response.*;',
      'import vn.doan.assetmanager.system.model.*;',
      'import vn.doan.assetmanager.system.repository.*;',
      'import vn.doan.assetmanager.system.service.*;',
      'import vn.doan.assetmanager.system.dto.request.*;',
      'import vn.doan.assetmanager.system.dto.response.*;',
      'import vn.doan.assetmanager.system.security.*;',
    ]

    // Update single-type imports that had old paths
    for (const [type, newPkg] of typePackageMap.entries()) {
      // replace import vn.doan.assetmanager.<old>.<type>; with new import
      const regex = new RegExp(`import\\s+vn\\.doan\\.assetmanager\\.[a-zA-Z0-9_.]*\\b${type};`, 'g')
      content = content.replace(regex, `import ${newPkg}.${type};`)
    }

    // Insert the domain wildcard imports right after the package statement if not already present
    const standardImports = importsToAdd.filter(imp => !content.includes(imp)).join('\n')
    if (standardImports) {
      content = content.replace(packageMatch[0], `${packageMatch[0]}\n\n${standardImports}`)
    }
  }

  // Update role/cashier to staff
  content = content.replaceAll("'CASHIER'", "'STAFF'")
  content = content.replaceAll('"CASHIER"', '"STAFF"')
  content = content.replaceAll('login("cashier")', 'login("staff")')
  content = content.replaceAll('login(\'cashier\')', 'login(\'staff\')')
  content = content.replaceAll('cashierToken', 'staffToken')
  content = content.replaceAll('cashierId', 'staffId')
  content = content.replaceAll('cashierCanView', 'staffCanView')
  content = content.replaceAll('cashierCannot', 'staffCannot')
  content = content.replaceAll('cashierUsername', 'staffUsername')
  content = content.replaceAll('Thu ngân', 'Nhân viên')

  fs.writeFileSync(file, content, 'utf8')
}

console.log(`Backend reorganized successfully across ${updatedFiles.length} Java files!`)
