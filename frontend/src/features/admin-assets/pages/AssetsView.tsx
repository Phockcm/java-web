import { ChevronDown, ChevronRight, Eye, Laptop, Plus, Search, Trash2 } from 'lucide-react'
import type { Asset, AssetStatus } from '../../../lib/types'
import { formatCurrency, statusLabel, typeLabel } from '../../../utils/formatters'
import { Pagination } from '../../../components/common/Pagination'
import { Fragment, useMemo, useState } from 'react'
import type { TrashRecord } from '../../../lib/types'
import { TrashView } from '../../../components/common/TrashView'
import { ManagementViewToggle } from '../../../components/common/ManagementViewToggle'

interface AssetsViewProps {
  assets: Asset[]
  page: number
  search: string
  status: string
  manufacturer: string
  loading: boolean
  canManage: boolean
  onSearch: (value: string) => void
  onStatus: (value: string) => void
  onManufacturer: (value: string) => void
  onCreate: () => void
  onSelect: (asset: Asset) => void
  onPage: (page: number) => void
  onMoveToTrash: (id: number) => void
  trashItems: TrashRecord[]
  trashLoading: boolean
  onRestoreTrashItem: (id: number) => Promise<void>
  onDeleteTrashItem: (id: number) => Promise<void>
}


function assetGroupKey(asset: Asset) {
  return [asset.manufacturer, asset.modelName, asset.type, asset.processor, asset.memoryGb,
    asset.storage, asset.screenSizeInch, asset.refreshRateHz, asset.usbPorts,
    asset.hasHeadphoneJack, asset.hasDedicatedGraphics, asset.purchaseCost].join('\u0000').toLowerCase()
}

export function AssetsView({ assets, page, search, status, manufacturer, loading, canManage, onSearch, onStatus, onManufacturer, onCreate, onSelect, onPage, onMoveToTrash, trashItems, trashLoading, onRestoreTrashItem, onDeleteTrashItem }: AssetsViewProps) {
  const [showTrash, setShowTrash] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const trashedAssets = trashItems.filter(item => item.type === 'ASSET')
  const manufacturers = useMemo(() => [...new Set(assets.map(asset => asset.manufacturer).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi')), [assets])
  const filteredAssets = useMemo(() => assets.filter(asset => {
    const matchesSearch = !search.trim() || `${asset.assetCode} ${asset.serialNumber ?? ''} ${asset.manufacturer} ${asset.modelName} ${asset.location}`.toLowerCase().includes(search.trim().toLowerCase())
    return matchesSearch && (!status || asset.status === status) && (!manufacturer || asset.manufacturer === manufacturer)
  }), [assets, search, status, manufacturer])
  const groups = useMemo(() => {
    const grouped = new Map<string, { key: string; representative: Asset; assets: Asset[] }>()
    for (const asset of filteredAssets) {
      const key = assetGroupKey(asset)
      const group = grouped.get(key)
      if (group) group.assets.push(asset)
      else grouped.set(key, { key, representative: asset, assets: [asset] })
    }
    return [...grouped.values()]
  }, [filteredAssets])
  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(groups.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const pageGroups = groups.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  return (
    <div className="page-stack">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">QUẢN LÝ THIẾT BỊ</p>
          <h2>Kho máy tính</h2>
          <p className="muted">Kiểm soát tình trạng tồn kho, vị trí lưu kho, xuất kho và bảo trì máy tính.</p>
        </div>
        {canManage && <div className="asset-heading-actions"><button className="button button-primary" onClick={onCreate}><Plus size={17} /> Nhập máy vào kho</button></div>}
      </section>
      {canManage && <ManagementViewToggle archived={showTrash} activeCount={assets.length} archivedCount={trashedAssets.length} onChange={setShowTrash} />}
      {showTrash && canManage ? <TrashView items={trashedAssets} loading={trashLoading} types={['ASSET']} onRestore={onRestoreTrashItem} onDeleteForever={onDeleteTrashItem} /> : <>
      <section className="surface inventory-surface">
        <div className="table-toolbar">
          <label className="search-field"><Search size={17} /><input aria-label="Tìm tài sản trong kho" placeholder="Mã máy, model, vị trí kho..." value={search} onChange={event => onSearch(event.target.value)} /><kbd>/</kbd></label>
          <div className="toolbar-right"><span className="result-count">{filteredAssets.length} máy · {groups.length} nhóm model</span><select aria-label="Lọc hãng" value={manufacturer} onChange={event => onManufacturer(event.target.value)}><option value="">Tất cả hãng</option>{manufacturers.map(brand => <option key={brand} value={brand}>{brand}</option>)}</select><select aria-label="Lọc trạng thái" value={status} onChange={event => onStatus(event.target.value)}><option value="">Tất cả trạng thái</option><option value="AVAILABLE">Trong kho (Sẵn sàng)</option><option value="ASSIGNED">Đã xuất kho</option><option value="MAINTENANCE">Đang bảo trì</option><option value="RETIRED">Đã thanh lý</option><option value="SOLD">Đã bán</option></select></div>
        </div>
        <div className="table-wrap">
          <table className="asset-table"><thead><tr><th>MÃ THIẾT BỊ</th><th>THIẾT BỊ (LAPTOP)</th><th>CẤU HÌNH</th><th>VỊ TRÍ KHO / NGƯỜI NHẬN</th><th>TRẠNG THÁI</th><th><span className="sr-only">Chi tiết</span></th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={6}><div className="table-message">Đang tải danh sách kho...</div></td></tr>}
              {!loading && groups.length === 0 && <tr><td colSpan={6}><div className="table-message">Không tìm thấy thiết bị nào trong kho.</div></td></tr>}
              {!loading && pageGroups.map(group => {
                const asset = group.representative
                const expanded = expandedGroups.has(group.key)
                const statusSummary = Object.entries(group.assets.reduce<Record<string, number>>((counts, item) => {
                  counts[item.status] = (counts[item.status] ?? 0) + 1
                  return counts
                }, {})).map(([assetStatus, quantity]) => `${quantity} ${statusLabel(assetStatus as AssetStatus).toLowerCase()}`).join(' · ')
                return <Fragment key={group.key}>
                  <tr key={group.key} className="asset-group-row">
                    <td><button className="asset-group-toggle" aria-label={`${expanded ? 'Thu gọn' : 'Mở'} ${asset.manufacturer} ${asset.modelName}`} aria-expanded={expanded} onClick={() => setExpandedGroups(current => { const next = new Set(current); expanded ? next.delete(group.key) : next.add(group.key); return next })}>{expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}<strong>{group.assets.length} máy</strong></button></td>
                    <td><span className="device-cell"><span className="device-icon"><Laptop size={16} /></span><span><strong>{asset.manufacturer} {asset.modelName}</strong><small>{typeLabel(asset.type)}</small></span></span></td>
                    <td><span className="cell-primary">{asset.processor || '—'}</span><small className="cell-secondary">{asset.memoryGb ? `${asset.memoryGb} GB RAM` : 'Chưa cập nhật'}{asset.storage ? ` · ${asset.storage}` : ''}</small></td>
                    <td><span className="cell-primary">{statusSummary}</span><small className="cell-secondary">{formatCurrency(asset.purchaseCost)}</small></td>
                    <td><span className="asset-group-count">{group.assets.length} thiết bị</span></td>
                    <td><button className="text-button" onClick={() => setExpandedGroups(current => { const next = new Set(current); expanded ? next.delete(group.key) : next.add(group.key); return next })}>{expanded ? 'Ẩn máy' : 'Quản lý'}</button></td>
                  </tr>
                  {expanded && group.assets.map(item => <tr key={item.id} className="asset-group-detail-row">
                    <td><span className="asset-code">{item.assetCode}</span><small className="cell-secondary">{item.serialNumber || 'Chưa có serial'}</small></td>
                    <td><span className="cell-primary">{item.assigneeName || item.location}</span><small className="cell-secondary">{item.assigneeName ? item.location : 'Chưa bàn giao'}</small></td>
                    <td colSpan={2}><span className={`status-badge status-${item.status.toLowerCase()}`}><span />{statusLabel(item.status as AssetStatus)}</span></td>
                    <td colSpan={2}><div className="asset-row-actions"><button className="icon-button row-action" title="Xem chi tiết" aria-label={`Xem ${item.assetCode}`} onClick={() => onSelect(item)}><Eye size={16} /></button>{canManage && <button className="icon-button row-action trash-row-action" title="Chuyển vào thùng rác" aria-label={`Chuyển ${item.assetCode} vào thùng rác`} onClick={() => { if (window.confirm(`Chuyển thiết bị ${item.assetCode} vào thùng rác?`)) onMoveToTrash(item.id) }}><Trash2 size={15} /></button>}</div></td>
                  </tr>)}
                </Fragment>
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          className="table-footer"
          totalItems={groups.length}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={onPage}
        />
      </section>
      </>}
    </div>
  )
}