import { useEffect, useMemo, useState } from 'react'
import { FileText, History, Search, Trash2 } from 'lucide-react'
import type { SaleOrder, TrashRecord } from '../../../lib/types'
import { api } from '../../../services/api'
import { formatCurrency } from '../../../utils/formatters'
import { Pagination, usePagination } from '../../../components/common/Pagination'
import { ManagementViewToggle } from '../../../components/common/ManagementViewToggle'
import { TrashView } from '../../../components/common/TrashView'

interface OrderManagementViewProps {
  refreshKey: number
  trashItems: TrashRecord[]
  trashLoading: boolean
  onMoveOrderToTrash: (id: number) => Promise<void>
  onRestoreTrashItem: (id: number) => Promise<void>
  onDeleteTrashItem: (id: number) => Promise<void>
  onOrderChanged: () => void
}

export function OrderManagementView({
  refreshKey,
  trashItems,
  trashLoading,
  onMoveOrderToTrash,
  onRestoreTrashItem,
  onDeleteTrashItem,
  onOrderChanged,
}: OrderManagementViewProps) {
  const [orders, setOrders] = useState<SaleOrder[]>([])
  const [searchPhone, setSearchPhone] = useState('')
  const [showTrash, setShowTrash] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const orderTrash = trashItems.filter(item => item.type === 'ORDER')
  const filteredOrders = useMemo(() => {
    const digits = searchPhone.replace(/\D/g, '')
    return orders.filter(order => !digits || (order.customerPhone ?? '').replace(/\D/g, '').includes(digits))
  }, [orders, searchPhone])
  const pagination = usePagination(filteredOrders, 10)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    api.orders()
      .then(result => { if (active) setOrders(result) })
      .catch(exception => {
        if (active) setError(exception instanceof Error ? exception.message : 'Không tải được danh sách hóa đơn')
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [refreshKey])

  async function moveToTrash(order: SaleOrder) {
    if (!window.confirm(`Chuyển hóa đơn ${order.orderCode} vào thùng rác?`)) return
    setBusyId(order.id)
    setError('')
    try {
      await onMoveOrderToTrash(order.id)
      setOrders(current => current.filter(item => item.id !== order.id))
      setMessage(`Đã chuyển hóa đơn ${order.orderCode} vào thùng rác.`)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể chuyển hóa đơn vào thùng rác')
    } finally {
      setBusyId(null)
    }
  }

  async function processWebsiteRequest(order: SaleOrder, action: 'complete' | 'cancel') {
    const prompt = action === 'complete'
      ? `Chốt yêu cầu ${order.orderCode}? Các sản phẩm sẽ được đánh dấu đã bán và bị ẩn khỏi cửa hàng.`
      : `Từ chối yêu cầu ${order.orderCode}? Sản phẩm vẫn được giữ trong kho.`
    if (!window.confirm(prompt)) return
    setBusyId(order.id)
    setError('')
    try {
      const updated = action === 'complete'
        ? await api.completeWebsiteRequest(order.id)
        : await api.cancelWebsiteRequest(order.id)
      setOrders(current => current.map(item => item.id === updated.id ? updated : item))
      setMessage(action === 'complete' ? 'Đã chốt yêu cầu mua hàng.' : 'Đã từ chối yêu cầu mua hàng.')
      onOrderChanged()
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể xử lý yêu cầu mua hàng')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="page-stack order-management-view">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">BÁN HÀNG & ĐƠN ĐẶT TỪ SHOP</p>
          <h2>Quản lý đơn hàng</h2>
          <p className="muted">Tra cứu hóa đơn theo số điện thoại, xử lý yêu cầu đặt hàng từ cửa hàng trực tuyến.</p>
        </div>
      </section>

      <ManagementViewToggle
        archived={showTrash}
        activeCount={orders.length}
        archivedCount={orderTrash.length}
        onChange={setShowTrash}
      />

      {showTrash ? (
        <TrashView
          items={orderTrash}
          loading={trashLoading}
          types={['ORDER']}
          onRestore={onRestoreTrashItem}
          onDeleteForever={onDeleteTrashItem}
        />
      ) : (
        <section className="surface inventory-surface order-management-surface">
          <div className="table-toolbar">
            <label className="search-field order-phone-search">
              <Search size={17} />
              <input
                aria-label="Tìm hóa đơn theo số điện thoại"
                inputMode="tel"
                placeholder="Nhập số điện thoại khách hàng..."
                value={searchPhone}
                onChange={event => { setSearchPhone(event.target.value); pagination.setPage(0) }}
              />
            </label>
            <span className="result-count">{filteredOrders.length} hóa đơn</span>
          </div>
          {error && <p className="form-error order-list-error" role="alert">{error}</p>}
          {message && <p className="brand-management-message order-list-message" role="status">{message}</p>}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>MÃ HÓA ĐƠN</th>
                  <th>KHÁCH HÀNG</th>
                  <th>NHÂN VIÊN</th>
                  <th>TRẠNG THÁI</th>
                  <th>PHƯƠNG THỨC</th>
                  <th>THỜI GIAN</th>
                  <th style={{ textAlign: 'right' }}>TỔNG TIỀN</th>
                  <th>YÊU CẦU SHOP</th>
                  <th><span className="sr-only">Thao tác</span></th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={9}><div className="table-message">Đang tải hóa đơn...</div></td></tr>}
                {!loading && filteredOrders.length === 0 && (
                  <tr><td colSpan={9}><div className="table-message">{searchPhone ? 'Không tìm thấy hóa đơn theo số điện thoại này.' : 'Chưa có hóa đơn nào.'}</div></td></tr>
                )}
                {!loading && pagination.pageItems.map(order => (
                  <tr key={order.id}>
                    <td><strong>{order.orderCode}</strong></td>
                    <td>
                      <span className="cell-primary">{order.customerName}{order.isGuest ? ' · Vãng lai' : ''}</span>
                      <small className="cell-secondary">{order.customerPhone || 'Không có số điện thoại'}</small>
                    </td>
                    <td>{order.cashierName}</td>
                    <td><span className={`order-status order-status-${(order.orderStatus || 'COMPLETED').toLowerCase()}`}>{order.orderStatus === 'PENDING' ? 'Chờ xác nhận' : order.orderStatus === 'CANCELLED' ? 'Đã từ chối' : 'Đã hoàn tất'}</span></td>
                    <td>{order.paymentMethod === 'PENDING' ? 'Đặt hàng từ shop' : order.paymentMethod === 'CASH' ? 'Tiền mặt' : order.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Thẻ'}</td>
                    <td>{new Date(order.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="order-total-cell">{formatCurrency(order.totalAmount)}</td>
                    <td>
                      {order.orderStatus === 'PENDING' && <div className="website-order-actions">
                        <button className="button button-primary compact-button" disabled={busyId === order.id} onClick={() => void processWebsiteRequest(order, 'complete')}>Chốt đơn</button>
                        <button className="button button-danger-quiet compact-button" disabled={busyId === order.id} onClick={() => void processWebsiteRequest(order, 'cancel')}>Từ chối</button>
                      </div>}
                    </td>
                    <td>
                      <button
                        className="icon-button trash-row-action"
                        title="Chuyển hóa đơn vào thùng rác"
                        aria-label={`Chuyển ${order.orderCode} vào thùng rác`}
                        disabled={busyId === order.id}
                        onClick={() => void moveToTrash(order)}
                      ><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && filteredOrders.length > 0 && (
            <Pagination totalItems={filteredOrders.length} page={pagination.page} pageSize={10} onPageChange={pagination.setPage} />
          )}
          {!loading && filteredOrders.length === 0 && !searchPhone && <div className="order-empty-hint"><FileText size={22} /><span>Hóa đơn bán hàng và đơn khách đặt từ shop sẽ xuất hiện tại đây.</span><History size={16} /></div>}
        </section>
      )}
    </div>
  )
}
