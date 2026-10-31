import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { Asset, AssetInput, AssetType } from '../../../lib/types'
import { typeLabel } from '../../../utils/formatters'

interface AssetFormModalProps {
  asset: Asset | null
  onClose: () => void
  onSave: (input: AssetInput) => Promise<void>
}

const emptyAsset: AssetInput = {
  assetCode: '', serialNumber: '', type: 'DESKTOP', manufacturer: '', modelName: '', processor: '',
  memoryGb: null, storage: '', screenSizeInch: null, refreshRateHz: null, usbPorts: '',
  hasHeadphoneJack: null, hasDedicatedGraphics: null, purchaseDate: null, warrantyUntil: null, purchaseCost: null,
  location: '', notes: '',
}

export function AssetFormModal({ asset, onClose, onSave }: AssetFormModalProps) {
  const [form, setForm] = useState<AssetInput>(asset ? {
    assetCode: asset.assetCode, serialNumber: asset.serialNumber ?? '', type: asset.type,
    manufacturer: asset.manufacturer, modelName: asset.modelName, processor: asset.processor ?? '',
    memoryGb: asset.memoryGb, storage: asset.storage ?? '', screenSizeInch: asset.screenSizeInch,
    refreshRateHz: asset.refreshRateHz, usbPorts: asset.usbPorts ?? '',
    hasHeadphoneJack: asset.hasHeadphoneJack, hasDedicatedGraphics: asset.hasDedicatedGraphics,
    purchaseDate: asset.purchaseDate,
    warrantyUntil: asset.warrantyUntil, purchaseCost: asset.purchaseCost, location: asset.location,
    notes: asset.notes ?? '',
  } : emptyAsset)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function update<K extends keyof AssetInput>(key: K, value: AssetInput[K]) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không lưu được tài sản')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal-card asset-form-modal" role="dialog" aria-modal="true" aria-labelledby="asset-form-title">
        <header className="modal-header"><div><p className="eyebrow">HỒ SƠ THIẾT BỊ</p><h2 id="asset-form-title">{asset ? 'Cập nhật tài sản' : 'Thêm tài sản mới'}</h2></div><button className="icon-button" aria-label="Đóng" onClick={onClose}><X size={19} /></button></header>
        <form onSubmit={submit}>
          <div className="form-grid">
            <label><span>Mã tài sản <b>*</b></span><input value={form.assetCode} onChange={event => update('assetCode', event.target.value)} required maxLength={40} /></label>
            <label><span>Số serial</span><input value={form.serialNumber} onChange={event => update('serialNumber', event.target.value)} maxLength={100} /></label>
            <label><span>Loại thiết bị <b>*</b></span><select value={form.type} onChange={event => update('type', event.target.value as AssetType)}>{(['DESKTOP', 'LAPTOP', 'MONITOR', 'PRINTER', 'OTHER'] as AssetType[]).map(type => <option key={type} value={type}>{typeLabel(type)}</option>)}</select></label>
            <label><span>Hãng sản xuất <b>*</b></span><input value={form.manufacturer} onChange={event => update('manufacturer', event.target.value)} required maxLength={100} /></label>
            <label className="span-2"><span>Tên model <b>*</b></span><input value={form.modelName} onChange={event => update('modelName', event.target.value)} required maxLength={120} /></label>
            <label className="span-2"><span>Bộ xử lý</span><input value={form.processor} onChange={event => update('processor', event.target.value)} maxLength={300} /></label>
            <label><span>RAM (GB)</span><input type="number" min="0" value={form.memoryGb ?? ''} onChange={event => update('memoryGb', event.target.value ? Number(event.target.value) : null)} /></label>
            <label><span>Lưu trữ</span><input placeholder="512 GB SSD" value={form.storage} onChange={event => update('storage', event.target.value)} maxLength={120} /></label>
            <label><span>Màn hình (inch)</span><input type="number" min="0" step="0.1" value={form.screenSizeInch ?? ''} onChange={event => update('screenSizeInch', event.target.value ? Number(event.target.value) : null)} /></label>
            <label><span>Tần số quét (Hz)</span><input type="number" min="0" value={form.refreshRateHz ?? ''} onChange={event => update('refreshRateHz', event.target.value ? Number(event.target.value) : null)} /></label>
            <label className="span-2"><span>Cổng USB</span><input placeholder="2 × USB-A, 2 × USB-C" value={form.usbPorts} onChange={event => update('usbPorts', event.target.value)} maxLength={300} /></label>
            <label><span>Jack tai nghe</span><select value={form.hasHeadphoneJack === null ? '' : String(form.hasHeadphoneJack)} onChange={event => update('hasHeadphoneJack', event.target.value === '' ? null : event.target.value === 'true')}><option value="">Không áp dụng</option><option value="true">Có</option><option value="false">Không</option></select></label>
            <label><span>Card đồ họa rời</span><select value={form.hasDedicatedGraphics === null ? '' : String(form.hasDedicatedGraphics)} onChange={event => update('hasDedicatedGraphics', event.target.value === '' ? null : event.target.value === 'true')}><option value="">Không áp dụng</option><option value="true">Có</option><option value="false">Không</option></select></label>
            <label><span>Ngày mua</span><input type="date" value={form.purchaseDate ?? ''} onChange={event => update('purchaseDate', event.target.value || null)} /></label>
            <label><span>Bảo hành đến</span><input type="date" value={form.warrantyUntil ?? ''} onChange={event => update('warrantyUntil', event.target.value || null)} /></label>
            <label><span>Nguyên giá (VND)</span><input type="number" min="0" step="1000" value={form.purchaseCost ?? ''} onChange={event => update('purchaseCost', event.target.value ? Number(event.target.value) : null)} /></label>
            <label><span>Vị trí <b>*</b></span><input value={form.location} onChange={event => update('location', event.target.value)} required maxLength={120} /></label>
            <label className="span-2"><span>Ghi chú</span><textarea rows={3} value={form.notes} onChange={event => update('notes', event.target.value)} maxLength={1000} /></label>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <footer className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Hủy</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu tài sản'}</button></footer>
        </form>
      </section>
    </div>
  )
}