import { useMemo, useState } from 'react'
import { Plus, Search, Ticket, Trash2 } from 'lucide-react'
import type { Voucher } from '../../../lib/types'
import { formatCurrency } from '../../../utils/formatters'

interface Props {
  vouchers: Voucher[]
  loading: boolean
  onCreate: (voucher: Omit<Voucher, 'id' | 'usedCount'>) => Promise<void>
  onUpdate: (id: number, voucher: Omit<Voucher, 'id' | 'usedCount'>) => Promise<void>
  onDelete: (id: number) => Promise<void>
}

const empty = { code: '', type: 'PERCENT' as const, value: 10, minimumOrder: 0, usageLimit: 100, validFrom: '', validUntil: '', active: true }

export function VouchersView({ vouchers, loading, onCreate, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Voucher | null>(null)
  const [form, setForm] = useState<Omit<Voucher, 'id' | 'usedCount'>>(empty)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [showEditor, setShowEditor] = useState(false)

  const filtered = useMemo(() => vouchers.filter(v => v.code.toLowerCase().includes(search.toLowerCase()) || (v.type ?? '').toLowerCase().includes(search.toLowerCase())), [vouchers, search])
  function openCreate() { setEditing(null); setForm(empty); setError(''); setShowEditor(true) }
  function openEdit(voucher: Voucher) { setEditing(voucher); setForm({ code: voucher.code, type: voucher.type, value: voucher.value, minimumOrder: voucher.minimumOrder, usageLimit: voucher.usageLimit, validFrom: voucher.validFrom, validUntil: voucher.validUntil, active: voucher.active }); setError(''); setShowEditor(true) }
  async function submit() {
    if (!form.code.trim() || !form.validFrom || !form.validUntil) { setError('Vui lòng nhập mã và ngày hiệu lực.'); return }
    setBusy(true); setError('')
    try { editing ? await onUpdate(editing.id, form) : await onCreate(form); setEditing(null); setForm(empty); setShowEditor(false) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Không lưu được voucher') }
    finally { setBusy(false) }
  }

  return <div className="page-stack">
    <section className="page-heading-row"><div><p className="eyebrow">KHUYẾN MẠI</p><h2>Voucher giảm giá</h2><p className="muted">Tạo mã giảm theo phần trăm hoặc số tiền, kèm điều kiện đơn tối thiểu.</p></div><button className="button button-primary" onClick={openCreate}><Plus size={15}/> Thêm voucher</button></section>
    {error && <p className="form-error" role="alert">{error}</p>}
    <section className="surface inventory-surface">
      <div className="table-toolbar"><label className="search-field"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã hoặc loại voucher..."/></label><span className="result-count">{filtered.length} mã</span></div>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>MÃ</th><th>GIÁ TRỊ</th><th>ĐƠN TỐI THIỂU</th><th>LƯỢT DÙNG</th><th>HIỆU LỰC</th><th>TRẠNG THÁI</th><th></th></tr></thead>
        <tbody>{loading && <tr><td colSpan={7}><div className="table-message">Đang tải voucher...</div></td></tr>}{!loading && filtered.map(v => <tr key={v.id}><td><strong><Ticket size={14}/> {v.code}</strong></td><td>{v.type === 'PERCENT' ? `${v.value}%` : formatCurrency(v.value)}</td><td>{formatCurrency(v.minimumOrder)}</td><td>{v.usedCount}/{v.usageLimit}</td><td>{v.validFrom} → {v.validUntil}</td><td><span className={`status-badge ${v.active ? 'status-available' : 'status-retired'}`}>{v.active ? 'Đang bật' : 'Đã tắt'}</span></td><td><button className="text-button" onClick={() => openEdit(v)}>Sửa</button><button className="icon-button" title="Xóa voucher" onClick={() => onDelete(v.id)}><Trash2 size={15}/></button></td></tr>)}{!loading && filtered.length === 0 && <tr><td colSpan={7}><div className="table-message">Chưa có voucher phù hợp.</div></td></tr>}</tbody></table></div>
    </section>
    {showEditor && <section className="surface voucher-editor"><div className="section-heading"><div><p className="eyebrow">THÔNG TIN KHUYẾN MẠI</p><h3>{editing ? 'Cập nhật voucher' : 'Tạo voucher mới'}</h3></div><button className="icon-button" onClick={() => { setEditing(null); setForm(empty); setError(''); setShowEditor(false) }}>×</button></div><div className="form-grid"><label>Mã voucher<input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase()})} /></label><label>Loại<select value={form.type} onChange={e => setForm({...form, type: e.target.value as 'PERCENT'|'FIXED'})}><option value="PERCENT">Giảm theo phần trăm</option><option value="FIXED">Giảm số tiền cố định</option></select></label><label>Giá trị<input type="number" min="0.01" value={form.value} onChange={e => setForm({...form, value: Number(e.target.value)})}/></label><label>Đơn tối thiểu<input type="number" min="0" value={form.minimumOrder} onChange={e => setForm({...form, minimumOrder: Number(e.target.value)})}/></label><label>Giới hạn lượt dùng<input type="number" min="1" value={form.usageLimit} onChange={e => setForm({...form, usageLimit: Number(e.target.value)})}/></label><label>Từ ngày<input type="date" value={form.validFrom} onChange={e => setForm({...form, validFrom: e.target.value})}/></label><label>Đến ngày<input type="date" value={form.validUntil} onChange={e => setForm({...form, validUntil: e.target.value})}/></label><label><input type="checkbox" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})}/> Đang hoạt động</label></div><button className="button button-primary" disabled={busy} onClick={() => void submit()}>{busy ? 'Đang lưu...' : 'Lưu voucher'}</button></section>}
  </div>
}
