import { ArrowLeft, ArrowRight, Check, CreditCard, Headphones, Laptop, Monitor, PackageCheck, ShieldCheck, ShoppingBag, UserRound, Wrench } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../../../services/api'
import type { CustomerAccount, CustomerRepairRequestInput, CustomerRepairRequestItem, CustomerSession, SaleOrder, Session, StoreProduct } from '../../../../lib/types'
import { formatCurrency, productImageFor } from '../../../../utils/formatters'

type AuthMode = 'login' | 'register'

async function loginStaffFromStore(username: string, password: string): Promise<Session | null> {
  try {
    return await api.login(username, password)
  } catch {
    return null
  }
}

interface StoreAuthPageProps {
  mode: AuthMode
  onAuthenticated: (session: CustomerSession, isRegistration: boolean) => void
}

export function StoreAuthPage({ mode, onAuthenticated }: StoreAuthPageProps) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isRegister = mode === 'register'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (isRegister) {
        onAuthenticated(await api.registerStoreAccount({
          username: username.trim(),
          displayName: displayName.trim(),
          password,
        }), true)
        return
      }
      try {
        onAuthenticated(await api.loginStoreAccount(username.trim(), password), false)
      } catch (customerError) {
        const staffSession = await loginStaffFromStore(username.trim(), password)
        if (!staffSession) throw customerError
        localStorage.setItem('asset-manager-session', JSON.stringify(staffSession))
        window.location.href = '/store'
      }
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể xác thực tài khoản')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="store-account-page">
      <a className="store-back-link" href="/store"><ArrowLeft size={15} /> Trở về cửa hàng</a>
      <form className="store-account-card" onSubmit={event => void submit(event)}>
        <span className="store-account-icon"><UserRound size={21} /></span>
        <p className="store-kicker">{isRegister ? 'TÀI KHOẢN KHÁCH HÀNG' : 'CHÀO MỪNG TRỞ LẠI'}</p>
        <h1>{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</h1>
        <p className="store-account-intro">{isRegister ? 'Đăng ký để lưu thông tin và gửi yêu cầu mua hàng.' : 'Đăng nhập để tiếp tục với giỏ hàng của bạn.'}</p>
        {isRegister && <label><span>Họ và tên</span><input autoComplete="name" value={displayName} onChange={event => setDisplayName(event.target.value)} required maxLength={120} /></label>}
        <label><span>Tên tài khoản</span><input autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} required minLength={3} maxLength={80} pattern="[A-Za-z0-9._-]+" title="Dùng chữ cái, số, dấu chấm, gạch ngang hoặc gạch dưới" /></label>
        <label><span>Mật khẩu</span><input type="password" autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={isRegister ? 6 : undefined} maxLength={72} /></label>
        {isRegister && <small className="store-account-hint">Email và số điện thoại có thể bổ sung sau trong trang thông tin tài khoản.</small>}
        {error && <p className="store-cart-error" role="alert">{error}</p>}
        <button className="store-account-submit" type="submit" disabled={busy}>{busy ? 'Đang xử lý...' : isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập'} <ArrowRight size={16} /></button>
        <p className="store-account-switch">{isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <a href={`${isRegister ? '/store/login' : '/store/register'}${window.location.search}`}>{isRegister ? 'Đăng nhập' : 'Đăng ký'}</a></p>
      </form>
    </section>
  )
}

interface StoreProfilePageProps {
  session: CustomerSession | null
  account: CustomerAccount | null
  orders: SaleOrder[]
  loading: boolean
  error: string
  onSave: (account: CustomerAccount) => void
  onLogout: () => void
}

interface StaffAccountDetailsPageProps {
  session: Session
  onLogout: () => void
}

const staffRoleLabels: Record<Session['role'], string> = {
  ADMIN: 'Quản trị viên',
  STAFF: 'Nhân viên',
  FIXER: 'Kỹ thuật viên bảo trì',
}

export function StaffAccountDetailsPage({ session, onLogout }: StaffAccountDetailsPageProps) {
  return (
    <section className="store-account-page">
      <a className="store-back-link" href="/store"><ArrowLeft size={15} /> Trở về cửa hàng</a>
      <div className="store-profile-layout">
        <aside className="store-profile-aside">
          <span className="store-profile-avatar">{session.displayName.charAt(0).toUpperCase()}</span>
          <p className="store-kicker">TÀI KHOẢN NHÂN VIÊN</p>
          <h1>{session.displayName}</h1>
          <span className="store-profile-username">@{session.username}</span>
          <button className="store-logout-button" onClick={onLogout}>Đăng xuất</button>
        </aside>
        <section className="store-profile-form" aria-labelledby="staff-account-details-title">
          <p className="store-kicker">CHI TIẾT TÀI KHOẢN</p>
          <h2 id="staff-account-details-title">Thông tin tài khoản</h2>
          <p className="store-account-intro">Thông tin tài khoản nhân viên đang đăng nhập.</p>
          <dl className="store-account-details-list">
            <div><dt>Tên đăng nhập</dt><dd>@{session.username}</dd></div>
            <div><dt>Họ và tên</dt><dd>{session.displayName}</dd></div>
            <div><dt>Vai trò</dt><dd>{staffRoleLabels[session.role]}</dd></div>
          </dl>
        </section>
      </div>
    </section>
  )
}

export function StoreProfilePage({ session, account, orders, loading, error: initialError, onSave, onLogout }: StoreProfilePageProps) {
  const [displayName, setDisplayName] = useState(account?.displayName ?? '')
  const [email, setEmail] = useState(account?.email ?? '')
  const [phone, setPhone] = useState(account?.phone ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!account) return
    setDisplayName(account.displayName)
    setEmail(account.email ?? '')
    setPhone(account.phone ?? '')
  }, [account])

  if (!session) {
    return <section className="store-account-page"><div className="store-account-card store-account-message"><span className="store-account-icon"><UserRound size={21} /></span><h1>Đăng nhập tài khoản</h1><p>Đăng nhập để xem và cập nhật thông tin cá nhân.</p><a className="store-account-submit" href="/store/login">Đăng nhập <ArrowRight size={16} /></a></div></section>
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const updated = await api.updateStoreAccount({ displayName: displayName.trim(), email: email.trim(), phone: phone.trim() })
      onSave(updated)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể cập nhật tài khoản')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="store-account-page">
      <a className="store-back-link" href="/store"><ArrowLeft size={15} /> Trở về cửa hàng</a>
      <div className="store-profile-layout">
        <aside className="store-profile-aside"><span className="store-profile-avatar">{session.displayName.charAt(0).toUpperCase()}</span><p className="store-kicker">TÀI KHOẢN KHÁCH</p><h1>{session.displayName}</h1><span className="store-profile-username">@{session.username}</span><button className="store-logout-button" onClick={onLogout}>Đăng xuất</button></aside>
        <form className="store-profile-form" onSubmit={event => void submit(event)}>
          <p className="store-kicker">CHI TIẾT TÀI KHOẢN</p><h2>Thông tin tài khoản</h2><p className="store-account-intro">Xem và cập nhật thông tin cá nhân; đăng xuất khỏi tài khoản tại khung bên cạnh.</p>
          {loading && <p className="store-account-hint">Đang tải hồ sơ...</p>}
          {initialError && <p className="store-cart-error" role="alert">{initialError}</p>}
          <label><span>Tên tài khoản</span><input value={session.username} disabled /></label>
          <label><span>Họ và tên</span><input autoComplete="name" value={displayName} onChange={event => setDisplayName(event.target.value)} required maxLength={120} /></label>
          <label><span>Email</span><input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} maxLength={120} pattern="[A-Za-z0-9._%+-]+@gmail\.com" title="Vui lòng nhập địa chỉ Gmail hợp lệ" placeholder="ten@gmail.com" /></label>
          <label><span>Số điện thoại</span><input type="tel" inputMode="numeric" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))} maxLength={10} pattern="0[0-9]{9}" title="Số điện thoại gồm 10 chữ số và bắt đầu bằng 0" placeholder="09xxxxxxxx" /></label>
          {error && <p className="store-cart-error" role="alert">{error}</p>}
          <button className="store-account-submit" type="submit" disabled={busy || loading}>{busy ? 'Đang lưu...' : 'Lưu thông tin'} <Check size={16} /></button>
          <section className="store-order-history" aria-labelledby="store-order-history-title">
            <h3 id="store-order-history-title">Đơn hàng đã gửi ({orders.length})</h3>
            {orders.length === 0 ? <p className="store-account-hint">Tài khoản này chưa gửi đơn hàng nào.</p> : orders.map(order => <article key={order.id}>
              <span><strong>{order.orderCode}</strong><small>{new Date(order.createdAt).toLocaleString('vi-VN')} · {order.orderStatus === 'PENDING' ? 'Chờ xác nhận' : order.orderStatus === 'CANCELLED' ? 'Đã từ chối' : 'Đã hoàn tất'}</small></span>
              <b>{formatCurrency(order.totalAmount)}</b>
              <a href={`/store/receipt/${order.orderCode}`}>Xem hóa đơn</a>
            </article>)}
          </section>
        </form>
      </div>
    </section>
  )
}

interface StoreProductDetailPageProps {
  product: StoreProduct | null
  loading: boolean
  onAddToCart: (product: StoreProduct) => void
}

function specification(value: string | number | null | undefined, suffix = '') {
  return value === null || value === undefined || value === '' ? 'Không áp dụng' : `${value}${suffix}`
}

const productStatusLabels: Record<StoreProduct['status'], string> = {
  AVAILABLE: 'Còn hàng',
  ASSIGNED: 'Đã bàn giao',
  MAINTENANCE: 'Đang bảo trì',
  RETIRED: 'Ngừng kinh doanh',
  SOLD: 'Đã bán',
}

export function StoreProductDetailPage({ product, loading, onAddToCart }: StoreProductDetailPageProps) {
  if (loading) return <section className="store-product-detail-page"><p className="store-state-card">Đang tải thông tin sản phẩm...</p></section>
  if (!product) return <section className="store-product-detail-page"><a className="store-back-link" href="/store"><ArrowLeft size={15} /> Trở về cửa hàng</a><p className="store-state-card">Sản phẩm không còn sẵn sàng hoặc không tồn tại.</p></section>

  const image = productImageFor(product)

  return (
    <section className="store-product-detail-page">
      <a className="store-back-link" href="/store#products"><ArrowLeft size={15} /> Trở về danh sách sản phẩm</a>
      <div className="store-product-detail">
        <div className="store-detail-photo"><img src={image} alt={`${product.manufacturer} ${product.modelName}`} /></div>
        <div className="store-detail-copy">
          <span className="store-product-type">{product.manufacturer} · {product.type}</span>
          <h1>{product.modelName}</h1>
          <span className={`store-stock-state ${product.status === 'AVAILABLE' ? 'available' : ''}`}>{productStatusLabels[product.status]}</span>
          <p className="store-detail-price">{formatCurrency(product.price)}</p>
          <dl className="store-spec-grid">
            <div><dt><Laptop size={15} /> Bộ xử lý</dt><dd>{specification(product.processor)}</dd></div>
            <div><dt><PackageCheck size={15} /> RAM</dt><dd>{specification(product.memoryGb, ' GB')}</dd></div>
            <div><dt><PackageCheck size={15} /> Bộ nhớ lưu trữ</dt><dd>{specification(product.storage)}</dd></div>
            <div><dt><Monitor size={15} /> Màn hình</dt><dd>{specification(product.screenSizeInch, ' inch')}</dd></div>
            <div><dt><Monitor size={15} /> Tần số quét</dt><dd>{specification(product.refreshRateHz, ' Hz')}</dd></div>
            <div><dt><CreditCard size={15} /> Cổng USB</dt><dd>{specification(product.usbPorts)}</dd></div>
            <div><dt><Headphones size={15} /> Jack tai nghe</dt><dd>{product.hasHeadphoneJack == null ? 'Không áp dụng' : product.hasHeadphoneJack ? 'Có' : 'Không'}</dd></div>
            <div><dt><ShieldCheck size={15} /> Card đồ họa rời</dt><dd>{product.hasDedicatedGraphics == null ? 'Không áp dụng' : product.hasDedicatedGraphics ? 'Có' : 'Không'}</dd></div>
          </dl>
          <button className="store-detail-add-button" disabled={product.status !== 'AVAILABLE'} onClick={() => onAddToCart(product)}>
            <ShoppingBag size={17} /> {product.status === 'AVAILABLE' ? 'Thêm vào giỏ hàng' : 'Sản phẩm hiện không có sẵn'}
          </button>
        </div>
      </div>
    </section>
  )
}

interface StoreReceiptPageProps {
  order: SaleOrder | null
  loading: boolean
  error: string
}

export function StoreReceiptPage({ order, loading, error }: StoreReceiptPageProps) {
  if (loading) return <section className="store-account-page"><p className="store-state-card">Đang tải hóa đơn...</p></section>
  if (!order) return <section className="store-account-page"><p className="store-state-card" role="alert">{error || 'Không tìm thấy hóa đơn.'}</p></section>

  let items: Array<{ modelName: string; assetCode: string; quantity: number; unitPrice: number; warrantyPlan?: string; warrantyPrice?: number; total: number }> = []
  try {
    items = JSON.parse(order.itemsJson)
  } catch {
    items = []
  }

  return (
    <section className="store-account-page">
      <a className="store-back-link" href="/store"><ArrowLeft size={15} /> Trở về cửa hàng</a>
      <article className="store-receipt-card">
        <p className="store-kicker">HÓA ĐƠN BÁN HÀNG</p>
        <h1>{order.orderCode}</h1>
        <dl className="store-receipt-meta">
          <div><dt>Khách hàng</dt><dd>{order.customerName}</dd></div>
          <div><dt>Số điện thoại</dt><dd>{order.customerPhone || 'Chưa cung cấp'}</dd></div>
          <div><dt>Ngày tạo</dt><dd>{new Date(order.createdAt).toLocaleString('vi-VN')}</dd></div>
          <div><dt>Trạng thái</dt><dd>{order.orderStatus === 'PENDING' ? 'Chờ xác nhận' : order.orderStatus === 'CANCELLED' ? 'Đã từ chối' : 'Đã hoàn tất'}</dd></div>
        </dl>
        <div className="store-receipt-lines">
          {items.map((item, index) => <div className="store-receipt-line" key={`${item.assetCode}-${index}`}>
            <span><strong>{item.modelName}</strong><small>{item.assetCode} · SL {item.quantity}{item.warrantyPlan === 'GOLD' ? ' · Bảo hành vàng · 12 tháng' : ' · Bảo hành thường · 2 tháng'}</small></span>
            <b>{formatCurrency(item.total)}</b>
          </div>)}
        </div>
        <div className="store-receipt-total"><span>Tổng cộng</span><strong>{formatCurrency(order.totalAmount)}</strong></div>
        <p className="store-account-hint">Lưu lại đường dẫn hóa đơn để xem lại thông tin trên điện thoại.</p>
      </article>
    </section>
  )
}

interface StoreRepairPageProps {
  session: CustomerSession | null
  account: CustomerAccount | null
  accountLoading: boolean
  accountError: string
  staffSession?: Session | null
}

export function StoreRepairPage({ session, account, accountLoading, accountError, staffSession }: StoreRepairPageProps) {
  const [customerPhone, setCustomerPhone] = useState('')
  const [deviceType, setDeviceType] = useState('Laptop')
  const [manufacturer, setManufacturer] = useState('')
  const [modelName, setModelName] = useState('')
  const [serialNumber, setSerialNumber] = useState('')
  const [issue, setIssue] = useState('')
  const [imageData, setImageData] = useState('')
  const [repairHistory, setRepairHistory] = useState<CustomerRepairRequestItem[]>([])
  const [error, setError] = useState('')
  const [submittedId, setSubmittedId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!session) return
    api.storeRepairRequests().then(setRepairHistory).catch(exception =>
      setError(exception instanceof Error ? exception.message : 'Không tải được lịch sử sửa chữa'),
    )
  }, [session])

  if (!session && !staffSession) {
    return <section className="store-repair-page">
      <a className="store-back-link" href="/store"><ArrowLeft size={15} /> Trở về cửa hàng</a>
      <div className="store-repair-card store-repair-gate">
        <span className="store-account-icon"><Wrench size={21} /></span>
        <p className="store-kicker">DỊCH VỤ SỬA CHỮA</p>
        <h1>Đăng nhập để gửi yêu cầu</h1>
        <p className="store-account-intro">Đăng nhập tài khoản khách hàng để đội bảo trì tiếp nhận và liên hệ sửa chữa.</p>
        <a className="store-account-submit" href="/store/login?repair=1">Đăng nhập <ArrowRight size={16} /></a>
      </div>
    </section>
  }

  if (session && accountLoading) {
    return <section className="store-repair-page"><p className="store-state-card">Đang tải thông tin liên hệ...</p></section>
  }

  if (session && !account?.phone) {
    return <section className="store-repair-page">
      <a className="store-back-link" href="/store"><ArrowLeft size={15} /> Trở về cửa hàng</a>
      <div className="store-repair-card store-repair-gate">
        <span className="store-account-icon"><Wrench size={21} /></span>
        <p className="store-kicker">DỊCH VỤ SỬA CHỮA</p>
        <h1>Bổ sung số điện thoại</h1>
        <p className="store-account-intro">Đội bảo trì cần số điện thoại để liên hệ về yêu cầu sửa chữa.</p>
        {accountError && <p className="store-cart-error" role="alert">{accountError}</p>}
        <a className="store-account-submit" href="/store/account">Cập nhật thông tin <ArrowRight size={16} /></a>
      </div>
    </section>
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const request: CustomerRepairRequestInput = {
        deviceType,
        manufacturer: manufacturer.trim(),
        modelName: modelName.trim(),
        serialNumber: serialNumber.trim() || undefined,
        issue: issue.trim(),
        ...(imageData ? { imageData } : {}),
        ...(staffSession ? { customerPhone: customerPhone.trim() } : {}),
      }
      const result = await api.createStoreRepairRequest(request)
      setSubmittedId(result.id)
      setRepairHistory(current => [result, ...current])
      setManufacturer('')
      setModelName('')
      setSerialNumber('')
      setIssue('')
      setImageData('')
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không gửi được yêu cầu sửa chữa')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="store-repair-page">
      <a className="store-back-link" href="/store"><ArrowLeft size={15} /> Trở về cửa hàng</a>
      <form className="store-repair-card" onSubmit={event => void submit(event)}>
        <p className="store-kicker">DỊCH VỤ BẢO TRÌ</p>
        <h1>Gửi yêu cầu sửa chữa</h1>
        <p className="store-account-intro">Đội kỹ thuật sẽ tiếp nhận thông tin và liên hệ với bạn qua số điện thoại bên dưới.</p>
        {session ? (
          <div className="store-repair-contact"><UserRound size={16} /><span><strong>{account?.displayName}</strong><small>{account?.phone}</small></span><a href="/store/account">Sửa thông tin</a></div>
        ) : (
          <label><span>Số điện thoại khách hàng</span><input value={customerPhone} onChange={event => setCustomerPhone(event.target.value)} required maxLength={20} placeholder="Nhập số điện thoại đã đăng ký" /></label>
        )}
        <label><span>Loại thiết bị</span><select value={deviceType} onChange={event => setDeviceType(event.target.value)}><option>Laptop</option><option>Máy tính để bàn</option><option>Màn hình</option><option>Thiết bị khác</option></select></label>
        <div className="store-repair-fields">
          <label><span>Hãng sản xuất</span><input value={manufacturer} onChange={event => setManufacturer(event.target.value)} required maxLength={100} placeholder="Ví dụ: Dell" /></label>
          <label><span>Tên model</span><input value={modelName} onChange={event => setModelName(event.target.value)} required maxLength={120} placeholder="Ví dụ: Inspiron 15" /></label>
        </div>
        <label><span>Số serial <small>(không bắt buộc)</small></span><input value={serialNumber} onChange={event => setSerialNumber(event.target.value)} maxLength={100} /></label>
        <label><span>Mô tả lỗi <b>*</b></span><textarea value={issue} onChange={event => setIssue(event.target.value)} required maxLength={1000} rows={4} placeholder="Mô tả tình trạng máy và thời điểm phát sinh..." /></label>
        <label><span>Ảnh thiết bị <small>(không bắt buộc, tối đa 2 MB)</small></span><input type="file" accept="image/*" onChange={event => {
          const file = event.target.files?.[0]
          if (!file) return
          if (file.size > 2 * 1024 * 1024) {
            setError('Ảnh tải lên không được vượt quá 2 MB.')
            event.target.value = ''
            return
          }
          const reader = new FileReader()
          reader.onload = () => setImageData(typeof reader.result === 'string' ? reader.result : '')
          reader.readAsDataURL(file)
        }} /></label>
        {imageData && <div className="store-repair-image-preview"><img src={imageData} alt="Ảnh thiết bị đính kèm" /><button type="button" className="text-button" onClick={() => setImageData('')}>Gỡ ảnh</button></div>}
        {error && <p className="store-cart-error" role="alert">{error}</p>}
        {submittedId !== null && <p className="store-repair-success" role="status"><Check size={16} /> Đã gửi yêu cầu #{submittedId}. Đội bảo trì sẽ sớm liên hệ.</p>}
        <button className="store-account-submit" type="submit" disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi yêu cầu sửa chữa'} <ArrowRight size={16} /></button>
      </form>
      <section className="store-repair-history" aria-labelledby="repair-history-title">
        <h2 id="repair-history-title">Lịch sử yêu cầu sửa chữa ({repairHistory.length})</h2>
        {repairHistory.length === 0 ? <p className="store-account-hint">Bạn chưa gửi yêu cầu sửa chữa nào.</p> : repairHistory.map(request => <article key={request.id}>
          <div><strong>{request.manufacturer} {request.modelName}</strong><span>{request.issue}</span><small>{new Date(request.openedAt).toLocaleString('vi-VN')} · {request.status === 'OPEN' ? 'Đang xử lý' : 'Đã hoàn tất'}</small>{request.resolutionNote && <small>Kết quả: {request.resolutionNote}</small>}</div>
          {request.imageData && <img src={request.imageData} alt="Ảnh thiết bị đã gửi" />}
        </article>)}
      </section>
    </section>
  )
}
