import { useMemo, useState, type FormEvent } from 'react'
import { ArchiveRestore, Edit2, Laptop, Plus, ShoppingCart, Search, Cpu, HardDrive, Layers, Eye, Tag, Trash2, X } from 'lucide-react'
import type { Asset, ProductBrand, TrashRecord } from '../../../lib/types'
import { formatCurrency, productImageFor } from '../../../utils/formatters'
import { Pagination, usePagination } from '../../../components/common/Pagination'
import { TrashView } from '../../../components/common/TrashView'

interface BrandCatalogViewProps {
  assets: Asset[]
  brands: ProductBrand[]
  loading: boolean
  onSelectForCheckout: (asset: Asset) => void
  onViewDetail: (asset: Asset) => void
  trashItems: TrashRecord[]
  trashLoading: boolean
  onCreateBrand: (name: string) => Promise<void>
  onUpdateBrand: (id: number, name: string) => Promise<void>
  onMoveBrandToTrash: (id: number) => Promise<void>
  onRestoreTrashItem: (id: number) => Promise<void>
  onDeleteTrashItem: (id: number) => Promise<void>
}

export function BrandCatalogView({
  assets, brands, loading, onSelectForCheckout, onViewDetail,
  trashItems, trashLoading, onCreateBrand, onUpdateBrand, onMoveBrandToTrash,
  onRestoreTrashItem, onDeleteTrashItem,
}: BrandCatalogViewProps) {
  const [selectedBrand, setSelectedBrand] = useState('Tất cả')
  const [searchTerm, setSearchTerm] = useState('')
  const [manageOpen, setManageOpen] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const [brandName, setBrandName] = useState('')
  const [editingBrand, setEditingBrand] = useState<ProductBrand | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const activeTrashCount = trashItems.filter(item => item.type === 'BRAND').length

  const filteredAssets = assets.filter(item => {
    const matchesBrand = selectedBrand === 'Tất cả' || item.manufacturer.toLowerCase() === selectedBrand.toLowerCase()
    const term = searchTerm.trim().toLowerCase()
    const matchesSearch = !term || item.modelName.toLowerCase().includes(term) ||
      item.assetCode.toLowerCase().includes(term) || item.manufacturer.toLowerCase().includes(term)
    return matchesBrand && matchesSearch
  })
  const productGroups = useMemo(() => {
    const groups = new Map<string, { key: string; asset: Asset; assets: Asset[] }>()
    for (const asset of filteredAssets) {
      const key = [asset.manufacturer, asset.modelName, asset.type, asset.processor, asset.memoryGb,
        asset.storage, asset.screenSizeInch, asset.refreshRateHz, asset.usbPorts,
        asset.hasHeadphoneJack, asset.hasDedicatedGraphics, asset.purchaseCost].join('\u0000').toLowerCase()
      const group = groups.get(key)
      if (group) group.assets.push(asset)
      else groups.set(key, { key, asset, assets: [asset] })
    }
    return [...groups.values()]
  }, [filteredAssets])
  const pagination = usePagination(productGroups, 9)
  const brandCounts = useMemo(() => {
    const counts = new Map(brands.map(brand => [brand.name, 0]))
    for (const asset of assets) counts.set(asset.manufacturer, (counts.get(asset.manufacturer) ?? 0) + 1)
    for (const brand of brands) {
      const trashedCount = trashItems.filter(item =>
        item.type === 'ASSET' && item.summary.toLowerCase().startsWith(`${brand.name.toLowerCase()} `),
      ).length
      counts.set(brand.name, (counts.get(brand.name) ?? 0) + trashedCount)
    }
    return counts
  }, [assets, brands, trashItems])

  function beginEdit(brand: ProductBrand) {
    setEditingBrand(brand)
    setBrandName(brand.name)
    setMessage('')
  }

  function resetForm() {
    setEditingBrand(null)
    setBrandName('')
  }

  async function saveBrand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = brandName.trim()
    if (!name) {
      setMessage('Vui lòng nhập tên hãng.')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      if (editingBrand) {
        await onUpdateBrand(editingBrand.id, name)
        if (selectedBrand === editingBrand.name) setSelectedBrand(name)
      } else await onCreateBrand(name)
      resetForm()
      setMessage(editingBrand ? 'Đã cập nhật hãng sản phẩm.' : 'Đã thêm hãng sản phẩm.')
    } catch (exception) {
      setMessage(exception instanceof Error ? exception.message : 'Không thể lưu hãng sản phẩm.')
    } finally {
      setSaving(false)
    }
  }

  async function moveBrandToTrash(brand: ProductBrand) {
    if (!window.confirm(`Chuyển hãng "${brand.name}" vào thùng rác? Các sản phẩm hiện có được giữ nguyên.`)) return
    setMessage('')
    try {
      await onMoveBrandToTrash(brand.id)
      if (selectedBrand === brand.name) setSelectedBrand('Tất cả')
      setMessage(`Đã chuyển hãng ${brand.name} vào thùng rác.`)
    } catch (exception) {
      setMessage(exception instanceof Error ? exception.message : 'Không thể chuyển hãng vào thùng rác.')
    }
  }

  return (
    <div className="page-stack brand-catalog-view">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">QUẢN LÝ DANH MỤC</p>
          <h2>Danh mục thương hiệu & Sản phẩm</h2>
          <p className="muted">Quản lý hãng và khám phá các dòng sản phẩm trong kho.</p>
        </div>
        <div className="catalog-header-actions">
          <button className="button button-secondary" onClick={() => { setManageOpen(value => !value); setTrashOpen(false); setMessage('') }}>
            <Tag size={16} /> {manageOpen ? 'Đóng quản lý danh mục' : 'Quản lý danh mục'}
          </button>
          <button className="button button-secondary" onClick={() => { setTrashOpen(value => !value); setManageOpen(false); setMessage('') }}>
            <ArchiveRestore size={16} /> Thùng rác ({activeTrashCount})
          </button>
          {!manageOpen && !trashOpen && <div className="catalog-search-bar">
            <Search size={16} />
            <input
              aria-label="Tìm sản phẩm trong danh mục"
              placeholder="Tìm theo tên máy, hãng, mã sản phẩm..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); pagination.setPage(0) }}
            />
          </div>}
        </div>
      </section>

      {manageOpen ? (
        <section className="surface brand-management-panel">
          <div className="brand-management-heading">
            <div><h2>Quản lý hãng sản phẩm</h2><p>Chỉ có thể chuyển hãng vào thùng rác khi không còn sản phẩm trong kho hoặc thùng rác.</p></div>
            <button type="button" className="icon-action-btn" aria-label="Đóng quản lý danh mục" onClick={() => { setManageOpen(false); resetForm() }}><X size={17} /></button>
          </div>
          <form className="brand-management-form" onSubmit={event => void saveBrand(event)}>
            <label htmlFor="product-brand-name">{editingBrand ? `Sửa hãng: ${editingBrand.name}` : 'Tên hãng mới'}</label>
            <input id="product-brand-name" maxLength={100} value={brandName} onChange={event => setBrandName(event.target.value)} placeholder="Ví dụ: Dell, Lenovo, MSI..." />
            <button className="button button-primary" type="submit" disabled={saving}>{editingBrand ? <Edit2 size={15} /> : <Plus size={16} />}{saving ? 'Đang lưu...' : editingBrand ? 'Lưu thay đổi' : 'Thêm hãng'}</button>
            {editingBrand && <button className="button button-secondary" type="button" onClick={resetForm}>Hủy sửa</button>}
          </form>
          {message && <p className="brand-management-message" role="status">{message}</p>}
          {brands.length === 0 ? <div className="trash-empty"><Tag size={28} /><strong>Chưa có hãng sản phẩm</strong><span>Thêm hãng đầu tiên bằng biểu mẫu phía trên.</span></div> : (
            <div className="brand-management-list">
              {brands.map(brand => (
                <article className="brand-management-row" key={brand.id}>
                  <span className="brand-management-name"><Tag size={16} /><strong>{brand.name}</strong><small>{brandCounts.get(brand.name) ?? 0} sản phẩm</small></span>
                  <div className="brand-management-actions">
                    <button className="button button-secondary compact-button" onClick={() => beginEdit(brand)}><Edit2 size={14} /> Sửa</button>
                    <button
                      className="button button-danger-quiet compact-button"
                      disabled={(brandCounts.get(brand.name) ?? 0) > 0}
                      title={(brandCounts.get(brand.name) ?? 0) > 0 ? 'Hãy xóa hoặc chuyển toàn bộ sản phẩm của hãng vào thùng rác trước.' : 'Chuyển hãng vào thùng rác'}
                      onClick={() => void moveBrandToTrash(brand)}
                    ><Trash2 size={14} /> Xóa</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : trashOpen ? (
        <TrashView items={trashItems} loading={trashLoading} types={['BRAND']} onRestore={onRestoreTrashItem} onDeleteForever={onDeleteTrashItem} />
      ) : (
        <>
          <div className="brand-pills-container">
            {['Tất cả', ...brands.map(brand => brand.name)].map(brand => (
              <button
                key={brand}
                className={`brand-pill-btn ${selectedBrand === brand ? 'active' : ''}`}
                onClick={() => { setSelectedBrand(brand); pagination.setPage(0) }}
              >
                <Laptop size={15} />
                <span>{brand}</span>
                <span className="brand-count-badge">{brand === 'Tất cả' ? assets.length : brandCounts.get(brand) ?? 0}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-card"><div className="loading-dot" /> Đang tải danh mục sản phẩm...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="empty-catalog-card">
              <Laptop size={48} className="empty-icon" />
              <h3>Không tìm thấy sản phẩm phù hợp</h3>
              <p>Thử tìm kiếm với từ khóa khác hoặc chuyển sang thương hiệu khác.</p>
            </div>
          ) : (
            <div className="product-cards-grid">
              {pagination.pageItems.map(group => {
                const asset = group.asset
                const availableCount = group.assets.filter(item => item.status === 'AVAILABLE').length
                const isAvailable = availableCount > 0
                return (
                  <div key={group.key} className="product-catalog-card">
                    <div className="card-top-badge">
                      <span className="brand-tag">{asset.manufacturer}</span>
                      <span className={`status-badge-mini ${isAvailable ? 'available' : 'busy'}`}>{availableCount} máy còn hàng</span>
                    </div>
                    <div className="product-hero-icon">
                      <img className="product-brand-image" src={productImageFor({ manufacturer: asset.manufacturer, type: asset.type })} alt={`${asset.manufacturer} ${asset.modelName}`} loading="lazy" />
                      <span className="product-code-tag">{group.assets.length} máy · {asset.assetCode}</span>
                    </div>
                    <div className="product-main-info">
                      <h3 className="product-model-name" title={asset.modelName}>{asset.modelName}</h3>
                      <div className="product-specs-list">
                        <div className="spec-item"><Cpu size={13} /> <span>{asset.processor || 'Intel Core / Apple M'}</span></div>
                        <div className="spec-item"><Layers size={13} /> <span>{asset.memoryGb ? `${asset.memoryGb} GB RAM` : '16 GB RAM'}</span></div>
                        <div className="spec-item"><HardDrive size={13} /> <span>{asset.storage || '512 GB SSD'}</span></div>
                      </div>
                    </div>
                    <div className="product-card-footer">
                      <div className="price-box"><span className="price-label">Giá niêm yết</span><span className="price-value">{formatCurrency(asset.purchaseCost)}</span></div>
                      <div className="card-actions">
                        <button className="icon-action-btn" title="Xem chi tiết cấu hình" onClick={() => onViewDetail(asset)}><Eye size={16} /></button>
                        <button className="btn-add-checkout" disabled={!isAvailable} onClick={() => onSelectForCheckout(asset)} title={isAvailable ? 'Chọn mua sản phẩm này' : 'Sản phẩm tạm thời hết trong kho'}>
                          <ShoppingCart size={15} /><span>{isAvailable ? 'Mua ngay' : 'Hết hàng'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {!loading && productGroups.length > 0 && <Pagination totalItems={productGroups.length} page={pagination.page} pageSize={9} onPageChange={pagination.setPage} />}
        </>
      )}
    </div>
  )
}
