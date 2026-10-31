import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../../../services/api'
import type { CustomerAccount, CustomerRepairRequestItem, CustomerSession } from '../../../../lib/types'
import { StoreAuthPage, StoreRepairPage } from './StoreCustomerViews'

vi.mock('../../../../services/api', () => ({
  api: {
    createStoreRepairRequest: vi.fn(),
    storeRepairRequests: vi.fn().mockResolvedValue([]),
    loginStoreAccount: vi.fn(),
    login: vi.fn(),
    registerStoreAccount: vi.fn(),
  },
}))

afterEach(cleanup)

const customerSession: CustomerSession = {
  token: 'customer-token',
  username: 'customer',
  displayName: 'Khách hàng',
  role: 'CUSTOMER',
}

const customerAccount: CustomerAccount = {
  id: 9,
  username: 'customer',
  displayName: 'Khách hàng',
  email: 'customer@example.com',
  phone: '0901234567',
  enabled: true,
  createdAt: '2026-01-01T00:00:00',
}

describe('StoreAuthPage', () => {
  const originalLocation = window.location

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    localStorage.clear()
  })

  it('keeps a staff admin on the storefront after signing in from the store login form', async () => {
    const href = { current: '/store/login' }
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        get href() { return href.current },
        set href(value: string) { href.current = value },
      },
    })
    vi.mocked(api.loginStoreAccount).mockRejectedValue(new Error('Tài khoản hoặc mật khẩu không chính xác'))
    vi.mocked(api.login).mockResolvedValue({
      token: 'admin-token',
      username: 'admin',
      displayName: 'Quản trị viên',
      role: 'ADMIN',
    })

    render(<StoreAuthPage mode="login" onAuthenticated={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Tên tài khoản'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))

    await waitFor(() => expect(api.login).toHaveBeenCalledWith('admin', '123'))
    expect(JSON.parse(localStorage.getItem('asset-manager-session') ?? '{}')).toMatchObject({
      username: 'admin',
      role: 'ADMIN',
      token: 'admin-token',
    })
    expect(href.current).toBe('/store')
  })
})

describe('StoreRepairPage', () => {
  it('requires a customer login before showing repair request details', () => {
    render(<StoreRepairPage session={null} account={null} accountLoading={false} accountError="" />)

    expect(screen.getByRole('heading', { name: 'Đăng nhập để gửi yêu cầu' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Đăng nhập/ })).toHaveAttribute('href', '/store/login?repair=1')
  })

  it('submits the customer device and issue details', async () => {
    vi.mocked(api.createStoreRepairRequest).mockResolvedValue({
      id: 25,
      customerName: customerAccount.displayName,
      customerUsername: customerAccount.username,
      customerPhone: customerAccount.phone ?? '',
      customerEmail: customerAccount.email,
      deviceType: 'Laptop',
      manufacturer: 'Dell',
      modelName: 'Inspiron 15',
      serialNumber: 'SN-TEST',
      issue: 'Máy không khởi động',
      imageData: null,
      openedAt: '2026-01-01T00:00:00Z',
      closedAt: null,
      resolutionNote: null,
      status: 'OPEN',
    } satisfies CustomerRepairRequestItem)
    render(<StoreRepairPage session={customerSession} account={customerAccount} accountLoading={false} accountError="" />)

    fireEvent.change(screen.getByLabelText('Hãng sản xuất'), { target: { value: 'Dell' } })
    fireEvent.change(screen.getByLabelText('Tên model'), { target: { value: 'Inspiron 15' } })
    fireEvent.change(screen.getByLabelText(/Số serial/), { target: { value: 'SN-TEST' } })
    fireEvent.change(screen.getByLabelText('Mô tả lỗi *'), { target: { value: 'Máy không khởi động' } })
    fireEvent.click(screen.getByRole('button', { name: /Gửi yêu cầu sửa chữa/ }))

    await waitFor(() => expect(api.createStoreRepairRequest).toHaveBeenCalledWith({
      deviceType: 'Laptop',
      manufacturer: 'Dell',
      modelName: 'Inspiron 15',
      serialNumber: 'SN-TEST',
      issue: 'Máy không khởi động',
    }))
    expect(await screen.findByText(/Đã gửi yêu cầu #25/)).toBeInTheDocument()
  })
})
