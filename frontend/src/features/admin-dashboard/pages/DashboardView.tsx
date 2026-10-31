import { ArrowUpRight, Laptop, RefreshCw, ShoppingBag, Users, DollarSign } from 'lucide-react'
import type { Asset, DashboardSummary } from '../../../lib/types'
import { formatCurrency, statusLabel, typeLabel } from '../../../utils/formatters'

interface DashboardViewProps {
  summary: DashboardSummary | null
  recentAssets: Asset[]
  onOpenAssets: () => void
  onRefresh?: () => void
  refreshing?: boolean
}

const breakdown = [
  { key: 'available', label: 'Sẵn sàng', tone: 'green' },
  { key: 'assigned', label: 'Đang sử dụng', tone: 'blue' },
  { key: 'maintenance', label: 'Bảo trì', tone: 'orange' },
  { key: 'retired', label: 'Đã thanh lý', tone: 'gray' },
] as const

export function DashboardView({ summary, recentAssets, onOpenAssets, onRefresh, refreshing }: DashboardViewProps) {
  const total = summary?.total ?? 0
  const stats = [
    { label: 'Doanh thu hoàn tất', value: formatCurrency(summary?.totalRevenue ?? 0), icon: DollarSign, tone: 'green', note: `${summary?.completedOrders ?? 0} đơn đã hoàn tất` },
    { label: 'Đơn hàng toàn hệ thống', value: summary?.totalOrders ?? 0, icon: ShoppingBag, tone: 'blue', note: `${summary?.pendingOrders ?? 0} đơn đang chờ xử lý` },
    { label: 'Thiết bị trong kho', value: summary?.total ?? 0, icon: Laptop, tone: 'ink', note: `${summary?.available ?? 0} thiết bị sẵn sàng` },
    { label: 'Khách hàng & hỗ trợ', value: summary?.totalCustomers ?? 0, icon: Users, tone: 'orange', note: `${summary?.maintenanceRequests ?? 0} phiếu bảo trì cần xử lý` },
  ]

  return (
    <div className="page-stack">
      <section className="welcome-strip dashboard-welcome">
        <div><p className="eyebrow">TỔNG QUAN HỆ THỐNG</p><h2>Chào mừng trở lại 👋</h2><p className="muted">Theo dõi tài sản, đơn hàng và bảo trì trong thời gian thực.</p></div>
        <div className="dashboard-header-actions">
          <span className="live-badge"><span /> Dữ liệu trực tiếp</span>
          <button className="button button-primary dashboard-refresh" type="button" onClick={onRefresh} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Làm mới
          </button>
        </div>
      </section>

      <section className="stat-grid" aria-label="Chỉ số tài sản">
        {stats.map(({ label, value, icon: Icon, tone, note }, index) => (
          <article className={`stat-card stat-${tone} reveal reveal-${index + 1}`} key={label}>
            <div className="stat-top"><span>{label}</span><span className="stat-icon"><Icon size={17} /></span></div>
            <strong className="stat-value">{value ?? '—'}</strong>
            <span className="stat-note">{note}</span>
          </article>
        ))}
      </section>

      <section className="dashboard-grid">
        <article className="surface breakdown-panel">
          <div className="section-heading"><div><p className="eyebrow">PHÂN BỔ</p><h3>Tình trạng tài sản</h3></div><span className="total-chip">{total} thiết bị</span></div>
          <div className="breakdown-bar" aria-label="Biểu đồ phân bổ">
            {breakdown.map(item => <span key={item.key} className={`bar-segment ${item.tone}`} style={{ width: `${total ? ((summary?.[item.key] ?? 0) / total) * 100 : 0}%` }} />)}
          </div>
          <div className="breakdown-rows">
            {breakdown.map(item => {
              const value = summary?.[item.key] ?? 0
              return <div className="breakdown-row" key={item.key}><span className={`legend-dot ${item.tone}`} /><span>{item.label}</span><strong>{value}</strong><span className="breakdown-percent">{total ? Math.round(value / total * 100) : 0}%</span></div>
            })}
          </div>
        </article>

        <article className="surface recent-panel">
          <div className="section-heading"><div><p className="eyebrow">CẬP NHẬT GẦN ĐÂY</p><h3>Thiết bị mới nhất</h3></div><button className="text-button" onClick={onOpenAssets}>Tất cả <ArrowUpRight size={15} /></button></div>
          <div className="recent-list">
            {recentAssets.length === 0 ? <div className="empty-inline">Chưa có dữ liệu thiết bị.</div> : recentAssets.map(asset => {
              const Icon = Laptop
              return <div className="recent-item" key={asset.id}><span className="device-icon"><Icon size={16} /></span><span className="recent-main"><strong>{asset.assetCode}</strong><small>{asset.manufacturer} {asset.modelName}</small></span><span className={`status-badge status-${asset.status.toLowerCase()}`}>{statusLabel(asset.status)}</span><span className="recent-type">{typeLabel(asset.type)}</span></div>
            })}
          </div>
        </article>
      </section>
    </div>
  )
}