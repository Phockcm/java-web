import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, setApiToken } from '../../../../services/api'
import type { CustomerAccount, CustomerSession } from '../../../../lib/types'
import { StorefrontView } from './StorefrontView'

vi.mock('../../../../services/api', () => ({
  api: {
    storeProducts: vi.fn(),
    storeMyOrders: vi.fn().mockResolvedValue([]),
    storeReceipt: vi.fn(),
    storeAccount: vi.fn().mockResolvedValue(null),
    registerStoreAccount: vi.fn(),
    updateStoreAccount: vi.fn(),
  },
  setApiToken: vi.fn(),
}))

beforeEach(() => {
  localStorage.clear()
  window.history.replaceState({}, '', '/store')
  vi.mocked(api.storeProducts).mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('StorefrontView navigation', () => {
  it('keeps the home page free of search and filter controls', () => {
    render(<StorefrontView />)

    expect(screen.queryByRole('textbox', { name: 'Tìm kiếm sản phẩm' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Lọc danh mục' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Lọc thương hiệu' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tìm kiếm' })).toHaveAttribute('href', '/store/search')
  })

  it('hides administration from regular customers and routes services to repair requests', () => {
    localStorage.setItem('customer-store-session', JSON.stringify({
      token: 'customer-token',
      username: 'customer',
      displayName: 'Khách hàng',
      role: 'CUSTOMER',
    }))
    render(<StorefrontView />)

    expect(screen.queryByRole('link', { name: 'Quản trị' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Dành cho nhân viên' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Dịch vụ' })).toHaveAttribute('href', '/store/repair')
  })

  it('returns to the Store after successful registration', async () => {
    const originalLocation = window.location
    const href = { current: '/store/register?checkout=1' }
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        pathname: '/store/register',
        search: '?checkout=1',
        get href() { return href.current },
        set href(value: string) { href.current = value },
      },
    })
    vi.mocked(api.registerStoreAccount).mockResolvedValue({
      token: 'new-customer-token',
      username: 'newcustomer',
      displayName: 'Khách mới',
      role: 'CUSTOMER',
    })

    try {
      render(<StorefrontView />)
      fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Khách mới' } })
      fireEvent.change(screen.getByLabelText('Tên tài khoản'), { target: { value: 'newcustomer' } })
      fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'password123' } })
      fireEvent.click(screen.getByRole('button', { name: 'Đăng ký tài khoản' }))

      await waitFor(() => expect(href.current).toBe('/store'))
      expect(localStorage.getItem('customer-store-session')).toContain('newcustomer')
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    }
  })

  it('returns to the Store after saving account details', async () => {
    const session: CustomerSession = {
      token: 'customer-token',
      username: 'customer',
      displayName: 'Khách hàng',
      role: 'CUSTOMER',
    }
    const account: CustomerAccount = {
      id: 1,
      username: 'customer',
      displayName: 'Khách hàng',
      email: 'customer@gmail.com',
      phone: '0900000000',
      enabled: true,
      createdAt: '2026-10-21T00:00:00',
    }
    const originalLocation = window.location
    const href = { current: '/store/account' }
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        pathname: '/store/account',
        search: '',
        get href() { return href.current },
        set href(value: string) { href.current = value },
      },
    })
    localStorage.setItem('customer-store-session', JSON.stringify(session))
    vi.mocked(api.storeAccount).mockResolvedValue(account)
    vi.mocked(api.updateStoreAccount).mockResolvedValue({ ...account, displayName: 'Tên đã sửa' })

    try {
      render(<StorefrontView />)
      await screen.findByDisplayValue('customer@gmail.com')
      fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Tên đã sửa' } })
      fireEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }))

      await waitFor(() => expect(href.current).toBe('/store?profile-saved=1'))
      expect(api.updateStoreAccount).toHaveBeenCalledWith({
        displayName: 'Tên đã sửa',
        email: 'customer@gmail.com',
        phone: '0900000000',
      })
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    }
  })

  it('shows a success notification on the Store after an account update', () => {
    window.history.replaceState({}, '', '/store?profile-saved=1')
    render(<StorefrontView />)

    expect(screen.getByRole('status')).toHaveTextContent('Thông tin tài khoản đã được lưu thành công.')
  })

  it('offers only account details and logout from the signed-in storefront account menu', () => {
    const originalLocation = window.location
    const href = { current: '/store' }
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        pathname: '/store',
        search: '',
        get href() { return href.current },
        set href(value: string) { href.current = value },
      },
    })
    localStorage.setItem('customer-store-session', JSON.stringify({
      token: 'customer-token',
      username: 'customer',
      displayName: 'Khách hàng',
      role: 'CUSTOMER',
    }))

    try {
      render(<StorefrontView />)
      fireEvent.click(screen.getByRole('button', { name: 'Tài khoản Khách hàng' }))

      expect(screen.getByRole('menuitem', { name: 'Chi tiết' })).toHaveAttribute('href', '/store/account')
      expect(screen.getAllByRole('menuitem')).toHaveLength(2)
      fireEvent.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }))

      expect(localStorage.getItem('customer-store-session')).toBeNull()
      expect(setApiToken).toHaveBeenLastCalledWith(null)
      expect(href.current).toBe('/store')
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    }
  })

  it('shows a dedicated account details page with a logout button', () => {
    window.history.replaceState({}, '', '/store/account')
    localStorage.setItem('customer-store-session', JSON.stringify({
      token: 'customer-token',
      username: 'customer',
      displayName: 'Khách hàng',
      role: 'CUSTOMER',
    }))
    const originalLocation = window.location
    const href = { current: '/store/account' }
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        pathname: '/store/account',
        search: '',
        get href() { return href.current },
        set href(value: string) { href.current = value },
      },
    })

    try {
      render(<StorefrontView />)

      expect(screen.getByText('CHI TIẾT TÀI KHOẢN')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Thông tin tài khoản' })).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))

      expect(localStorage.getItem('customer-store-session')).toBeNull()
      expect(setApiToken).toHaveBeenLastCalledWith(null)
      expect(href.current).toBe('/store')
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    }
  })

  it('opens staff account details from the Store menu instead of linking to administration', () => {
    localStorage.setItem('asset-manager-session', JSON.stringify({
      token: 'admin-token',
      username: 'admin',
      displayName: 'Quản trị viên',
      role: 'ADMIN',
    }))
    render(<StorefrontView />)

    fireEvent.click(screen.getByRole('button', { name: 'Tài khoản Quản trị viên' }))

    expect(screen.getByRole('menuitem', { name: 'Chi tiết' })).toHaveAttribute('href', '/store/account')
    expect(screen.getAllByRole('menuitem')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'Quản trị viên' })).not.toBeInTheDocument()
  })

  it('shows staff account details and logs the staff session out from that page', () => {
    window.history.replaceState({}, '', '/store/account')
    localStorage.setItem('asset-manager-session', JSON.stringify({
      token: 'admin-token',
      username: 'admin',
      displayName: 'Quản trị viên',
      role: 'ADMIN',
    }))
    const originalLocation = window.location
    const href = { current: '/store/account' }
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        pathname: '/store/account',
        search: '',
        get href() { return href.current },
        set href(value: string) { href.current = value },
      },
    })

    try {
      render(<StorefrontView />)

      expect(screen.getByRole('heading', { name: 'Thông tin tài khoản' })).toBeInTheDocument()
      expect(within(screen.getByText('Vai trò').parentElement!).getByText('Quản trị viên')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }))

      expect(localStorage.getItem('asset-manager-session')).toBeNull()
      expect(href.current).toBe('/store')
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    }
  })

  it('keeps an admin on the storefront and shows the administration button', () => {
    localStorage.setItem('asset-manager-session', JSON.stringify({
      token: 'admin-token',
      username: 'admin',
      displayName: 'Quản trị viên',
      role: 'ADMIN',
    }))
    render(<StorefrontView />)

    expect(screen.getByRole('link', { name: 'Quản trị' })).toHaveAttribute('href', '/admin')
    expect(screen.getByText(/bảo vệ đầy đủ quyền lợi khách hàng/)).toBeInTheDocument()
    expect(screen.getByText('Quản trị viên')).toBeInTheDocument()
  })

  it('provides a dedicated searchable product page with brand filtering and pagination', async () => {
    const products = Array.from({ length: 13 }, (_, index) => ({
      id: index + 1,
      assetCode: `LEN-${index + 1}`,
      type: 'LAPTOP' as const,
      status: 'AVAILABLE' as const,
      manufacturer: 'Lenovo',
      modelName: `ThinkPad ${index + 1}`,
      imageUrl: null,
      processor: null,
      memoryGb: null,
      storage: null,
      screenSizeInch: null,
      refreshRateHz: null,
      usbPorts: null,
      hasHeadphoneJack: null,
      hasDedicatedGraphics: null,
      price: 1000,
      viewCount: 0,
    }))
    vi.mocked(api.storeProducts).mockResolvedValue([
      ...products,
      { ...products[0], id: 14, assetCode: 'DEL-1', manufacturer: 'Dell', modelName: 'Latitude 1' },
    ])
    window.history.replaceState({}, '', '/store/search')

    render(<StorefrontView />)

    expect(screen.getByRole('link', { name: 'Tìm kiếm' })).toHaveAttribute('href', '/store/search')
    expect(screen.getByRole('heading', { name: 'Tìm kiếm sản phẩm' })).toBeInTheDocument()

    const page = document.querySelector<HTMLElement>('.store-search-page')
    expect(page).not.toBeNull()
    expect(within(page!).queryByRole('combobox', { name: 'Lọc danh mục' })).not.toBeInTheDocument()
    await within(page!).findByRole('option', { name: 'Lenovo' })
    fireEvent.change(within(page!).getByRole('combobox', { name: 'Lọc thương hiệu' }), { target: { value: 'Lenovo' } })

    const pagination = within(await within(page!).findByRole('navigation', { name: 'Phân trang' }))
    expect(pagination.getByText('Hiển thị 1–12 trên 13')).toBeInTheDocument()
    expect(page!.querySelectorAll('.store-product-card')).toHaveLength(12)
    fireEvent.click(pagination.getByRole('button', { name: 'Trang tiếp' }))

    expect(pagination.getByText('Hiển thị 13–13 trên 13')).toBeInTheDocument()
    expect(page!.querySelector('.store-product-card')).toHaveAttribute('href', '/store/product/13')

    fireEvent.change(within(page!).getByRole('textbox', { name: 'Tìm kiếm sản phẩm' }), { target: { value: 'ThinkPad 13' } })
    expect(page!.querySelectorAll('.store-product-card')).toHaveLength(1)
    expect(page!.querySelector('.store-product-card')).toHaveAttribute('href', '/store/product/13')
  })

  it('groups matching store inventory and lets customers increase and decrease cart quantity', async () => {
    const product = {
      id: 1,
      assetCode: 'LEN-1',
      type: 'LAPTOP' as const,
      status: 'AVAILABLE' as const,
      manufacturer: 'Lenovo',
      modelName: 'ThinkPad E14',
      imageUrl: null,
      processor: 'Core i5',
      memoryGb: 16,
      storage: '512GB',
      screenSizeInch: 14,
      refreshRateHz: null,
      usbPorts: null,
      hasHeadphoneJack: null,
      hasDedicatedGraphics: null,
      price: 12000000,
      viewCount: 0,
    }
    const secondUnit = { ...product, id: 2, assetCode: 'LEN-2' }
    vi.mocked(api.storeProducts).mockResolvedValue([product, secondUnit])

    render(<StorefrontView />)
    const stockCards = await screen.findAllByText('Còn 2 máy')
    expect(stockCards).toHaveLength(2)
    expect(document.querySelectorAll('#products .store-product-card')).toHaveLength(1)

    cleanup()
    window.history.replaceState({}, '', '/store/product/1')
    render(<StorefrontView />)
    const addButton = await screen.findByRole('button', { name: 'Thêm vào giỏ hàng' })
    fireEvent.click(addButton)
    fireEvent.click(addButton)
    fireEvent.click(screen.getByRole('button', { name: 'Mở giỏ hàng, 2 sản phẩm' }))

    expect(screen.getByLabelText('Số lượng ThinkPad E14')).toHaveTextContent('2')
    fireEvent.click(screen.getByRole('button', { name: 'Giảm số lượng ThinkPad E14' }))
    expect(screen.getByLabelText('Số lượng ThinkPad E14')).toHaveTextContent('1')
  })
})
