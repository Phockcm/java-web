import {
  Boxes, ClipboardList, CreditCard, LayoutDashboard, LogOut, Laptop,
  RefreshCw, Search, ShieldCheck, Store, Users, Wrench, Star
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, setApiToken } from './services/api'
import { AssetDetailPanel } from './features/admin-assets/components/AssetDetailPanel'
import { AssetFormModal } from './features/admin-assets/components/AssetFormModal'
import { AssetsView } from './features/admin-assets/pages/AssetsView'
import { BrandCatalogView } from './features/admin-catalog/pages/BrandCatalogView'
import { CheckoutView } from './features/admin-orders/pages/CheckoutView'
import { CustomersView } from './features/admin-customers/pages/CustomersView'
import { DashboardView } from './features/admin-dashboard/pages/DashboardView'
import { LoginView } from './features/auth/pages/LoginView'
import { MaintenanceView } from './features/admin-maintenance/pages/MaintenanceView'
import { OrderManagementView } from './features/admin-orders/pages/OrderManagementView'
import { ReviewsView } from './features/admin-reviews/pages/ReviewsView'
import { StorefrontView } from './features/shop/shop-home/pages/StorefrontView'
import { UsersView } from './features/admin-users/pages/UsersView'
import type {
  AppUser, Asset, AssetInput, Customer, CustomerAccount, CustomerInput,
  CustomerRepairRequestItem, DashboardSummary, MaintenanceItem, ProductBrand, ProductReview, Role, Session, TrashRecord
} from './lib/types'

type Section = 'overview' | 'checkout' | 'orders' | 'catalog' | 'warehouse' | 'customers' | 'reviews' | 'maintenance' | 'users'

const pageTitles: Record<Section, string> = {
  overview: 'Tổng quan hệ thống',
  checkout: 'Điểm bán hàng & Thanh toán (POS)',
  orders: 'Quản lý đơn hàng',
  catalog: 'Danh mục thương hiệu & Sản phẩm',
  warehouse: 'Quản lý kho máy tính & Thiết bị',
  customers: 'Quản lý khách hàng',
  reviews: 'Bình luận & Đánh giá (Admin)',
  maintenance: 'Bảo trì máy tính',
  users: 'Quản lý người dùng hệ thống',
}

function readStaffSession(): Session | null {
  try {
    const saved = localStorage.getItem('asset-manager-session')
    if (!saved) return null
    const session = JSON.parse(saved) as Session
    return typeof session.token === 'string'
      && typeof session.username === 'string'
      && typeof session.displayName === 'string'
      && ['ADMIN', 'STAFF', 'FIXER'].includes(session.role)
      ? session
      : null
  } catch {
    return null
  }
}

function defaultSectionFor(session: Session | null): Section {
  if (session?.role === 'STAFF') return 'checkout'
  if (session?.role === 'FIXER') return 'maintenance'
  return 'overview'
}

function AdminApp() {
  const [session, setSession] = useState<Session | null>(() => readStaffSession())
  const [section, setSection] = useState<Section>(() => defaultSectionFor(readStaffSession()))

  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [recentAssets, setRecentAssets] = useState<Asset[]>([])
  const [allAssets, setAllAssets] = useState<Asset[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [maintenance, setMaintenance] = useState<MaintenanceItem[]>([])
  const [customerRepairRequests, setCustomerRepairRequests] = useState<CustomerRepairRequestItem[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([])
  const [productBrands, setProductBrands] = useState<ProductBrand[]>([])
  const [trash, setTrash] = useState<TrashRecord[]>([])
  const [trashLoading, setTrashLoading] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [page, setPage] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [catalogViewKey, setCatalogViewKey] = useState(0)
  const [warehouseViewKey, setWarehouseViewKey] = useState(0)
  const [customersViewKey, setCustomersViewKey] = useState(0)

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formAsset, setFormAsset] = useState<Asset | null>(null)

  // Sản phẩm chọn nhanh từ Danh mục để đưa sang Thanh toán
  const [checkoutInitialAsset, setCheckoutInitialAsset] = useState<Asset | null>(null)
  const [checkoutInitialCustomer, setCheckoutInitialCustomer] = useState<Customer | null>(null)

  useEffect(() => setApiToken(session?.token ?? null), [session])

  // Tải danh sách toàn bộ sản phẩm (cho Catalog & Checkout)
  useEffect(() => {
    if (!session || (session.role !== 'ADMIN' && session.role !== 'STAFF')) return
    setAssetsLoading(true)
    api.allAssets()
      .then(setAllAssets)
      .catch(exception => setError(exception instanceof Error ? exception.message : 'Không tải được danh mục sản phẩm'))
      .finally(() => setAssetsLoading(false))
  }, [session, refreshKey])

  useEffect(() => {
    if (!session || session.role !== 'ADMIN' || section !== 'catalog') return
    api.productBrands()
      .then(setProductBrands)
      .catch(exception => setError(exception instanceof Error ? exception.message : 'Không tải được danh mục hãng'))
  }, [session, section, refreshKey])

  // Tải danh sách khách hàng
  useEffect(() => {
    if (!session || (session.role !== 'ADMIN' && session.role !== 'STAFF')) return
    api.customers()
      .then(res => setCustomers(res))
      .catch(exception => setError(exception instanceof Error ? exception.message : 'Không tải được danh sách khách hàng'))
  }, [session, refreshKey])

  // Tải danh sách đánh giá
  useEffect(() => {
    if (!session || session.role !== 'ADMIN') return
    api.reviews()
      .then(res => setReviews(res))
      .catch(exception => setError(exception instanceof Error ? exception.message : 'Không tải được danh sách đánh giá'))
  }, [session, refreshKey])

  // Overview data
  useEffect(() => {
    if (!session || session.role !== 'ADMIN' || section !== 'overview') return
    setLoading(true)
    Promise.all([api.dashboard(), api.assets('', '', 0, 5)])
      .then(([dashboard, recent]) => {
        setSummary(dashboard)
        setRecentAssets(recent.content)
        setError('')
      })
      .catch(exception => setError(exception instanceof Error ? exception.message : 'Không tải được dữ liệu tổng quan'))
      .finally(() => setLoading(false))
  }, [session, section, refreshKey])

  useEffect(() => {
    if (!session || session.role !== 'ADMIN'
        || !['warehouse', 'customers', 'users', 'checkout', 'orders', 'catalog'].includes(section)) return
    setTrashLoading(true)
    api.trash()
      .then(setTrash)
      .catch(exception => setError(exception instanceof Error ? exception.message : 'Không tải được thùng rác'))
      .finally(() => setTrashLoading(false))
  }, [session, section, refreshKey])

  // Maintenance data
  useEffect(() => {
    if (!session || section !== 'maintenance') return
    setLoading(true)
    Promise.all([
      api.maintenance(),
      session.role === 'ADMIN' || session.role === 'FIXER' ? api.customerRepairRequests() : Promise.resolve([]),
    ])
      .then(([result, customerRequests]) => {
        setMaintenance(result)
        setCustomerRepairRequests(customerRequests)
        setError('')
      })
      .catch(exception => setError(exception instanceof Error ? exception.message : 'Không tải được hàng đợi bảo trì'))
      .finally(() => setLoading(false))
  }, [session, section, refreshKey])

  // Users data
  useEffect(() => {
    if (!session || section !== 'users' || session.role !== 'ADMIN') return
    setLoading(true)
    Promise.all([api.users(), api.storeAccounts()])
      .then(([result, accounts]) => { setUsers(result); setCustomerAccounts(accounts); setError('') })
      .catch(exception => setError(exception instanceof Error ? exception.message : 'Không tải được danh sách tài khoản'))
      .finally(() => setLoading(false))
  }, [session, section, refreshKey])

  async function login(username: string, password: string) {
    const nextSession = await api.login(username, password)
    localStorage.setItem('asset-manager-session', JSON.stringify(nextSession))
    setSession(nextSession)
    if (nextSession.role === 'STAFF') {
      setSection('checkout')
    } else if (nextSession.role === 'FIXER') {
      setSection('maintenance')
    } else {
      setSection('overview')
    }
    return nextSession
  }

  function logout() {
    localStorage.removeItem('asset-manager-session')
    setApiToken(null)
    setSession(null)
    setSummary(null)
    setSelectedAsset(null)
    setFormAsset(null)
    setFormOpen(false)
    setAllAssets([])
    setCustomers([])
    setReviews([])
    setMaintenance([])
    setCustomerRepairRequests([])
    setUsers([])
    setCustomerAccounts([])
  }

  function refresh() {
    setRefreshKey(value => value + 1)
  }

  async function updateCustomerAccount(id: number, input: {
    displayName: string
    email: string
    phone: string
    enabled: boolean
    password?: string
  }) {
    await api.updateStoreAccountAsAdmin(id, input)
    refresh()
  }

  function openCreate() {
    setFormAsset(null)
    setFormOpen(true)
  }

  async function saveAsset(input: AssetInput) {
    if (formAsset) await api.updateAsset(formAsset.id, input)
    else await api.createAsset(input)
    refresh()
  }

  async function createUser(input: { username: string; displayName: string; password: string; role: Role }) {
    await api.createUser(input)
    refresh()
  }

  async function updateUser(id: number, input: { displayName: string; role: Role; enabled: boolean; password?: string }) {
    await api.updateUser(id, input)
    refresh()
  }

  async function deleteUser(id: number) {
    await api.deleteUser(id)
    refresh()
  }

  async function moveItemToTrash(type: TrashRecord['type'], id: number) {
    try {
      await api.moveToTrash(type, id)
      refresh()
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể chuyển dữ liệu vào thùng rác')
      throw exception
    }
  }

  async function restoreTrashItem(id: number) {
    await api.restoreTrashItem(id)
    refresh()
  }

  async function deleteTrashItem(id: number) {
    await api.deleteTrashItem(id)
    refresh()
  }

  async function moveOrderToTrash(id: number) {
    await api.moveOrderToTrash(id)
    refresh()
  }

  async function handleAddCustomer(input: CustomerInput) {
    await api.createCustomer(input)
    refresh()
  }

  async function handleUpdateCustomer(id: number, input: CustomerInput) {
    await api.updateCustomer(id, input)
    refresh()
  }

  async function handleDeleteCustomer(id: number) {
    await api.deleteCustomer(id)
    refresh()
  }

  async function closeMaintenance(id: number, note: string) {
    await api.closeMaintenance(id, note)
    refresh()
  }

  async function closeCustomerRepairRequest(id: number, note: string) {
    await api.closeCustomerRepairRequest(id, note)
    refresh()
  }

  // Chọn mua từ danh mục sản phẩm -> chuyển thẳng sang trang Thanh toán
  function handleSelectFromCatalog(asset: Asset) {
    setCheckoutInitialAsset(asset)
    setSection('checkout')
  }

  if (!session) return <LoginView onLogin={login} />

  // Menu điều hướng phân theo quyền
  const isStaff = session.role === 'STAFF'
  const isFixer = session.role === 'FIXER'
  const isAdmin = session.role === 'ADMIN'
  // Rubric Security: staff được giới hạn vào POS, kho và tạo phiếu bảo trì.
  const canViewWarehouse = isAdmin || isStaff
  const canViewMaintenance = isAdmin || isFixer || isStaff

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup">
          <span className="brand-mark"><Laptop size={20} /></span>
          <span><strong>HỆ THỐNG MÁY TÍNH</strong><small>QUẢN LÝ & BÁN HÀNG</small></span>
          <span className="brand-version">01</span>
        </div>

        <p className="nav-label">
          {isStaff ? 'ĐIỂM BÁN HÀNG & KHO' : isFixer ? 'BẢO TRÌ THIẾT BỊ' : 'BÁN HÀNG & KHO MÁY'}
        </p>
        <nav className="main-nav" aria-label="Điều hướng chính">
          {/* Tổng quan: chỉ ADMIN */}
          {isAdmin && (
            <button
              className={`nav-item ${section === 'overview' ? 'active' : ''}`}
              onClick={() => { setSection('overview'); setError('') }}
            >
              <LayoutDashboard size={17} />
              <span>Tổng quan</span>
            </button>
          )}

          {/* Rubric Commerce: POS dành cho admin và nhân viên bán hàng. */}
          {(isAdmin || isStaff) && (
            <button
              className={`nav-item ${section === 'checkout' ? 'active' : ''}`}
              onClick={() => { setSection('checkout'); setError('') }}
            >
              <CreditCard size={17} />
              <span>Thanh toán (POS)</span>
            </button>
          )}

          {isAdmin && (
            <button
              className={`nav-item ${section === 'orders' ? 'active' : ''}`}
              onClick={() => { setSection('orders'); setError('') }}
            >
              <ClipboardList size={17} />
              <span>Quản lý đơn hàng</span>
            </button>
          )}

          {/* Danh mục: chỉ ADMIN */}
          {isAdmin && (
            <button
              className={`nav-item ${section === 'catalog' ? 'active' : ''}`}
              onClick={() => { setSection('catalog'); setCatalogViewKey(value => value + 1); setError('') }}
            >
              <Laptop size={17} />
              <span>Danh mục sản phẩm</span>
              {allAssets.length > 0 && <span className="nav-count">{allAssets.length}</span>}
            </button>
          )}

          {/* Kho máy tính: ADMIN + STAFF */}
          {canViewWarehouse && (
            <button
              className={`nav-item ${section === 'warehouse' ? 'active' : ''}`}
              onClick={() => { setSection('warehouse'); setWarehouseViewKey(value => value + 1); setError('') }}
            >
              <Boxes size={17} />
              <span>Kho máy tính</span>
              {summary?.total ? <span className="nav-count">{summary.total}</span> : null}
            </button>
          )}

          {/* Khách hàng: chỉ ADMIN */}
          {isAdmin && (
            <button
              className={`nav-item ${section === 'customers' ? 'active' : ''}`}
              onClick={() => { setSection('customers'); setCustomersViewKey(value => value + 1); setError('') }}
            >
              <Users size={17} />
              <span>Quản lý khách hàng</span>
              {customers.length > 0 && <span className="nav-count">{customers.length}</span>}
            </button>
          )}

          {/* Bảo trì: ADMIN, FIXER và STAFF có thể gửi yêu cầu từ kho. */}
          {canViewMaintenance && (
            <>
              <p className="nav-label nav-admin-label">
                {isAdmin ? 'QUẢN TRỊ & HẬU MÃI' : isFixer ? 'BẢO TRÌ' : 'BẢO TRÌ MÁY TÍNH'}
              </p>

              {isAdmin && (
                <button
                  className={`nav-item ${section === 'reviews' ? 'active' : ''}`}
                  onClick={() => { setSection('reviews'); setError('') }}
                >
                  <Star size={17} />
                  <span>Bình luận & Đánh giá</span>
                  {reviews.length > 0 && <span className="nav-count">{reviews.length}</span>}
                </button>
              )}

              <button
                className={`nav-item ${section === 'maintenance' ? 'active' : ''}`}
                onClick={() => { setSection('maintenance'); setError('') }}
              >
                <Wrench size={17} />
                <span>Bảo trì máy tính</span>
                  {(maintenance.length + customerRepairRequests.length) > 0 && <span className="nav-count">{maintenance.length + customerRepairRequests.length}</span>}
              </button>

              {isAdmin && (
                <button
                  className={`nav-item ${section === 'users' ? 'active' : ''}`}
                  onClick={() => { setSection('users'); setError('') }}
                >
                  <ShieldCheck size={17} />
                  <span>Quản trị tài khoản</span>
                  {users.length > 0 && <span className="nav-count">{users.length}</span>}
                </button>
              )}
            </>
          )}
        </nav>


        <div className="sidebar-bottom">
          <div className="connection-status">
            <span className="connection-dot" />
            CƠ SỞ DỮ LIỆU: <span className="connection-host">H2 / MySQL</span>
          </div>
          <div className="profile-row">
            <span className="profile-avatar">{session.displayName.charAt(0).toUpperCase()}</span>
            <span className="profile-copy">
              <strong>{session.displayName}</strong>
              <small>{session.role === 'ADMIN' ? 'Quản trị viên' : session.role === 'STAFF' ? 'Nhân viên' : 'Kỹ thuật viên bảo trì'}</small>
            </span>
            <button className="icon-button profile-logout" title="Đăng xuất" aria-label="Đăng xuất" onClick={logout}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Hệ thống Store</span>
            <span className="breadcrumb-divider">/</span>
            <strong>{pageTitles[section]}</strong>
          </div>
          <div className="topbar-tools">
            <a className="storefront-top-link" href="/store"><Store size={15} /> Cửa hàng</a>
            {!isFixer && (
              <label className="top-search">
                <Search size={15} />
                <input
                  aria-label="Tìm nhanh"
                  placeholder="Tìm kiếm máy tính, mã máy..."
                  value={search}
                  onChange={event => { setSearch(event.target.value); setPage(0); setSection('warehouse') }}
                />
              </label>
            )}
            <span className="topbar-divider" />
            <span className="role-indicator">
              <ShieldCheck size={15} /> {session.role === 'ADMIN' ? 'Admin' : session.role === 'STAFF' ? 'Staff' : 'Fixer'}
            </span>
            <div className="mobile-profile">
              <span className="mobile-profile-avatar">{session.displayName.charAt(0).toUpperCase()}</span>
              <span className="mobile-profile-name">{session.displayName}</span>
              <button className="icon-button" title="Đăng xuất" aria-label="Đăng xuất" onClick={logout}>
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </header>

        <div className="content-area">
          {error && (
            <div className="global-error" role="alert">
              <span>{error}</span>
              <button className="text-button" onClick={() => setError('')}>Đóng</button>
            </div>
          )}

          {/* Rubric Security: chặn staff truy cập các màn chỉ dành cho admin. */}
          {isStaff && section !== 'checkout' && section !== 'warehouse' && section !== 'maintenance' && (
            <div className="global-error" role="alert">
              <span>⛔ Nhân viên chỉ được phép truy cập Thanh toán, Kho máy tính và Bảo trì.</span>
              <button className="text-button" onClick={() => setSection('checkout')}>Quay về Thanh toán</button>
            </div>
          )}

          {/* Guard: fixer chỉ được vào maintenance */}
          {isFixer && section !== 'maintenance' && (
            <div className="global-error" role="alert">
              <span>⛔ Tài khoản Kỹ Thuật Viên chỉ được phép truy cập mục Bảo trì.</span>
              <button className="text-button" onClick={() => setSection('maintenance')}>Quay về Bảo trì</button>
            </div>
          )}

          {section === 'overview' && isAdmin && (
            <DashboardView
              summary={summary}
              recentAssets={recentAssets}
              onOpenAssets={() => setSection('warehouse')}
              onRefresh={() => setRefreshKey(value => value + 1)}
              refreshing={loading}
            />
          )}

          {section === 'checkout' && (isAdmin || isStaff) && (
            <CheckoutView
              assets={allAssets}
              customers={customers}
              session={session}
              initialSelectedAsset={checkoutInitialAsset}
              initialSelectedCustomer={checkoutInitialCustomer}
              onClearInitialSelection={() => {
                setCheckoutInitialAsset(null)
                setCheckoutInitialCustomer(null)
              }}
              onOrderCompleted={refresh}
              onMoveOrderToTrash={isAdmin ? moveOrderToTrash : undefined}
            />
          )}

          {section === 'orders' && isAdmin && (
            <OrderManagementView
              refreshKey={refreshKey}
              trashItems={trash.filter(item => item.type === 'ORDER')}
              trashLoading={trashLoading}
              onMoveOrderToTrash={moveOrderToTrash}
              onRestoreTrashItem={restoreTrashItem}
              onDeleteTrashItem={deleteTrashItem}
              onOrderChanged={refresh}
            />
          )}

          {section === 'catalog' && isAdmin && (
            <BrandCatalogView
              key={catalogViewKey}
              assets={allAssets}
              brands={productBrands}
              loading={assetsLoading}
              onSelectForCheckout={handleSelectFromCatalog}
              onViewDetail={setSelectedAsset}
              trashItems={trash}
              trashLoading={trashLoading}
              onCreateBrand={async name => { await api.createProductBrand(name); refresh() }}
              onUpdateBrand={async (id, name) => { await api.updateProductBrand(id, name); refresh() }}
              onMoveBrandToTrash={id => moveItemToTrash('BRAND', id)}
              onRestoreTrashItem={restoreTrashItem}
              onDeleteTrashItem={deleteTrashItem}
            />
          )}

          {section === 'warehouse' && canViewWarehouse && (
            <AssetsView
              key={warehouseViewKey}
              assets={allAssets}
              page={page}
              search={search}
              status={status}
              manufacturer={manufacturer}
              loading={assetsLoading}
              canManage={session.role === 'ADMIN'}
              onSearch={value => { setSearch(value); setPage(0) }}
              onStatus={value => { setStatus(value); setPage(0) }}
              onManufacturer={value => { setManufacturer(value); setPage(0) }}
              onCreate={openCreate}
              onSelect={setSelectedAsset}
              onPage={setPage}
              onMoveToTrash={id => { void moveItemToTrash('ASSET', id).catch(() => undefined) }}
              trashItems={trash}
              trashLoading={trashLoading}
              onRestoreTrashItem={restoreTrashItem}
              onDeleteTrashItem={deleteTrashItem}
            />
          )}

          {section === 'customers' && isAdmin && (
            <CustomersView
              key={customersViewKey}
              customers={customers}
              loading={loading && customers.length === 0}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              trashItems={trash.filter(item => item.type === 'CUSTOMER')}
              trashLoading={trashLoading}
              onRestoreTrashItem={restoreTrashItem}
              onDeleteTrashItem={deleteTrashItem}
              onSelectForCheckout={customer => {
                setCheckoutInitialCustomer(customer)
                setSection('checkout')
              }}
            />
          )}

          {section === 'reviews' && session.role === 'ADMIN' && (
            <ReviewsView
              reviews={reviews}
              loading={loading && reviews.length === 0}
              onRefresh={refresh}
            />
          )}

          {section === 'maintenance' && canViewMaintenance && (
            <MaintenanceView
              items={maintenance}
              repairRequests={customerRepairRequests}
              loading={loading}
              canResolve={isAdmin || isFixer}
              onCloseTicket={closeMaintenance}
              onCloseCustomerRequest={closeCustomerRepairRequest}
            />
          )}

          {section === 'users' && session.role === 'ADMIN' && (
            <UsersView
              users={users}
              customerAccounts={customerAccounts}
              customerAccountsLoading={loading}
              loading={loading}
              onCreate={createUser}
              onUpdate={updateUser}
              onDelete={deleteUser}
              onUpdateCustomerAccount={updateCustomerAccount}
              trashItems={trash}
              trashLoading={trashLoading}
              onRestoreTrashItem={restoreTrashItem}
              onDeleteTrashItem={deleteTrashItem}
            />
          )}

          {section !== 'checkout' && (
            <div className="content-footnote">
              <span>HỆ THỐNG MÁY TÍNH & BÁN HÀNG</span>
              <span>Cơ sở dữ liệu: Cục bộ</span>
              <button className="text-button" onClick={refresh}>
                <RefreshCw size={14} /> Làm mới
              </button>
            </div>
          )}
        </div>
      </main>

      {formOpen && <AssetFormModal asset={formAsset} onClose={() => setFormOpen(false)} onSave={saveAsset} />}
      {selectedAsset && (
        <AssetDetailPanel
          asset={selectedAsset}
          canManage={session.role === 'ADMIN'}
          canManageAssignments={isAdmin}
          canRequestMaintenance={isAdmin || isStaff}
          onClose={() => setSelectedAsset(null)}
          onEdit={() => { setFormAsset(selectedAsset); setSelectedAsset(null); setFormOpen(true) }}
          onChanged={refresh}
        />
      )}
    </div>
  )
}

export default function App() {
  const rawPath = window.location.pathname
  const path = rawPath.replace(/\/+$/, '') || '/'

  if (path === '/admin' || path.startsWith('/admin/')) return <AdminApp />
  if (path === '/store' || path.startsWith('/store/')) return <StorefrontView />

  // Trang mặc định luôn là cửa hàng; khu vực quản trị chỉ mở bằng /admin.
  if (path === '/') {
    window.history.replaceState({}, '', '/store')
    return <StorefrontView />
  }

  window.history.replaceState({}, '', '/store')
  return <StorefrontView />
}