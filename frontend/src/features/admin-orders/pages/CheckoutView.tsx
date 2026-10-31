import { useState, useMemo, useEffect } from 'react'
import {
  Laptop, ShoppingCart, Trash2, Plus, CreditCard, Banknote, QrCode,
  User, CheckCircle2, Search, Printer, Receipt, History, AlertCircle, X
} from 'lucide-react'
import type { Asset, Customer, SaleOrder, CartItem, Session, WarrantyPlan } from '../../../lib/types'
import { formatCurrency } from '../../../utils/formatters'
import { api } from '../../../services/api'
import { toDataURL } from 'qrcode'
import { Pagination, usePagination } from '../../../components/common/Pagination'
import { WarrantyInfo } from '../../../components/common/WarrantyInfo'
import { createVietQrPayload } from '../../../utils/vietqr'

function productGroupKey(asset: Asset) {
  return [asset.manufacturer, asset.modelName, asset.type, asset.processor, asset.memoryGb,
    asset.storage, asset.screenSizeInch, asset.refreshRateHz, asset.usbPorts,
    asset.hasHeadphoneJack, asset.hasDedicatedGraphics, asset.purchaseCost ?? 18500000].join('\u0000').toLowerCase()
}

function warrantyTotalForOrder(order: SaleOrder) {
  try {
    const items = JSON.parse(order.itemsJson) as Array<{ warrantyPrice?: number; quantity?: number }>
    return items.reduce((sum, item) => sum + (item.warrantyPrice ?? 0) * (item.quantity ?? 1), 0)
  } catch {
    return 0
  }
}

interface CheckoutViewProps {
  assets: Asset[]
  customers: Customer[]
  session: Session
  initialSelectedAsset?: Asset | null
  initialSelectedCustomer?: Customer | null
  onClearInitialSelection?: () => void
  onOrderCompleted?: () => void
  onMoveOrderToTrash?: (id: number) => Promise<void>
}

export function CheckoutView({
  assets,
  customers,
  session,
  initialSelectedAsset,
  initialSelectedCustomer,
  onClearInitialSelection,
  onOrderCompleted,
  onMoveOrderToTrash,
}: CheckoutViewProps) {
  // Giỏ hàng
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (initialSelectedAsset) {
      return [{
        asset: initialSelectedAsset,
        quantity: 1,
        unitPrice: initialSelectedAsset.purchaseCost || 18500000
      }]
    }
    return []
  })

  // Chọn loại khách hàng: member hoặc guest
  const [customerType, setCustomerType] = useState<'member' | 'guest'>('member')
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>(initialSelectedCustomer?.id ?? '')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerSuggestionsOpen, setCustomerSuggestionsOpen] = useState(false)
  const [guestName, setGuestName] = useState('Khách vãng lai')
  const [guestPhone, setGuestPhone] = useState('')

  // Tìm kiếm sản phẩm bên cột trái
  const [productSearch, setProductSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('ALL')

  // Phương thức thanh toán
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CARD'>('CASH')
  const [cashGiven, setCashGiven] = useState<number | ''>('')
  const [warrantyPlan, setWarrantyPlan] = useState<WarrantyPlan>('STANDARD')
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherDiscount, setVoucherDiscount] = useState(0)
  const [voucherMessage, setVoucherMessage] = useState('')

  // Modal hóa đơn
  const [completedOrder, setCompletedOrder] = useState<SaleOrder | null>(null)
  const [checkoutQr, setCheckoutQr] = useState('')
  const [receiptQr, setReceiptQr] = useState('')
  const [qrError, setQrError] = useState('')
  const [historyOrders, setHistoryOrders] = useState<SaleOrder[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState('')

  async function moveOrderToTrash(order: SaleOrder) {
    if (!onMoveOrderToTrash || !window.confirm(`Chuyển hóa đơn ${order.orderCode} vào thùng rác?`)) return
    try {
      await onMoveOrderToTrash(order.id)
      setHistoryOrders(current => current.filter(item => item.id !== order.id))
      historyPagination.setPage(0)
    } catch (exception) {
      setMessage(exception instanceof Error ? exception.message : 'Không thể chuyển hóa đơn vào thùng rác')
    }
  }

  async function processWebsiteRequest(order: SaleOrder, action: 'complete' | 'cancel') {
    if (session.role !== 'ADMIN') return
    const prompt = action === 'complete'
      ? `Chốt yêu cầu ${order.orderCode}? Các sản phẩm sẽ được đánh dấu đã bán và bị ẩn khỏi cửa hàng.`
      : `Từ chối yêu cầu ${order.orderCode}? Sản phẩm vẫn được giữ trong kho.`
    if (!window.confirm(prompt)) return
    try {
      const updated = action === 'complete'
        ? await api.completeWebsiteRequest(order.id)
        : await api.cancelWebsiteRequest(order.id)
      setHistoryOrders(current => current.map(item => item.id === updated.id ? updated : item))
      setMessage(action === 'complete' ? 'Đã chốt yêu cầu mua hàng.' : 'Đã từ chối yêu cầu mua hàng.')
      onOrderCompleted?.()
    } catch (exception) {
      setMessage(exception instanceof Error ? exception.message : 'Không thể xử lý yêu cầu mua hàng')
    }
  }

  // Lọc sản phẩm sẵn sàng
  const availableAssets = useMemo(() => {
    return assets.filter(a => {
      const matchStatus = a.status === 'AVAILABLE'
      const matchBrand = selectedBrand === 'ALL' || a.manufacturer.toLowerCase() === selectedBrand.toLowerCase()
      const matchSearch = !productSearch.trim() ||
        a.modelName.toLowerCase().includes(productSearch.toLowerCase()) ||
        a.assetCode.toLowerCase().includes(productSearch.toLowerCase()) ||
        a.manufacturer.toLowerCase().includes(productSearch.toLowerCase())
      return matchStatus && matchBrand && matchSearch
    })
  }, [assets, selectedBrand, productSearch])
  const productGroups = useMemo(() => {
    const groups = new Map<string, { key: string; asset: Asset; assets: Asset[] }>()
    for (const asset of availableAssets) {
      const key = productGroupKey(asset)
      const group = groups.get(key)
      if (group) group.assets.push(asset)
      else groups.set(key, { key, asset, assets: [asset] })
    }
    return [...groups.values()]
  }, [availableAssets])
  const cartGroups = useMemo(() => {
    const groups = new Map<string, { key: string; items: CartItem[] }>()
    for (const item of cart) {
      const key = productGroupKey(item.asset)
      const group = groups.get(key)
      if (group) group.items.push(item)
      else groups.set(key, { key, items: [item] })
    }
    return [...groups.values()]
  }, [cart])

  // Khách hàng đã chọn
  const selectedCustomer = useMemo(() => {
    if (customerType === 'guest' || !selectedCustomerId) return null
    return customers.find(c => c.id === Number(selectedCustomerId)) || null
  }, [customerType, selectedCustomerId, customers])
  const matchingCustomers = useMemo(() => {
    const term = customerSearch.trim().toLowerCase()
    return term
      ? customers.filter(customer =>
        customer.fullName.toLowerCase().includes(term) || customer.phone.includes(term))
      : customers
  }, [customers, customerSearch])
  const productPagination = usePagination(productGroups, 8)
  const historyPagination = usePagination(historyOrders)

  async function applyVoucher() {
    if (!voucherCode.trim()) { setVoucherMessage('Nhập mã voucher trước khi áp dụng.'); return }
    try {
      const result = await api.validateVoucher(voucherCode.trim(), Math.max(0, subtotal + warrantyTotal - membershipDiscountAmount))
      setVoucherDiscount(result.discountAmount)
      setVoucherMessage('Đã áp dụng voucher thành công.')
    } catch (exception) {
      setVoucherDiscount(0)
      setVoucherMessage(exception instanceof Error ? exception.message : 'Voucher không hợp lệ')
    }
  }

  // Tỷ lệ giảm giá theo hạng thành viên
  const discountRate = useMemo(() => {
    if (!selectedCustomer) return 0
    if (selectedCustomer.membershipTier === 'GOLD') return 0.10 // Giảm 10%
    if (selectedCustomer.membershipTier === 'SILVER') return 0.05 // Giảm 5%
    if (selectedCustomer.membershipTier === 'BRONZE') return 0.02 // Giảm 2%
    return 0
  }, [selectedCustomer])

  // Tính tiền
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  }, [cart])

  const warrantyTotal = warrantyPlan === 'GOLD'
    ? cart.reduce((sum, item) => sum + item.quantity, 0) * 200000
    : 0

  const membershipDiscountAmount = useMemo(() => {
    return Math.round(subtotal * discountRate)
  }, [subtotal, discountRate])
  const discountAmount = membershipDiscountAmount + voucherDiscount

  const totalAmount = useMemo(() => {
    return Math.max(0, subtotal + warrantyTotal - discountAmount)
  }, [subtotal, warrantyTotal, discountAmount])

  useEffect(() => {
    if (voucherCode) { setVoucherDiscount(0); setVoucherMessage('Giỏ hàng thay đổi, vui lòng áp dụng lại voucher.') }
  }, [subtotal, warrantyTotal, selectedCustomerId])

  useEffect(() => {
    if (paymentMethod !== 'BANK_TRANSFER' || totalAmount <= 0) {
      setCheckoutQr('')
      setQrError('')
      return
    }

    let active = true
    const bankBin = import.meta.env.VITE_VIETQR_BANK_BIN ?? ''
    const accountNumber = import.meta.env.VITE_VIETQR_ACCOUNT_NUMBER ?? ''
    const accountName = import.meta.env.VITE_VIETQR_ACCOUNT_NAME ?? ''
    setCheckoutQr('')
    if (!bankBin || !accountNumber || !accountName) {
      setQrError('Thiếu cấu hình VITE_VIETQR_BANK_BIN, VITE_VIETQR_ACCOUNT_NUMBER hoặc VITE_VIETQR_ACCOUNT_NAME trong file .env.')
      return () => { active = false }
    }

    const reference = `POS${Date.now().toString().slice(-9)}`
    setQrError('')

    try {
      const payload = createVietQrPayload({
        bankBin,
        accountNumber,
        accountName,
        amount: totalAmount,
        transferReference: reference,
      })
      toDataURL(payload, { width: 240, margin: 1, errorCorrectionLevel: 'M' })
        .then(dataUrl => { if (active) setCheckoutQr(dataUrl) })
        .catch(() => {
          if (active) setQrError('Không thể tạo mã QR chuyển khoản. Kiểm tra cấu hình VietQR trong file .env.')
        })
    } catch (exception) {
      setQrError(exception instanceof Error
        ? `${exception.message}. Hãy cấu hình VietQR trong file .env.`
        : 'Cấu hình VietQR trong file .env để tạo mã thanh toán.')
    }

    return () => { active = false }
  }, [paymentMethod, totalAmount])

  const changeAmount = useMemo(() => {
    if (typeof cashGiven !== 'number') return 0
    return Math.max(0, cashGiven - totalAmount)
  }, [cashGiven, totalAmount])

  // Thêm vào giỏ
  function addToCart(asset: Asset) {
    setCart(prev => {
      const existing = prev.find(item => item.asset.id === asset.id)
      if (existing) return prev
      return [...prev, {
        asset,
        quantity: 1,
        unitPrice: asset.purchaseCost || 18500000
      }]
    })
  }

  function removeFromCart(assetId: number) {
    setCart(prev => prev.filter(item => item.asset.id !== assetId))
  }

  function changeProductQuantity(asset: Asset, change: 1 | -1) {
    if (change === -1) {
      const selected = cart.find(item => productGroupKey(item.asset) === productGroupKey(asset))
      if (selected) removeFromCart(selected.asset.id)
      return
    }

    const selectedAssetIds = new Set(cart.map(item => item.asset.id))
    const nextAsset = assets.find(candidate =>
      candidate.status === 'AVAILABLE' &&
      productGroupKey(candidate) === productGroupKey(asset) &&
      !selectedAssetIds.has(candidate.id),
    )
    if (!nextAsset) {
      setMessage(`Không còn máy ${asset.modelName} sẵn sàng trong kho.`)
      return
    }
    addToCart(nextAsset)
  }

  // Xử lý thanh toán
  async function handleCheckout() {
    if (cart.length === 0) {
      setMessage('Giỏ hàng đang trống, vui lòng chọn ít nhất 1 sản phẩm!')
      return
    }

    if (customerType === 'member' && !selectedCustomerId) {
      setMessage('Vui lòng chọn khách hàng thành viên hoặc chuyển sang chế độ Khách vãng lai!')
      return
    }

    if (paymentMethod === 'CASH' && (typeof cashGiven !== 'number' || cashGiven < totalAmount)) {
      setMessage('Số tiền khách đưa chưa đủ để thanh toán hóa đơn!')
      return
    }

    if (paymentMethod === 'BANK_TRANSFER' && !checkoutQr) {
      setMessage(qrError || 'Chưa tạo được mã QR chuyển khoản.')
      return
    }

    setProcessing(true)
    setMessage('')

    try {
      const savedOrder = await api.createOrder({
        customerId: customerType === 'member' ? selectedCustomer?.id ?? null : null,
        guest: customerType === 'guest',
        guestName: guestName || 'Khách vãng lai',
        guestPhone,
        paymentMethod,
        cashReceived: paymentMethod === 'CASH' && typeof cashGiven === 'number' ? cashGiven : null,
        warrantyPlan,
        voucherCode: voucherCode.trim() || undefined,
        items: cart.map(item => ({ assetId: item.asset.id, quantity: 1 as const })),
      })
      if (paymentMethod === 'BANK_TRANSFER') setReceiptQr(checkoutQr)
      setCompletedOrder(savedOrder)
      setCart([])
      setSelectedCustomerId('')
      setCustomerType('member')
      setCustomerSearch('')
      setGuestName('Khách vãng lai')
      setGuestPhone('')
      setCashGiven('')
      setVoucherCode('')
      setVoucherDiscount(0)
      setVoucherMessage('')
      setWarrantyPlan('STANDARD')
      setCheckoutQr('')
      onClearInitialSelection?.()
      if (onOrderCompleted) onOrderCompleted()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Có lỗi khi tạo hóa đơn thanh toán')
    } finally {
      setProcessing(false)
    }
  }

  // Xem lịch sử đơn hàng
  async function loadOrderHistory() {
    try {
      const orders = await api.orders()
      setHistoryOrders(orders)
      historyPagination.setPage(0)
      setShowHistory(true)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không tải được lịch sử đơn hàng')
    }
  }

  return (
    <div className="page-stack checkout-page-container">
      <section className="page-heading-row checkout-heading-row">
        <div>
          <p className="eyebrow">BÁN HÀNG TẠI QUẦY</p>
          <h2>Thanh toán POS</h2>
          <p className="muted">Lập hóa đơn cho máy tính, quản lý khách hàng và phương thức thanh toán.</p>
        </div>
        <div className="pos-actions-header">
          <span className="staff-tag">
            Nhân viên: <strong>{session.displayName} ({session.role})</strong>
          </span>
          <button className="btn-secondary" onClick={loadOrderHistory}>
            <History size={16} /> Lịch sử đơn hàng
          </button>
        </div>
      </section>

      {message && (
        <div className="pos-alert-banner">
          <AlertCircle size={17} />
          <span>{message}</span>
          <button onClick={() => setMessage('')}><X size={15} /></button>
        </div>
      )}

      <div className="pos-split-layout">
        {/* CỘT TRÁI: DANH SÁCH SẢN PHẨM SẴN CÓ ĐỂ CHỌN */}
        <section className="pos-products-column">
          <div className="pos-column-card">
            <div className="pos-search-row">
              <div className="pos-search-input">
                <Search size={16} />
                <input
                  placeholder="Tìm máy theo tên, model, hãng..."
                  value={productSearch}
                  onChange={e => { setProductSearch(e.target.value); productPagination.setPage(0) }}
                />
              </div>

              <select
                className="pos-brand-select"
                value={selectedBrand}
                onChange={e => { setSelectedBrand(e.target.value); productPagination.setPage(0) }}
              >
                <option value="ALL">Tất cả hãng</option>
                {[...new Set(assets.map(asset => asset.manufacturer))].sort().map(manufacturer => (
                  <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
                ))}
              </select>
            </div>

            <div className="pos-products-scroll-grid">
              {availableAssets.length === 0 ? (
                <div className="pos-empty-products">
                  <Laptop size={36} />
                  <p>Không tìm thấy thiết bị nào trong kho sẵn sàng bán</p>
                </div>
              ) : (
                productPagination.pageItems.map(group => (
                  <div key={group.key} className="pos-product-item" onClick={() => changeProductQuantity(group.asset, 1)}>
                    <div className="pos-item-thumb">
                      <Laptop size={26} />
                    </div>
                    <div className="pos-item-details">
                      <div className="pos-item-brand">{group.asset.manufacturer}</div>
                      <div className="pos-item-title" title={group.asset.modelName}>{group.asset.modelName}</div>
                      <div className="pos-item-specs">{group.asset.processor || 'Core i5/i7'} • {group.asset.storage || '512GB'}</div>
                      <div className="pos-item-price">{formatCurrency(group.asset.purchaseCost ?? 18500000)}</div>
                      <div className="pos-item-specs">Còn {group.assets.length} máy</div>
                    </div>
                    <button className="pos-add-btn" title="Thêm một máy vào đơn hàng" aria-label={`Thêm ${group.asset.modelName}`} onClick={event => { event.stopPropagation(); changeProductQuantity(group.asset, 1) }}>
                      <Plus size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            {availableAssets.length > 0 && (
              <Pagination
                totalItems={productGroups.length}
                page={productPagination.page}
                pageSize={8}
                onPageChange={productPagination.setPage}
              />
            )}
          </div>
        </section>

        {/* CỘT PHẢI: GIỎ HÀNG, KHÁCH HÀNG & THANH TOÁN */}
        <section className="pos-cart-column">
          <div className="pos-column-card">
            {/* THÔNG TIN KHÁCH HÀNG */}
            <div className="pos-section-header">
              <User size={18} />
              <h3>Khách hàng</h3>
            </div>

            <div className="customer-type-toggle">
              <button
                type="button"
                className={`type-toggle-btn ${customerType === 'member' ? 'active' : ''}`}
                onClick={() => setCustomerType('member')}
              >
                Khách thành viên (Có tích điểm)
              </button>
              <button
                type="button"
                className={`type-toggle-btn ${customerType === 'guest' ? 'active' : ''}`}
                onClick={() => setCustomerType('guest')}
              >
                Khách vãng lai (Mua nhanh)
              </button>
            </div>

            {customerType === 'member' ? (
              <div className="member-picker-box">
                <input
                  className="customer-select-dropdown"
                  aria-label="Tìm khách hàng thành viên"
                  placeholder="Tìm khách theo tên hoặc số điện thoại..."
                  value={customerSearch}
                  onFocus={() => setCustomerSuggestionsOpen(true)}
                  onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomerId(''); setCustomerSuggestionsOpen(true) }}
                />
                {customerSuggestionsOpen && customerSearch.trim() && <div className="customer-suggestions" role="listbox" aria-label="Khách hàng phù hợp">
                  {matchingCustomers.length === 0 ? <span className="customer-suggestion-empty">Không tìm thấy khách hàng phù hợp.</span> : matchingCustomers.slice(0, 8).map(customer => <button key={customer.id} type="button" role="option" aria-selected={selectedCustomerId === customer.id} onClick={() => {
                    setSelectedCustomerId(customer.id)
                    setCustomerSearch(`${customer.fullName} · ${customer.phone}`)
                    setCustomerSuggestionsOpen(false)
                  }}><strong>{customer.fullName}</strong><span>{customer.phone} · Hạng {customer.membershipTier}</span></button>)}
                </div>}

                {selectedCustomer && (
                  <div className={`selected-member-card tier-${selectedCustomer.membershipTier.toLowerCase()}`}>
                    <div className="member-card-row">
                      <strong>{selectedCustomer.fullName}</strong>
                      <span className={`membership-pill ${selectedCustomer.membershipTier.toLowerCase()}`}>
                        Hạng {selectedCustomer.membershipTier === 'GOLD' ? 'VÀNG (-10%)' : selectedCustomer.membershipTier === 'SILVER' ? 'BẠC (-5%)' : 'ĐỒNG (-2%)'}
                      </span>
                    </div>
                    <div className="member-card-sub">
                      <span>SĐT: {selectedCustomer.phone}</span>
                      <span>Đã chi tiêu: {formatCurrency(selectedCustomer.totalSpent)}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="guest-inputs-box">
                <div className="guest-input-row">
                  <label>Tên khách hàng:</label>
                  <input
                    placeholder="Khách vãng lai..."
                    value={guestName}
                    onChange={e => setGuestName(e.target.value)}
                  />
                </div>
                <div className="guest-input-row">
                  <label>Số điện thoại (tùy chọn):</label>
                    <input
                    placeholder="Nhập SĐT để nhận bảo hành..."
                      inputMode="numeric"
                      maxLength={10}
                      pattern="0[0-9]{9}"
                    value={guestPhone}
                      onChange={e => setGuestPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
              </div>
            )}

            <hr className="pos-divider" />

            {/* GIỎ HÀNG */}
            <div className="pos-section-header">
              <ShoppingCart size={18} />
              <h3>Sản phẩm thanh toán ({cart.reduce((sum, item) => sum + item.quantity, 0)})</h3>
            </div>

            <div className="cart-items-list">
              {cart.length === 0 ? (
                <div className="cart-empty-placeholder">
                  <Laptop size={32} />
                  <p>Chưa có sản phẩm nào được chọn.</p>
                  <small>Chọn sản phẩm từ danh sách bên trái để thêm vào đơn hàng.</small>
                </div>
              ) : (
                cartGroups.map(group => {
                  const item = group.items[0]
                  const quantity = group.items.reduce((sum, selected) => sum + selected.quantity, 0)
                  const availableCount = assets.filter(candidate =>
                    candidate.status === 'AVAILABLE' && productGroupKey(candidate) === group.key,
                  ).length
                  return (
                    <div key={group.key} className="cart-item-row">
                      <div className="cart-item-info">
                        <div className="cart-item-name">{item.asset.modelName}</div>
                        <div className="cart-item-unit">{formatCurrency(item.unitPrice)} / máy</div>
                      </div>

                      <div className="cart-qty-controls">
                        <button type="button" aria-label={`Giảm số lượng ${item.asset.modelName}`} disabled={processing} onClick={() => changeProductQuantity(item.asset, -1)}>−</button>
                        <span className="cart-qty-number" aria-label={`Số lượng ${item.asset.modelName}`}>{quantity}</span>
                        <button type="button" aria-label={`Tăng số lượng ${item.asset.modelName}`} disabled={processing || quantity >= availableCount} onClick={() => changeProductQuantity(item.asset, 1)}>+</button>
                      </div>

                      <div className="cart-item-sum">
                        {formatCurrency(quantity * item.unitPrice)}
                      </div>

                      <button
                        className="cart-remove-btn"
                        title="Xóa sản phẩm"
                        onClick={() => setCart(current => current.filter(selected => !group.items.some(cartItem => cartItem.asset.id === selected.asset.id)))}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <hr className="pos-divider" />

            <fieldset className="pos-warranty-options">
              <legend>Gói bảo hành cho đơn này</legend>
              <div className="warranty-option-row"><label><input type="radio" name="pos-warranty" value="STANDARD" checked={warrantyPlan === 'STANDARD'} onChange={() => setWarrantyPlan('STANDARD')} /><span>Bảo hành thường</span></label><WarrantyInfo plan="STANDARD" scope="pos" /></div>
              <div className="warranty-option-row"><label><input type="radio" name="pos-warranty" value="GOLD" checked={warrantyPlan === 'GOLD'} onChange={() => setWarrantyPlan('GOLD')} /><span>Bảo hành vàng · 200.000đ/máy</span></label><WarrantyInfo plan="GOLD" scope="pos" /></div>
            </fieldset>

            {/* PHƯƠNG THỨC THANH TOÁN */}
            <div className="pos-section-header">
              <CreditCard size={18} />
              <h3>Phương thức thanh toán</h3>
            </div>

            <div className="payment-method-selector">
              <button
                type="button"
                className={`pm-btn ${paymentMethod === 'CASH' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('CASH')}
              >
                <Banknote size={16} /> Tiền mặt
              </button>
              <button
                type="button"
                className={`pm-btn ${paymentMethod === 'BANK_TRANSFER' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('BANK_TRANSFER')}
              >
                <QrCode size={16} /> Chuyển khoản QR
              </button>
              <button
                type="button"
                className={`pm-btn ${paymentMethod === 'CARD' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('CARD')}
              >
                <CreditCard size={16} /> Quẹt thẻ POS
              </button>
            </div>

            <div className="pos-voucher-box">
              <label>Voucher khuyến mại</label>
              <div className="pos-voucher-row">
                <input value={voucherCode} onChange={e => { setVoucherCode(e.target.value.toUpperCase()); setVoucherDiscount(0); setVoucherMessage('') }} placeholder="NHAP MA VOUCHER" />
                <button type="button" className="button button-secondary compact-button" onClick={() => void applyVoucher()}>Áp dụng</button>
              </div>
              {voucherMessage && <small className={voucherDiscount > 0 ? 'brand-management-message' : 'form-error'}>{voucherMessage}</small>}
            </div>

            {/* TÍNH TOÁN VÀ TIỀN THỐI */}
            <div className="pos-calc-box">
              <div className="calc-row">
                <span>Tạm tính ({cart.reduce((a, b) => a + b.quantity, 0)} sản phẩm):</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>

              {membershipDiscountAmount > 0 && (
                <div className="calc-row discount-row">
                  <span>Ưu đãi thành viên ({discountRate * 100}%):</span>
                  <span>- {formatCurrency(membershipDiscountAmount)}</span>
                </div>
              )}
              {voucherDiscount > 0 && (
                <div className="calc-row discount-row">
                  <span>Voucher {voucherCode || ''}:</span>
                  <span>- {formatCurrency(voucherDiscount)}</span>
                </div>
              )}

              {warrantyTotal > 0 && (
                <div className="calc-row">
                  <span>Phí bảo hành vàng:</span>
                  <span>{formatCurrency(warrantyTotal)}</span>
                </div>
              )}

              <div className="calc-row total-row">
                <span>TỔNG THANH TOÁN:</span>
                <span className="final-price">{formatCurrency(totalAmount)}</span>
              </div>

              {paymentMethod === 'CASH' && (
                <div className="cash-input-group">
                  <div className="calc-row">
                    <label>Tiền khách đưa (VNĐ):</label>
                    <input
                      type="number"
                      placeholder="Nhập số tiền khách trả..."
                      value={cashGiven}
                      onChange={e => setCashGiven(e.target.value ? Number(e.target.value) : '')}
                    />
                  </div>
                  {typeof cashGiven === 'number' && cashGiven >= totalAmount && (
                    <div className="calc-row change-row">
                      <span>Tiền thối lại cho khách:</span>
                      <strong>{formatCurrency(changeAmount)}</strong>
                    </div>
                  )}
                </div>
              )}

              {paymentMethod === 'BANK_TRANSFER' && totalAmount > 0 && (
                <div className="qr-preview-box" aria-live="polite">
                  {checkoutQr
                    ? <img className="payment-qr-image" src={checkoutQr} alt={`QR chuyển khoản VietQR ${formatCurrency(totalAmount)}`} />
                    : <p className="qr-error-message">{qrError || 'Đang tạo mã QR chuyển khoản...'}</p>}
                </div>
              )}
            </div>

            {/* NÚT HOÀN TẤT THANH TOÁN */}
            <button
              className="btn-complete-checkout"
              disabled={cart.length === 0 || processing || (paymentMethod === 'BANK_TRANSFER' && !checkoutQr)}
              onClick={handleCheckout}
            >
              <CheckCircle2 size={19} />
              <span>{processing
                ? 'Đang xuất hóa đơn...'
                : paymentMethod === 'BANK_TRANSFER'
                  ? `Xác nhận đã nhận chuyển khoản ${formatCurrency(totalAmount)}`
                  : `Thanh toán ${formatCurrency(totalAmount)}`}</span>
            </button>
          </div>
        </section>
      </div>

      {/* MODAL HÓA ĐƠN XUẤT SAU KHI THANH TOÁN */}
      {completedOrder && (
        <div className="modal-backdrop">
          <div className="receipt-modal-card">
            <div className="receipt-header">
              <div className="store-brand">
                <Laptop size={28} />
                <h2>HỆ THỐNG MÁY TÍNH & LAPTOP</h2>
              </div>
              <p className="receipt-tagline">HÓA ĐƠN BÁN HÀNG KIÊM PHIẾU BẢO HÀNH</p>
              <div className="receipt-code-pill">Mã HĐ: {completedOrder.orderCode}</div>
            </div>

            <div className="receipt-meta-grid">
              <div><span>Ngày lập:</span> <strong>{new Date().toLocaleString('vi-VN')}</strong></div>
              <div><span>Nhân viên:</span> <strong>{completedOrder.cashierName}</strong></div>
              <div><span>Khách hàng:</span> <strong>{completedOrder.customerName} {completedOrder.isGuest ? '(Vãng lai)' : ''}</strong></div>
              <div><span>Số điện thoại:</span> <strong>{completedOrder.customerPhone || 'N/A'}</strong></div>
              <div><span>Phương thức:</span> <strong>{completedOrder.paymentMethod === 'CASH' ? 'Tiền mặt' : completedOrder.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản QR' : 'Thẻ POS'}</strong></div>
            </div>

            <hr className="receipt-dashed" />

            {completedOrder.paymentMethod === 'BANK_TRANSFER' && (
              <div className="receipt-invoice-qr">
                {receiptQr && <img src={receiptQr} alt="QR chuyển khoản VietQR trên hóa đơn" />}
              </div>
            )}

            <table className="receipt-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th>
                  <th style={{ textAlign: 'center' }}>SL</th>
                  <th style={{ textAlign: 'right' }}>Đơn giá</th>
                  <th style={{ textAlign: 'right' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {JSON.parse(completedOrder.itemsJson || '[]').map((it: any, idx: number) => (
                  <tr key={idx}>
                    <td>
                      <strong>{it.modelName}</strong>
                      <div className="receipt-serial-note">Mã: {it.assetCode} · {it.warrantyPlan === 'GOLD' ? 'Bảo hành vàng · 12 tháng' : 'Bảo hành thường · 2 tháng'}</div>
                    </td>
                    <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(it.unitPrice)}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <hr className="receipt-dashed" />

            <div className="receipt-summary">
              <div className="receipt-sum-line">
                <span>Tạm tính sản phẩm:</span>
                <span>{formatCurrency(completedOrder.subtotal)}</span>
              </div>
              {(() => {
                const warrantyTotal = warrantyTotalForOrder(completedOrder)
                return warrantyTotal > 0 ? <div className="receipt-sum-line"><span>Phí bảo hành vàng:</span><span>{formatCurrency(warrantyTotal)}</span></div> : null
              })()}
              {completedOrder.discountAmount > 0 && (
                <div className="receipt-sum-line discount">
                  <span>Chiết khấu thành viên:</span>
                  <span>- {formatCurrency(completedOrder.discountAmount)}</span>
                </div>
              )}
              <div className="receipt-sum-line total">
                <span>TỔNG CỘNG ĐÃ THANH TOÁN:</span>
                <span>{formatCurrency(completedOrder.totalAmount)}</span>
              </div>
            </div>

            <div className="receipt-footer-notes">
              <p>Cảm ơn quý khách đã tin tưởng mua sắm!</p>
              <small>Bảo hành theo gói đã chọn cho từng sản phẩm trên hóa đơn.</small>
            </div>

            <div className="receipt-actions-bar">
              <button className="btn-print" onClick={() => window.print()}>
                <Printer size={16} /> In hóa đơn
              </button>
              <button className="btn-primary" onClick={() => setCompletedOrder(null)}>
                Đóng & Tạo đơn tiếp theo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM LỊCH SỬ ĐƠN HÀNG */}
      {showHistory && (
        <div className="modal-backdrop">
          <div className="history-modal-card">
            <div className="modal-header">
            <h2><History size={20} /> Đơn hàng & yêu cầu website ({historyOrders.length})</h2>
              <button className="close-btn" onClick={() => setShowHistory(false)}><X size={18} /></button>
            </div>
            <div className="history-table-container">
              {historyOrders.length === 0 ? (
                <div className="empty-history"><Receipt size={32} /><p>Chưa có hóa đơn nào được tạo</p></div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã HĐ</th>
                      <th>Khách hàng</th>
                      <th>Nhân viên</th>
                      <th>Trạng thái</th>
                      <th>Phương thức</th>
                      <th>Thời gian</th>
                      <th style={{ textAlign: 'right' }}>Tổng tiền</th>
                      <th>Yêu cầu</th>
                      {onMoveOrderToTrash && <th><span className="sr-only">Thao tác</span></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {historyPagination.pageItems.map(ord => (
                      <tr key={ord.id}>
                        <td><strong>{ord.orderCode}</strong></td>
                        <td>
                          {ord.customerName} {ord.isGuest ? <span className="guest-badge">Vãng lai</span> : ''}
                          <div className="sub-text">{ord.customerPhone}</div>
                        </td>
                        <td>{ord.cashierName}</td>
                        <td><span className={`order-status order-status-${(ord.orderStatus || 'COMPLETED').toLowerCase()}`}>{ord.orderStatus === 'PENDING' ? 'Chờ xác nhận' : ord.orderStatus === 'CANCELLED' ? 'Đã từ chối' : ord.paymentMethod === 'PENDING' ? 'Đã xác nhận' : 'Đã hoàn tất'}</span></td>
                        <td>{ord.paymentMethod === 'PENDING' ? 'Yêu cầu website' : ord.paymentMethod === 'CASH' ? 'Tiền mặt' : ord.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Thẻ'}</td>
                        <td>{new Date(ord.createdAt).toLocaleString('vi-VN')}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-primary)' }}>
                          {formatCurrency(ord.totalAmount)}
                        </td>
                        <td>{ord.orderStatus === 'PENDING' && session.role === 'ADMIN' && <div className="website-order-actions"><button className="button button-primary compact-button" onClick={() => void processWebsiteRequest(ord, 'complete')}>Chốt đơn</button><button className="button button-danger-quiet compact-button" onClick={() => void processWebsiteRequest(ord, 'cancel')}>Từ chối</button></div>}</td>
                        {onMoveOrderToTrash && <td><button className="icon-button trash-row-action" title="Chuyển hóa đơn vào thùng rác" aria-label={`Chuyển ${ord.orderCode} vào thùng rác`} onClick={() => void moveOrderToTrash(ord)}><Trash2 size={15} /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {historyOrders.length > 0 && (
                <Pagination
                  totalItems={historyOrders.length}
                  page={historyPagination.page}
                  pageSize={10}
                  onPageChange={historyPagination.setPage}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
