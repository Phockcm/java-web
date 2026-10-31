import { Check, CircleAlert, Clock3, RefreshCw, Wrench } from 'lucide-react'
import { useState } from 'react'
import type { CustomerRepairRequestItem, MaintenanceItem } from '../../../lib/types'
import { formatDateTime } from '../../../utils/formatters'

interface MaintenanceViewProps {
  items: MaintenanceItem[]
  loading: boolean
  canResolve: boolean
  onCloseTicket: (id: number, note: string) => Promise<void>
  repairRequests?: CustomerRepairRequestItem[]
  onCloseCustomerRequest?: (id: number, note: string) => Promise<void>
}

export function MaintenanceView({ items, loading, canResolve, onCloseTicket, repairRequests = [], onCloseCustomerRequest }: MaintenanceViewProps) {
  const [notes, setNotes] = useState<Record<number, string>>({})
  const [busyId, setBusyId] = useState<number | null>(null)
  const [busyRepairId, setBusyRepairId] = useState<number | null>(null)
  const [repairNotes, setRepairNotes] = useState<Record<number, string>>({})
  const [error, setError] = useState('')

  async function closeTicket(item: MaintenanceItem) {
    setBusyId(item.id)
    setError('')
    try {
      await onCloseTicket(item.id, notes[item.id] ?? '')
      setNotes(current => ({ ...current, [item.id]: '' }))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể đóng phiếu bảo trì')
    } finally {
      setBusyId(null)
    }
  }

  async function closeRepairRequest(request: CustomerRepairRequestItem) {
    if (!onCloseCustomerRequest) return
    setBusyRepairId(request.id)
    setError('')
    try {
      await onCloseCustomerRequest(request.id, repairNotes[request.id] ?? '')
      setRepairNotes(current => ({ ...current, [request.id]: '' }))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể hoàn tất yêu cầu sửa chữa')
    } finally {
      setBusyRepairId(null)
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading-row maintenance-heading">
        <div>
          <p className="eyebrow">TRUNG TÂM HỖ TRỢ THIẾT BỊ</p>
          <h2>Bảo trì máy tính</h2>
          <p className="muted">{canResolve ? 'Theo dõi sự cố, ghi chú xử lý và hoàn tất yêu cầu bảo trì.' : 'Theo dõi tiến độ các phản hồi bảo trì đã gửi từ kho máy tính.'}</p>
        </div>
        <span className="open-count"><Wrench size={15} /> {items.length + repairRequests.length} yêu cầu đang mở</span>
      </section>
      {error && <p className="form-error" role="alert">{error}</p>}
      <section className={`surface maintenance-surface${canResolve ? '' : ' maintenance-readonly'}`}>
        <div className="maintenance-list-heading">
          <div><span className="maintenance-heading-icon"><Clock3 size={17} /></span><span><strong>Yêu cầu đang mở</strong><small>Các phiếu cần được theo dõi</small></span></div>
          <span className="maintenance-list-count">{items.length} phiếu</span>
        </div>
        <div className="maintenance-table-head"><span>SỰ CỐ / THIẾT BỊ</span><span>THỜI GIAN GHI NHẬN</span>{canResolve && <span>HOÀN TẤT</span>}</div>
        {loading && <div className="table-message">Đang tải phiếu bảo trì...</div>}
        {!loading && items.length === 0 && <div className="maintenance-empty"><span className="empty-icon"><Check size={19} /></span><strong>Không có phiếu bảo trì đang mở</strong><span className="muted">Thiết bị đang hoạt động bình thường.</span></div>}
        {!loading && items.map(item => <article className="maintenance-row" key={item.id}>
          <div className="maintenance-issue"><span className="issue-icon"><CircleAlert size={17} /></span><span><strong>{item.issue}</strong><small>{item.assetCode}</small></span></div>
          <span className="maintenance-time">{formatDateTime(item.openedAt)}</span>
          {canResolve && <div className="maintenance-resolve"><input aria-label={`Ghi chú xử lý ${item.assetCode}`} placeholder="Ghi chú hoàn tất (không bắt buộc)" maxLength={1000} value={notes[item.id] ?? ''} onChange={event => setNotes(current => ({ ...current, [item.id]: event.target.value }))} /><button className="button button-secondary compact-button" disabled={busyId === item.id} onClick={() => void closeTicket(item)}>{busyId === item.id ? <RefreshCw size={15} className="spin" /> : <Check size={15} />} Hoàn tất</button></div>}
        </article>)}
      </section>
      {canResolve && <section className="surface customer-repair-queue">
        <div className="maintenance-list-heading">
          <div><span className="maintenance-heading-icon"><Wrench size={17} /></span><span><strong>Đơn sửa chữa từ khách hàng</strong><small>Yêu cầu gửi từ cửa hàng trực tuyến</small></span></div>
          <span className="maintenance-list-count">{repairRequests.length} phiếu</span>
        </div>
        {loading && <div className="table-message">Đang tải yêu cầu sửa chữa...</div>}
        {!loading && repairRequests.length === 0 && <div className="maintenance-empty"><span className="empty-icon"><Check size={19} /></span><strong>Chưa có yêu cầu sửa chữa từ khách hàng</strong></div>}
        {!loading && repairRequests.map(request => <article className="customer-repair-row" key={request.id}>
          <div className="customer-repair-copy">
            <strong>{request.manufacturer} {request.modelName} · {request.deviceType}</strong>
            <span>{request.issue}</span>
            <small>{request.customerName} (@{request.customerUsername}) · {request.customerPhone}{request.customerEmail ? ` · ${request.customerEmail}` : ''}</small>
            {request.serialNumber && <small>Serial: {request.serialNumber}</small>}
            {request.imageData && <img className="customer-repair-image" src={request.imageData} alt={`Ảnh thiết bị ${request.manufacturer} ${request.modelName}`} />}
            <small>{formatDateTime(request.openedAt)}</small>
          </div>
          <div className="maintenance-resolve">
            <input aria-label={`Ghi chú xử lý yêu cầu ${request.id}`} placeholder="Ghi chú hoàn tất (không bắt buộc)" maxLength={1000} value={repairNotes[request.id] ?? ''} onChange={event => setRepairNotes(current => ({ ...current, [request.id]: event.target.value }))} />
            <button className="button button-secondary compact-button" disabled={busyRepairId === request.id} onClick={() => void closeRepairRequest(request)}>{busyRepairId === request.id ? <RefreshCw size={15} className="spin" /> : <Check size={15} />} Hoàn tất</button>
          </div>
        </article>)}
      </section>}
    </div>
  )
}