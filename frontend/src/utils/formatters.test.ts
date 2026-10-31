import { describe, expect, it } from 'vitest'
import { formatCurrency, productImageFor, statusLabel, typeLabel } from './formatters'

describe('inventory labels and formatting', () => {
  it('translates status and device type to Vietnamese', () => {
    expect(statusLabel('MAINTENANCE')).toBe('Bảo trì')
    expect(typeLabel('LAPTOP')).toBe('Máy tính xách tay')
  })

  it('formats purchase value as Vietnamese dong', () => {
    expect(formatCurrency(18500000)).toContain('18.500.000')
    expect(formatCurrency(null)).toBe('—')
  })

  it('uses the image URL returned with the product before the brand fallback', () => {
    expect(productImageFor({ manufacturer: 'HP', imageUrl: '/uploads/hp-victus.jpg' }))
      .toBe('/uploads/hp-victus.jpg')
    expect(productImageFor({ manufacturer: 'HP', imageUrl: null })).toBe('/hp.jpg')
  })

  it('maps every available brand to its own local product image', () => {
    expect(productImageFor({ manufacturer: 'Acer' })).toBe('/acer.png')
    expect(productImageFor({ manufacturer: 'Apple' })).toBe('/apple.jpg')
    expect(productImageFor({ manufacturer: 'ASUS' })).toBe('/asus.jpg')
    expect(productImageFor({ manufacturer: 'Dell' })).toBe('/dell.png')
    expect(productImageFor({ manufacturer: 'HP' })).toBe('/hp.jpg')
    expect(productImageFor({ manufacturer: 'Lenovo' })).toBe('/lenovo.jpg')
    expect(productImageFor({ manufacturer: 'LG', type: 'MONITOR' })).toBe('/lg-monitor.svg')
    expect(productImageFor({ manufacturer: 'MSI' })).toBe('/msi.webp')
    expect(productImageFor({ manufacturer: 'Samsung' })).toBe('/samsung.jpg')
  })
})