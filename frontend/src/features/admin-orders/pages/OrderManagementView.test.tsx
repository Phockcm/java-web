import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SaleOrder } from '../../../lib/types'
import { api } from '../../../services/api'
import { OrderManagementView } from './OrderManagementView'

vi.mock('../../../services/api', () => ({
  api: {
    orders: vi.fn(),
    completeWebsiteRequest: vi.fn(),
    cancelWebsiteRequest: vi.fn(),
  },
}))

const orders: SaleOrder[] = [
  {
    id: 1,
    orderCode: 'SHOP-001',
    customerName: 'Nguyễn An',
    customerPhone: '0901 234 567',
    isGuest: false,
    cashierName: 'Website',
    subtotal: 12000000,
    discountAmount: 0,
    totalAmount: 12000000,
    paymentMethod: 'PENDING',
    orderStatus: 'PENDING',
    itemsJson: '[]',
    createdAt: '2026-10-28T10:00:00',
  },
  {
    id: 2,
    orderCode: 'POS-002',
    customerName: 'Trần Bình',
    customerPhone: '0987654321',
    isGuest: true,
    cashierName: 'Nhân viên',
    subtotal: 8000000,
    discountAmount: 0,
    totalAmount: 8000000,
    paymentMethod: 'CASH',
    orderStatus: 'COMPLETED',
    itemsJson: '[]',
    createdAt: '2026-10-27T10:00:00',
  },
]

function renderOrders() {
  const props = {
    refreshKey: 0,
    trashItems: [],
    trashLoading: false,
    onMoveOrderToTrash: vi.fn().mockResolvedValue(undefined),
    onRestoreTrashItem: vi.fn().mockResolvedValue(undefined),
    onDeleteTrashItem: vi.fn().mockResolvedValue(undefined),
    onOrderChanged: vi.fn(),
  }
  render(<OrderManagementView {...props} />)
  return props
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
})

describe('OrderManagementView', () => {
  it('filters invoices by phone digits regardless of formatting', async () => {
    vi.mocked(api.orders).mockResolvedValue(orders)
    renderOrders()

    await screen.findByText('SHOP-001')
    fireEvent.change(screen.getByRole('textbox', { name: 'Tìm hóa đơn theo số điện thoại' }), {
      target: { value: '0901234567' },
    })

    expect(screen.getByText('SHOP-001')).toBeInTheDocument()
    expect(screen.queryByText('POS-002')).not.toBeInTheDocument()
  })

  it('moves an invoice to trash after confirmation', async () => {
    vi.mocked(api.orders).mockResolvedValue(orders)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const props = renderOrders()

    await screen.findByText('SHOP-001')
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển SHOP-001 vào thùng rác' }))

    await waitFor(() => expect(props.onMoveOrderToTrash).toHaveBeenCalledWith(1))
    expect(screen.queryByText('SHOP-001')).not.toBeInTheDocument()
  })
})
