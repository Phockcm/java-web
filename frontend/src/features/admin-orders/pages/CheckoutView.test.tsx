import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Asset, SaleOrder } from '../../../lib/types'
import { api } from '../../../services/api'
import { CheckoutView } from './CheckoutView'

vi.mock('../../../services/api', () => ({
  api: {
    createOrder: vi.fn(),
    orders: vi.fn(),
  },
}))

const session = {
  token: 'token',
  username: 'staff',
  displayName: 'Nhân viên',
  role: 'STAFF' as const,
}

function makeAsset(id: number): Asset {
  return {
    id,
    assetCode: `ASSET-${id}`,
    serialNumber: null,
    type: 'LAPTOP',
    manufacturer: 'LG',
    modelName: 'Gram 14',
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
}

function makeOrder(paymentMethod: SaleOrder['paymentMethod'] = 'CARD'): SaleOrder {
  return {
    id: 1,
    orderCode: 'POS-001',
    customerName: 'Khách vãng lai',
    customerPhone: null,
    isGuest: true,
    cashierName: 'Nhân viên',
    subtotal: 2000000,
    discountAmount: 0,
    totalAmount: 2000000,
    paymentMethod,
    orderStatus: 'COMPLETED',
    itemsJson: '[]',
    createdAt: '2025-01-01T00:00:00',
  }
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('CheckoutView product quantities', () => {
  it('groups the model, changes its cart quantity, and caps it at available stock', () => {
    const assets = [makeAsset(1), makeAsset(2), makeAsset(3)]
    render(<CheckoutView assets={assets} customers={[]} session={session} initialSelectedAsset={assets[0]} />)

    expect(document.querySelectorAll('.pos-product-item')).toHaveLength(1)
    expect(screen.getByRole('option', { name: 'LG' })).toBeInTheDocument()

    const quantity = screen.getByLabelText('Số lượng Gram 14')
    const increase = screen.getByRole('button', { name: 'Tăng số lượng Gram 14' })
    fireEvent.click(increase)
    expect(quantity).toHaveTextContent('2')
    expect(document.querySelector('.cart-item-sum')).toHaveTextContent('2.000.000')
    expect(screen.getByText('Tạm tính (2 sản phẩm):')).toBeInTheDocument()

    fireEvent.click(increase)
    expect(quantity).toHaveTextContent('3')
    expect(increase).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Giảm số lượng Gram 14' }))
    expect(quantity).toHaveTextContent('2')
  })

  it('submits each selected machine once while preserving the grouped quantity in the total', async () => {
    const assets = [makeAsset(1), makeAsset(2)]
    vi.mocked(api.createOrder).mockResolvedValue(makeOrder())
    render(<CheckoutView assets={assets} customers={[]} session={session} initialSelectedAsset={assets[0]} />)

    fireEvent.click(screen.getByRole('button', { name: 'Tăng số lượng Gram 14' }))
    fireEvent.click(screen.getByRole('radio', { name: /Bảo hành vàng/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Khách vãng lai (Mua nhanh)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quẹt thẻ POS' }))
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán/ }))

    await vi.waitFor(() => expect(api.createOrder).toHaveBeenCalledTimes(1))
    expect(api.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      warrantyPlan: 'GOLD',
      items: [
        { assetId: 1, quantity: 1 },
        { assetId: 2, quantity: 1 },
      ],
    }))
  })

  it('shows a payable VietQR before checkout and keeps the transfer QR on the invoice', async () => {
    vi.stubEnv('VITE_VIETQR_BANK_BIN', '970422')
    vi.stubEnv('VITE_VIETQR_ACCOUNT_NUMBER', '1234567890')
    vi.stubEnv('VITE_VIETQR_ACCOUNT_NAME', 'TEST ACCOUNT')
    const asset = makeAsset(1)
    vi.mocked(api.createOrder).mockResolvedValue(makeOrder('BANK_TRANSFER'))

    render(<CheckoutView assets={[asset]} customers={[]} session={session} initialSelectedAsset={asset} />)

    fireEvent.click(screen.getByRole('button', { name: 'Khách vãng lai (Mua nhanh)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển khoản QR' }))

    const checkoutQr = await screen.findByRole('img', { name: /QR chuyển khoản VietQR/ })
    expect(checkoutQr).toHaveAttribute('src', expect.stringMatching(/^data:image\/png;base64,/))

    fireEvent.click(screen.getByRole('button', { name: /Xác nhận đã nhận chuyển khoản/ }))
    await vi.waitFor(() => expect(api.createOrder).toHaveBeenCalledWith(expect.objectContaining({
      paymentMethod: 'BANK_TRANSFER',
    })))
    expect(await screen.findByRole('img', { name: 'QR chuyển khoản VietQR trên hóa đơn' })).toBeInTheDocument()
  })

  it('requires VietQR receiver settings instead of showing a fake payment QR', async () => {
    vi.stubEnv('VITE_VIETQR_BANK_BIN', '')
    vi.stubEnv('VITE_VIETQR_ACCOUNT_NUMBER', '')
    vi.stubEnv('VITE_VIETQR_ACCOUNT_NAME', '')
    const asset = makeAsset(1)

    render(<CheckoutView assets={[asset]} customers={[]} session={session} initialSelectedAsset={asset} />)

    fireEvent.click(screen.getByRole('button', { name: 'Khách vãng lai (Mua nhanh)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển khoản QR' }))

    expect(await screen.findByText(/Thiếu cấu hình VITE_VIETQR_BANK_BIN/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Xác nhận đã nhận chuyển khoản/ })).toBeDisabled()
  })

  it('suggests matching customers while entering a phone number', () => {
    render(<CheckoutView assets={[]} customers={[{
      id: 8,
      fullName: 'Nguyễn An',
      phone: '0901234567',
      email: null,
      address: null,
      membershipTier: 'BRONZE',
      totalSpent: 0,
      ordersCount: 0,
      joinedDate: null,
    }]} session={session} />)

    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm khách hàng thành viên' }), { target: { value: '090' } })
    fireEvent.click(screen.getByRole('option', { name: /Nguyễn An.*0901234567/ }))

    expect(screen.getByText(/SĐT: 0901234567/)).toBeInTheDocument()
    expect(screen.getByText('Nguyễn An')).toBeInTheDocument()
  })
})
