import type { AssetStatus, AssetType } from '../lib/types'

export function statusLabel(status: AssetStatus) {
  return ({ AVAILABLE: 'Sẵn sàng', ASSIGNED: 'Đang sử dụng', MAINTENANCE: 'Bảo trì', RETIRED: 'Đã thanh lý', SOLD: 'Đã bán' })[status]
}

export function typeLabel(type: AssetType) {
  return ({ DESKTOP: 'Máy tính để bàn', LAPTOP: 'Máy tính xách tay', MONITOR: 'Màn hình', PRINTER: 'Máy in', OTHER: 'Khác' })[type]
}

export function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value)) : '—'
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function formatCurrency(value: number | null) {
  return value == null ? '—' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}

const brandImages: Record<string, string> = {
  acer: '/acer.png',
  apple: '/apple.jpg',
  asus: '/asus.jpg',
  dell: '/dell.png',
  hp: '/hp.jpg',
  lenovo: '/lenovo.jpg',
  lg: '/lg-monitor.svg',
  msi: '/msi.webp',
  samsung: '/samsung.jpg',
}

export function productImageFor(product: { manufacturer: string; imageUrl?: string | null; type?: string }) {
  if (product.imageUrl?.trim()) return product.imageUrl.trim()
  const brandImage = brandImages[product.manufacturer.trim().toLowerCase()]
  if (brandImage) return brandImage
  if (product.type === 'DESKTOP') return '/products/desktop-real.jpg'
  if (product.type === 'MONITOR') return '/products/monitor-real.jpg'
  return '/acer.png'
}