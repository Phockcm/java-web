import { ArrowRight, Check, Eye, Laptop, LogIn, LogOut, Search, ShieldCheck, ShoppingBag, Truck, UserRound, Wrench, X } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from 'react'
import { api, setApiToken } from '../../../../services/api'
import type { CustomerAccount, CustomerSession, SaleOrder, Session, StoreProduct, WarrantyPlan } from '../../../../lib/types'
import { formatCurrency, productImageFor } from '../../../../utils/formatters'
import { Pagination, usePagination } from '../../../../components/common/Pagination'
import { WarrantyInfo } from '../../../../components/common/WarrantyInfo'
import { StaffAccountDetailsPage, StoreAuthPage, StoreProductDetailPage, StoreProfilePage, StoreReceiptPage, StoreRepairPage } from '../../users/pages/StoreCustomerViews'

const categoryOptions = [
  { value: 'ALL', label: 'Tất cả sản phẩm' },
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'DESKTOP', label: 'Máy tính để bàn' },
  { value: 'MONITOR', label: 'Màn hình' },
  { value: 'OTHER', label: 'Thiết bị khác' },
]

function readCustomerSession(): CustomerSession | null {
  try {
    const saved = localStorage.getItem('customer-store-session')
    return saved ? JSON.parse(saved) as CustomerSession : null
  } catch {
    return null
  }
}

function readCart(): StoreProduct[] {
  try {
    const saved = localStorage.getItem('customer-store-cart')
    return saved ? JSON.parse(saved) as StoreProduct[] : []
  } catch {
    return []
  }
}

function readStaffSession(): Session | null {
  try {
    const saved = localStorage.getItem('asset-manager-session')
    return saved ? JSON.parse(saved) as Session : null
  } catch {
    return null
  }
}

function storeProductKey(product: StoreProduct) {
  return [product.manufacturer, product.modelName, product.type, product.processor, product.memoryGb,
    product.storage, product.screenSizeInch, product.refreshRateHz, product.usbPorts,
    product.hasHeadphoneJack, product.hasDedicatedGraphics, product.price].join('\u0000').toLowerCase()
}

function groupStoreProducts(products: StoreProduct[]) {
  const groups = new Map<string, { key: string; product: StoreProduct; units: StoreProduct[] }>()
  for (const product of products) {
    const key = storeProductKey(product)
    const group = groups.get(key)
    if (group) group.units.push(product)
    else groups.set(key, { key, product, units: [product] })
  }
  return [...groups.values()]
}

export function StorefrontView() {
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [brand, setBrand] = useState('ALL')
  const [cart, setCart] = useState<StoreProduct[]>(readCart)
  const [warrantyPlan, setWarrantyPlan] = useState<WarrantyPlan>('STANDARD')
  const [showCart, setShowCart] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [notice, setNotice] = useState(() => new URLSearchParams(window.location.search).get('profile-saved') === '1'
    ? 'Thông tin tài khoản đã được lưu thành công.'
    : '')
  const [submitting, setSubmitting] = useState(false)
  const [customerSession, setCustomerSession] = useState<CustomerSession | null>(readCustomerSession)
  const [customerAccount, setCustomerAccount] = useState<CustomerAccount | null>(null)
  const [customerOrders, setCustomerOrders] = useState<SaleOrder[]>([])
  const [receipt, setReceipt] = useState<SaleOrder | null>(null)
  const [receiptError, setReceiptError] = useState('')
  const [staffSession] = useState(readStaffSession)
  const adminLinkVisible = staffSession !== null
    && ['ADMIN', 'STAFF', 'FIXER'].includes(staffSession.role)
  const path = window.location.pathname.replace(/\/+$/, '') || '/store'
  const productRoute = path.match(/^\/store\/product\/(\d+)$/)
  const productId = productRoute ? Number(productRoute[1]) : null
  const receiptRoute = path.match(/^\/store\/receipt\/([a-z\d-]+)$/i)
  const receiptCode = receiptRoute?.[1] ?? null
  const isAuthPage = path === '/store/login' || path === '/store/register'
  const isProfilePage = path === '/store/account'
  const isRepairPage = path === '/store/repair'
  const isSearchPage = path === '/store/search'
  const isDetailPage = productId !== null
  const isReceiptPage = receiptCode !== null

  useEffect(() => {
    setApiToken(customerSession?.token ?? staffSession?.token ?? null)
  }, [customerSession, staffSession])

  useEffect(() => {
    localStorage.setItem('customer-store-cart', JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('checkout') === '1') setShowCart(true)
  }, [])

  useEffect(() => {
    api.storeProducts()
      .then(setProducts)
      .catch(exception => setError(exception instanceof Error ? exception.message : 'Không tải được danh sách sản phẩm'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!receiptCode) return
    api.storeReceipt(receiptCode)
      .then(setReceipt)
      .catch(exception => setReceiptError(exception instanceof Error ? exception.message : 'Không tải được hóa đơn'))
  }, [receiptCode])

  useEffect(() => {
    if (!customerSession) return
    api.storeAccount()
      .then(setCustomerAccount)
      .catch(exception => setError(exception instanceof Error ? exception.message : 'Không tải được thông tin tài khoản'))
  }, [customerSession])

  useEffect(() => {
    if (!customerSession) {
      setCustomerOrders([])
      return
    }
    api.storeMyOrders()
      .then(setCustomerOrders)
      .catch(exception => setError(exception instanceof Error ? exception.message : 'Không tải được lịch sử đơn hàng'))
  }, [customerSession])

  const filteredProducts = useMemo(() => products.filter(product => {
    const searchTerm = search.trim().toLocaleLowerCase()
    const matchesText = !searchTerm || `${product.manufacturer} ${product.modelName} ${product.processor ?? ''} ${product.storage ?? ''} ${product.assetCode}`.toLocaleLowerCase().includes(searchTerm)
    return matchesText && (brand === 'ALL' || product.manufacturer === brand)
  }), [products, search, brand])
  const productGroups = useMemo(() => groupStoreProducts(filteredProducts), [filteredProducts])
  const cartGroups = useMemo(() => groupStoreProducts(cart), [cart])
  const pagination = usePagination(productGroups, 12)
  const brands = useMemo(() => [...new Set(products.map(product => product.manufacturer))].sort(), [products])
  const popularProducts = useMemo(() => groupStoreProducts(products)
    .sort((left, right) => right.product.viewCount - left.product.viewCount)
    .slice(0, 4), [products])
  const detailProduct = productId === null ? null : products.find(product => product.id === productId) ?? null

  function addToCart(product: StoreProduct) {
    if (product.status !== 'AVAILABLE') {
      setNotice('Sản phẩm này hiện không còn sẵn sàng để mua.')
      window.setTimeout(() => setNotice(''), 3000)
      return
    }
    const groupKey = storeProductKey(product)
    const nextUnit = products.find(candidate => storeProductKey(candidate) === groupKey
      && !cart.some(item => item.id === candidate.id))
    if (!nextUnit) {
      setNotice(`Đã chọn hết số lượng ${product.modelName} hiện có.`)
      window.setTimeout(() => setNotice(''), 3000)
      return
    }
    setCart(current => [...current, nextUnit])
    setNotice(`${product.modelName} đã được thêm vào giỏ hàng.`)
    window.setTimeout(() => setNotice(''), 3000)
  }

  function openProduct(event: MouseEvent<HTMLAnchorElement>, product: StoreProduct) {
    event.preventDefault()
    const destination = `/store/product/${product.id}`
    api.recordStoreProductView(product.id)
      .then(viewCount => {
        setProducts(current => current.map(item => item.id === product.id ? { ...item, viewCount } : item))
        window.location.href = destination
      })
      .catch(exception => setError(exception instanceof Error ? exception.message : 'Không thể ghi nhận lượt xem sản phẩm'))
  }

  async function handleOrderRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (cart.length === 0) return
    const adminOrder = staffSession?.role === 'ADMIN'
    if (!customerSession && !adminOrder) {
      window.location.href = '/store/login?checkout=1'
      return
    }
    if (customerSession && !customerAccount?.phone) {
      window.location.href = '/store/account?checkout=1'
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const request = await api.createStoreRequest({ assetIds: cart.map(product => product.id), warrantyPlan })
      setCustomerOrders(current => [request, ...current])
      setCart([])
      setShowCart(false)
      setNotice(`Đã gửi yêu cầu ${request.orderCode}. Nhân viên sẽ liên hệ xác nhận đơn hàng.`)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không gửi được yêu cầu mua hàng')
    } finally {
      setSubmitting(false)
    }
  }

  function acceptCustomerSession(session: CustomerSession, isRegistration: boolean) {
    localStorage.setItem('customer-store-session', JSON.stringify(session))
    setApiToken(session.token)
    setCustomerSession(session)
    window.location.href = isRegistration
      ? '/store'
      : window.location.search.includes('checkout=1')
      ? '/store?checkout=1'
      : window.location.search.includes('repair=1') ? '/store/repair' : '/store/account'
  }

  function acceptCustomerProfile(account: CustomerAccount) {
    setCustomerAccount(account)
    const session = customerSession
    if (session && session.displayName !== account.displayName) {
      const updatedSession = { ...session, displayName: account.displayName }
      localStorage.setItem('customer-store-session', JSON.stringify(updatedSession))
      setCustomerSession(updatedSession)
    }
    window.location.href = '/store?profile-saved=1'
  }

  function logoutCustomer() {
    localStorage.removeItem('customer-store-session')
    setApiToken(null)
    setCustomerSession(null)
    setCustomerAccount(null)
    window.location.href = '/store'
  }

  function logoutStaff() {
    localStorage.removeItem('asset-manager-session')
    window.location.href = '/store'
  }

  const count = productGroups.length
  const availableUnitCount = filteredProducts.length

  return (
    <main className="storefront">
      <div className="store-announcement">
        <Truck size={15} /> Tư vấn tận tâm · Kiểm tra máy trực tiếp tại cửa hàng
      </div>
      <header className="store-header">
        <a href="/store" className="store-brand" aria-label="Máy Tính Store trang chủ">
          <span className="store-brand-mark"><Laptop size={22} /></span>
          <span><strong>MÁY TÍNH STORE</strong><small>THIẾT BỊ CÔNG NGHỆ CHÍNH HÃNG</small></span>
        </a>
        <nav className="store-header-links" aria-label="Điều hướng cửa hàng">
          <a href="/store#products">Sản phẩm</a>
          <a href="/store/search">Tìm kiếm</a>
          <a href="/store/repair">Dịch vụ</a>
        </nav>
        <div className="store-header-actions">
          {adminLinkVisible && (
            <a className="store-admin-button" href="/admin"><ShieldCheck size={16} /><span>Quản trị</span></a>
          )}
          {customerSession ? (
            <div className="store-account-menu">
              <button className="store-account-link" type="button" aria-label={`Tài khoản ${customerSession.displayName}`} aria-expanded={accountMenuOpen} aria-haspopup="menu" onClick={() => setAccountMenuOpen(open => !open)}>
                <UserRound size={16} /><span>{customerSession.displayName}</span>
              </button>
              {accountMenuOpen && (
                <div className="store-account-menu-options" role="menu">
                  <a role="menuitem" href="/store/account"><UserRound size={15} />Chi tiết</a>
                  <button role="menuitem" type="button" onClick={logoutCustomer}><LogOut size={15} />Đăng xuất</button>
                </div>
              )}
            </div>
          ) : staffSession ? (
            <div className="store-account-menu">
              <button className="store-account-link" type="button" aria-label={`Tài khoản ${staffSession.displayName}`} aria-expanded={accountMenuOpen} aria-haspopup="menu" onClick={() => setAccountMenuOpen(open => !open)}>
                <UserRound size={16} /><span>{staffSession.displayName}</span>
              </button>
              {accountMenuOpen && (
                <div className="store-account-menu-options" role="menu">
                  <a role="menuitem" href="/store/account"><UserRound size={15} />Chi tiết</a>
                  <button role="menuitem" type="button" onClick={logoutStaff}><LogOut size={15} />Đăng xuất</button>
                </div>
              )}
            </div>
          ) : (
            <a className="store-account-link" href="/store/login"><LogIn size={16} /><span>Đăng nhập</span></a>
          )}
          <button className="store-cart-button" onClick={() => setShowCart(true)} aria-label={`Mở giỏ hàng, ${cart.length} sản phẩm`}>
            <ShoppingBag size={18} /><span>Giỏ hàng</span><b>{cart.length}</b>
          </button>
        </div>
      </header>

      {isAuthPage ? (
        <StoreAuthPage
          mode={path === "/store/register" ? "register" : "login"}
          onAuthenticated={acceptCustomerSession}
        />
      ) : isProfilePage && staffSession && !customerSession ? (
        <StaffAccountDetailsPage
          session={staffSession}
          onLogout={logoutStaff}
        />
      ) : isProfilePage ? (
        <StoreProfilePage
          session={customerSession}
          account={customerAccount}
          orders={customerOrders}
          loading={Boolean(customerSession && !customerAccount && !error)}
          error={error}
          onSave={acceptCustomerProfile}
          onLogout={logoutCustomer}
        />
      ) : isRepairPage ? (
        <StoreRepairPage
          session={customerSession}
          staffSession={staffSession}
          account={customerAccount}
          accountLoading={Boolean(
            customerSession && !customerAccount && !error,
          )}
          accountError={error}
        />
      ) : isSearchPage ? (
        <section
          className="store-products-section store-search-page"
          aria-labelledby="store-search-title"
        >
          <div className="store-section-heading">
            <div>
              <span className="store-kicker">DANH MỤC CỬA HÀNG</span>
              <h2 id="store-search-title">Tìm kiếm sản phẩm</h2>
              <p>
                Tìm theo tên máy, hãng hoặc cấu hình; có thể lọc theo thương
                hiệu.
              </p>
            </div>
            <span className="store-result-pill">{count} sản phẩm</span>
          </div>
          <div className="store-filter-panel">
            <label className="store-search">
              <Search size={18} />
              <input
                aria-label="Tìm kiếm sản phẩm"
                placeholder="Nhập tên máy, hãng hoặc cấu hình..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  pagination.setPage(0);
                }}
              />
            </label>
            <label className="store-select">
              <select
                aria-label="Lọc thương hiệu"
                value={brand}
                onChange={(event) => {
                  setBrand(event.target.value);
                  pagination.setPage(0);
                }}
              >
                <option value="ALL">Mọi thương hiệu</option>
                {brands.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && (
            <div className="store-error" role="alert">
              {error}
              <button
                onClick={() => {
                  setError("");
                  setLoading(true);
                  api
                    .storeProducts()
                    .then(setProducts)
                    .catch((reason) =>
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "Không tải được sản phẩm",
                      ),
                    )
                    .finally(() => setLoading(false));
                }}
              >
                Thử lại
              </button>
            </div>
          )}
          {loading ? (
            <div className="store-state-card">Đang tải sản phẩm...</div>
          ) : count === 0 ? (
            <div className="store-state-card">
              Không tìm thấy sản phẩm phù hợp với bộ lọc.
            </div>
          ) : (
            <div className="store-product-grid">
              {pagination.pageItems.map((group) => {
                const product = group.product;
                return (
                  <a
                    className="store-product-card"
                    key={group.key}
                    href={`/store/product/${product.id}`}
                    onClick={(event) => openProduct(event, product)}
                  >
                    <div className="store-product-image">
                      <span className="store-product-brand">
                        {product.manufacturer}
                      </span>
                      <img
                        src={productImageFor(product)}
                        alt={`${product.manufacturer} ${product.modelName}`}
                        loading="lazy"
                      />
                    </div>
                    <div className="store-product-content">
                      <span className="store-product-type">
                        {categoryOptions.find(
                          (option) => option.value === product.type,
                        )?.label ?? "Thiết bị"}
                      </span>
                      <h3>{product.modelName}</h3>
                      <span className="store-stock-state available">
                        Còn {group.units.length} máy
                      </span>
                      <div className="store-product-specs">
                        <span>{product.processor || "Cấu hình cân bằng"}</span>
                        <span>
                          {product.memoryGb
                            ? `${product.memoryGb} GB RAM`
                            : "RAM theo máy"}
                        </span>
                        <span>{product.storage || "Lưu trữ theo máy"}</span>
                      </div>
                      <div className="store-product-footer">
                        <strong>{formatCurrency(product.price)}</strong>
                        <span className="store-view-count">
                          <Eye size={13} /> {product.viewCount}
                        </span>
                        <span className="store-detail-cta">
                          Xem chi tiết <ArrowRight size={13} />
                        </span>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
          {!loading && count > 0 && (
            <Pagination
              totalItems={count}
              page={pagination.page}
              pageSize={12}
              onPageChange={pagination.setPage}
            />
          )}
        </section>
      ) : isReceiptPage ? (
        <StoreReceiptPage
          order={receipt}
          loading={!receipt && !receiptError}
          error={receiptError}
        />
      ) : isDetailPage ? (
        <StoreProductDetailPage
          product={detailProduct}
          loading={loading}
          onAddToCart={addToCart}
        />
      ) : (
        <>
          <section className="store-hero">
            <div className="store-hero-copy">
              <span className="store-kicker">GÓC CÔNG NGHỆ CỦA BẠN</span>
              <h1>Tìm chiếc máy<br /><em>hợp với bạn.</em></h1>
              <p>Khám phá laptop, máy tính và thiết bị được tuyển chọn cho công việc, học tập và sáng tạo.</p>
              <a className="store-hero-cta" href="#products">Khám phá sản phẩm <ArrowRight size={17} /></a>
              <div className="store-hero-proof">
                <span><Check size={14} /> Sản phẩm có sẵn tại cửa hàng</span>
                <span><Check size={14} /> Tư vấn cấu hình phù hợp</span>
              </div>
            </div>
            <div className="store-hero-art"><img src="/acer.png" alt="Thiết bị laptop được trưng bày tại cửa hàng" /></div>
          </section>

          <section className="store-category-strip" id="benefits">
            <a href="/store/search">
              <span className="store-category-icon">
                <Laptop size={19} />
              </span>
              <span>
                <strong>Sản phẩm chọn lọc</strong>
                <small>Thiết bị đang có sẵn</small>
              </span>
            </a>
            <a href="/store/repair">
              <span className="store-category-icon">
                <Wrench size={19} />
              </span>
              <span>
                <strong>Dịch vụ sửa chữa</strong>
                <small>Gửi máy cho đội bảo trì</small>
              </span>
            </a>
            <article>
              <span className="store-category-icon">
                <Truck size={19} />
              </span>
              <span>
                <strong>Hỗ trợ tại cửa hàng</strong>
                <small>Kiểm tra máy trước khi mua</small>
              </span>
            </article>
          </section>

          <section
            className="store-products-section store-popular-section"
            aria-labelledby="popular-products-title"
          >
            <div className="store-section-heading">
              <div>
                <span className="store-kicker">ĐƯỢC KHÁCH HÀNG QUAN TÂM</span>
                <h2 id="popular-products-title">Máy được chú ý</h2>
                <p>
                  Lượt xem được ghi nhận mỗi khi khách mở trang chi tiết sản
                  phẩm.
                </p>
              </div>
            </div>
            {loading ? (
              <div className="store-state-card">Đang tải sản phẩm...</div>
            ) : popularProducts.length === 0 ? (
              <div className="store-state-card">
                Chưa có máy tính trong kho.
              </div>
            ) : (
              <div className="store-product-grid">
                {popularProducts.map((group) => {
                  const product = group.product;
                  return (
                    <a
                      className="store-product-card"
                      key={group.key}
                      href={`/store/product/${product.id}`}
                      onClick={(event) => openProduct(event, product)}
                    >
                      <div className="store-product-image">
                        <span className="store-product-brand">
                          {product.manufacturer}
                        </span>
                        <img
                          src={productImageFor(product)}
                          alt={`${product.manufacturer} ${product.modelName}`}
                          loading="lazy"
                        />
                      </div>
                      <div className="store-product-content">
                        <span className="store-product-type">
                          {categoryOptions.find(
                            (option) => option.value === product.type,
                          )?.label ?? "Thiết bị"}
                        </span>
                        <h3>{product.modelName}</h3>
                        <span className="store-stock-state available">
                          Còn {group.units.length} máy
                        </span>
                        <span className="store-view-count">
                          <Eye size={13} /> {product.viewCount} lượt xem
                        </span>
                        <div className="store-product-footer">
                          <strong>{formatCurrency(product.price)}</strong>
                          <span className="store-detail-cta">
                            Xem máy <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </section>

          <section className="store-products-section" id="products">
            <div className="store-section-heading">
              <div>
                <span className="store-kicker">DANH MỤC CỬA HÀNG</span>
                <h2>Các máy hiện có tại cửa hàng</h2>
                <p>{availableUnitCount} máy đang có sẵn.</p>
              </div>
              <span className="store-result-pill">{count} mẫu máy</span>
            </div>
            {notice && (
              <div className="store-notice" role="status">
                <Check size={16} /> {notice}
                <button
                  aria-label="Đóng thông báo"
                  onClick={() => setNotice("")}
                >
                  <X size={15} />
                </button>
              </div>
            )}
            {error && (
              <div className="store-error" role="alert">
                {error}
                <button
                  onClick={() => {
                    setError("");
                    setLoading(true);
                    api
                      .storeProducts()
                      .then(setProducts)
                      .catch((reason) =>
                        setError(
                          reason instanceof Error
                            ? reason.message
                            : "Không tải được sản phẩm",
                        ),
                      )
                      .finally(() => setLoading(false));
                  }}
                >
                  Thử lại
                </button>
              </div>
            )}
            {loading ? (
              <div className="store-state-card">Đang tải sản phẩm...</div>
            ) : count === 0 ? (
              <div className="store-state-card">
                Không tìm thấy sản phẩm phù hợp với bộ lọc.
              </div>
            ) : (
              <div className="store-product-grid">
                {pagination.pageItems.map((group) => {
                  const product = group.product;
                  return (
                    <a
                      className="store-product-card"
                      key={group.key}
                      href={`/store/product/${product.id}`}
                      onClick={(event) => openProduct(event, product)}
                    >
                      <div className="store-product-image">
                        <span className="store-product-brand">
                          {product.manufacturer}
                        </span>
                        <img
                          src={productImageFor(product)}
                          alt={`${product.manufacturer} ${product.modelName}`}
                          loading="lazy"
                        />
                      </div>
                      <div className="store-product-content">
                        <span className="store-product-type">
                          {categoryOptions.find(
                            (option) => option.value === product.type,
                          )?.label ?? "Thiết bị"}
                        </span>
                        <h3>{product.modelName}</h3>
                        <span className="store-stock-state available">
                          Còn {group.units.length} máy
                        </span>
                        <div className="store-product-specs">
                          <span>
                            {product.processor || "Cấu hình cân bằng"}
                          </span>
                          <span>
                            {product.memoryGb
                              ? `${product.memoryGb} GB RAM`
                              : "RAM theo máy"}
                          </span>
                          <span>{product.storage || "Lưu trữ theo máy"}</span>
                        </div>
                        <div className="store-product-footer">
                          <strong>{formatCurrency(product.price)}</strong>
                          <span className="store-view-count">
                            <Eye size={13} /> {product.viewCount}
                          </span>
                          <span className="store-detail-cta">
                            Xem chi tiết <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
            {!loading && count > 0 && (
              <Pagination
                totalItems={count}
                page={pagination.page}
                pageSize={12}
                onPageChange={pagination.setPage}
              />
            )}
          </section>
        </>
      )}

      <div className="store-trust-strip">
        Cảm ơn bạn đã tin chọn Máy Tính Store <span>·</span> Cam kết tư vấn minh
        bạch và bảo vệ đầy đủ quyền lợi khách hàng
      </div>

      {showCart && (
        <div
          className="store-drawer-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !submitting)
              setShowCart(false);
          }}
        >
          <aside className="store-cart-drawer" aria-label="Giỏ hàng">
            <header>
              <div>
                <span className="store-kicker">YÊU CẦU MUA HÀNG</span>
                <h2>
                  Giỏ hàng <small>({cart.length})</small>
                </h2>
              </div>
              <button
                className="store-close-button"
                aria-label="Đóng giỏ hàng"
                disabled={submitting}
                onClick={() => setShowCart(false)}
              >
                <X size={19} />
              </button>
            </header>
            {cart.length === 0 ? (
              <div className="store-cart-empty">
                <ShoppingBag size={28} />
                <p>Chưa có sản phẩm nào.</p>
                <a href="/store#products">Tiếp tục xem máy</a>
              </div>
            ) : (
              <>
                <div className="store-cart-items">
                  {cartGroups.map((group) => {
                    const product = group.product;
                    const quantity = group.units.length;
                    const availableCount = products.filter(
                      (candidate) => storeProductKey(candidate) === group.key,
                    ).length;
                    return <article key={group.key}>
                      <img src={productImageFor(product)} alt="" />
                      <span>
                        <strong>{product.modelName}</strong>
                        <small>{product.manufacturer} · {quantity} máy</small>
                        <b>{formatCurrency(product.price)}</b>
                      </span>
                      <div className="store-quantity-controls">
                        <button type="button" aria-label={`Giảm số lượng ${product.modelName}`} onClick={() => {
                          const removeId = group.units[group.units.length - 1].id;
                          setCart((current) => current.filter((item) => item.id !== removeId));
                        }}>−</button>
                        <b aria-label={`Số lượng ${product.modelName}`}>{quantity}</b>
                        <button type="button" aria-label={`Tăng số lượng ${product.modelName}`} disabled={quantity >= availableCount} onClick={() => addToCart(product)}>+</button>
                      </div>
                    </article>;
                  })}
                </div>
                <form
                  className="store-cart-total"
                  onSubmit={(event) => void handleOrderRequest(event)}
                >
                  <fieldset className="store-warranty-options">
                    <legend>Gói bảo hành</legend>
                    <div className="warranty-option-row"><label><input type="radio" name="store-warranty" value="STANDARD" checked={warrantyPlan === 'STANDARD'} onChange={() => setWarrantyPlan('STANDARD')} /><span>Bảo hành thường</span></label><WarrantyInfo plan="STANDARD" scope="store" /></div>
                    <div className="warranty-option-row"><label><input type="radio" name="store-warranty" value="GOLD" checked={warrantyPlan === 'GOLD'} onChange={() => setWarrantyPlan('GOLD')} /><span>Bảo hành vàng · 200.000đ/máy</span></label><WarrantyInfo plan="GOLD" scope="store" /></div>
                  </fieldset>
                  <span>Tạm tính</span>
                  <strong>
                    {formatCurrency(
                      cart.reduce((sum, item) => sum + item.price, 0)
                        + (warrantyPlan === 'GOLD' ? cart.length * 200000 : 0),
                    )}
                  </strong>
                  <p>
                    Sản phẩm và giá được lấy từ kho. Nhân viên xác nhận yêu cầu;
                    chưa thu tiền trực tuyến.
                  </p>
                  {customerSession ? (
                    customerAccount?.phone ? (
                      <p className="store-authenticated-note">
                        Đặt hàng với tài khoản <b>{customerSession.username}</b>{" "}
                        · {customerAccount.phone}
                      </p>
                    ) : (
                      <p className="store-cart-warning">
                        Hãy bổ sung số điện thoại trong{" "}
                        <a href="/store/account">thông tin tài khoản</a> để nhân
                        viên liên hệ.
                      </p>
                    )
                  ) : staffSession?.role === 'ADMIN' ? (
                    <p className="store-authenticated-note">Đặt hàng với tài khoản quản trị <b>{staffSession.username}</b></p>
                  ) : (
                    <p className="store-cart-warning">
                      Bạn cần <a href="/store/login?checkout=1">đăng nhập</a>{" "}
                      hoặc <a href="/store/register?checkout=1">đăng ký</a>{" "}
                      trước khi đặt hàng.
                    </p>
                  )}
                  <button type="submit" disabled={submitting}>
                    {submitting
                      ? "Đang gửi yêu cầu..."
                      : customerSession || staffSession?.role === 'ADMIN'
                        ? "Gửi yêu cầu mua hàng"
                        : "Đăng nhập để tiếp tục"}{" "}
                    <ArrowRight size={16} />
                  </button>
                </form>
              </>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
