import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Asset, ProductBrand } from '../../../lib/types'
import { BrandCatalogView } from './BrandCatalogView'

const brands: ProductBrand[] = [{ id: 1, name: 'Dell' }]
const asset: Asset = {
  id: 1,
  assetCode: 'DELL-001',
  serialNumber: null,
  type: 'LAPTOP',
  manufacturer: 'Dell',
  modelName: 'Latitude',
  processor: 'Core i5',
  memoryGb: 16,
  storage: '512GB',
  screenSizeInch: 14,
  refreshRateHz: null,
  usbPorts: null,
  hasHeadphoneJack: true,
  hasDedicatedGraphics: false,
  purchaseDate: null,
  warrantyUntil: null,
  purchaseCost: 1000000,
  location: 'Kho',
  assigneeName: null,
  status: 'AVAILABLE',
  notes: null,
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderCatalog(overrides: Partial<ComponentProps<typeof BrandCatalogView>> = {}) {
  const props = {
    assets: [asset],
    brands,
    loading: false,
    onSelectForCheckout: vi.fn(),
    onViewDetail: vi.fn(),
    trashItems: [],
    trashLoading: false,
    onCreateBrand: vi.fn().mockResolvedValue(undefined),
    onUpdateBrand: vi.fn().mockResolvedValue(undefined),
    onMoveBrandToTrash: vi.fn().mockResolvedValue(undefined),
    onRestoreTrashItem: vi.fn().mockResolvedValue(undefined),
    onDeleteTrashItem: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
  render(<BrandCatalogView {...props} />)
  return props
}

describe('BrandCatalogView brand management', () => {
  it('shows the matching brand product image in the catalog card', () => {
    renderCatalog()

    expect(screen.getByRole('img', { name: 'Dell Latitude' })).toHaveAttribute('src', '/dell.png')
    expect(document.querySelector('.product-code-tag')).toHaveTextContent('DELL-001')
  })

  it('adds a manufacturer from the catalog management panel', async () => {
    const props = renderCatalog()
    fireEvent.click(screen.getByRole('button', { name: 'Quản lý danh mục' }))
    fireEvent.change(screen.getByLabelText('Tên hãng mới'), { target: { value: '  Lenovo  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm hãng' }))

    await waitFor(() => expect(props.onCreateBrand).toHaveBeenCalledWith('Lenovo'))
    expect(screen.getByRole('status')).toHaveTextContent('Đã thêm hãng sản phẩm.')
  })

  it('edits manufacturer names and blocks moving a brand to trash while its product exists', async () => {
    const props = renderCatalog()
    fireEvent.click(screen.getByRole('button', { name: 'Quản lý danh mục' }))

    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    fireEvent.change(screen.getByLabelText('Sửa hãng: Dell'), { target: { value: 'Dell Inc.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    await waitFor(() => expect(props.onUpdateBrand).toHaveBeenCalledWith(1, 'Dell Inc.'))

    expect(screen.getByRole('button', { name: 'Xóa' })).toBeDisabled()
    expect(props.onMoveBrandToTrash).not.toHaveBeenCalled()
  })

  it('allows moving a brand with no remaining products to trash', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const props = renderCatalog({ assets: [] })
    fireEvent.click(screen.getByRole('button', { name: 'Quản lý danh mục' }))

    fireEvent.click(screen.getByRole('button', { name: 'Xóa' }))
    await waitFor(() => expect(props.onMoveBrandToTrash).toHaveBeenCalledWith(1))
  })

  it('shows the brand-only trash from the catalog page', () => {
    renderCatalog()
    fireEvent.click(screen.getByRole('button', { name: 'Thùng rác (0)' }))
    expect(screen.getByRole('heading', { name: 'Hãng sản phẩm đã xóa' })).toBeInTheDocument()
  })
})
