import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./services/api', () => ({
  api: {
    allAssets: vi.fn().mockResolvedValue([]),
    storeProducts: vi.fn().mockResolvedValue([]),
    storeAccount: vi.fn().mockResolvedValue(null),
    storeMyOrders: vi.fn().mockResolvedValue([]),
    customers: vi.fn().mockResolvedValue([]),
    reviews: vi.fn().mockResolvedValue([]),
    dashboard: vi.fn().mockResolvedValue({
      total: 0,
      available: 0,
      assigned: 0,
      maintenance: 0,
      retired: 0,
      maintenanceRequests: 0,
    }),
    assets: vi.fn().mockResolvedValue({ content: [], totalPages: 0 }),
  },
  setApiToken: vi.fn(),
}))

afterEach(() => {
  cleanup()
  localStorage.clear()
  window.history.replaceState({}, '', '/')
  vi.clearAllMocks()
})

describe('application routes', () => {
  it('opens the storefront at the root address', async () => {
    window.history.replaceState({}, '', '/')
    render(<App />)

    expect(window.location.pathname).toBe('/store')
    expect(await screen.findByRole('heading', { name: /Tìm chiếc máy/ })).toBeInTheDocument()
  })
})

describe('admin session handoff from the storefront', () => {
  it('restores a saved administrator session instead of showing the login form', async () => {
    localStorage.setItem('asset-manager-session', JSON.stringify({
      token: 'admin-token',
      username: 'admin',
      displayName: 'Quản trị viên',
      role: 'ADMIN',
    }))

    window.history.replaceState({}, '', '/admin')
    render(<App />)

    expect(await screen.findAllByRole('button', { name: 'Đăng xuất' })).not.toHaveLength(0)
    expect(screen.queryByRole('heading', { name: 'Đăng nhập' })).not.toBeInTheDocument()
  })

  it('starts staff sessions at checkout when the storefront management link is used', async () => {
    localStorage.setItem('asset-manager-session', JSON.stringify({
      token: 'staff-token',
      username: 'staff',
      displayName: 'Nhân viên',
      role: 'STAFF',
    }))

    window.history.replaceState({}, '', '/admin')
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Thanh toán POS' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Đăng nhập' })).not.toBeInTheDocument()
  })
})
