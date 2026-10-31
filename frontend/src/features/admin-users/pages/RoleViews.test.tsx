import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../../services/api'
import type { Asset, CustomerAccount, MaintenanceItem } from '../../../lib/types'
import { AssetDetailPanel } from '../../admin-assets/components/AssetDetailPanel'
import { MaintenanceView } from '../../admin-maintenance/pages/MaintenanceView'
import { UsersView } from './UsersView'

vi.mock('../../../services/api', () => ({
  api: {
    assignments: vi.fn().mockResolvedValue([]),
    assetMaintenance: vi.fn().mockResolvedValue([]),
    openMaintenance: vi.fn().mockResolvedValue({}),
  },
}))

afterEach(cleanup)

const asset: Asset = {
  id: 1,
  assetCode: 'PC-001',
  serialNumber: null,
  type: 'DESKTOP',
  manufacturer: 'Dell',
  modelName: 'OptiPlex',
  processor: null,
  memoryGb: null,
  storage: null,
  screenSizeInch: null,
  refreshRateHz: null,
  usbPorts: null,
  hasHeadphoneJack: null,
  hasDedicatedGraphics: null,
  purchaseDate: null,
  warrantyUntil: null,
  purchaseCost: null,
  location: 'Kho thiết bị',
  assigneeName: null,
  status: 'AVAILABLE',
  notes: null,
}

const maintenanceItem: MaintenanceItem = {
  id: 1,
  assetId: 1,
  assetCode: asset.assetCode,
  issue: 'Máy không khởi động',
  openedAt: '2026-01-01T09:00:00Z',
  closedAt: null,
  resolutionNote: null,
  status: 'OPEN',
}

const customerAccount: CustomerAccount = {
  id: 17,
  username: 'minhkhach',
  displayName: 'Minh Khách',
  email: 'minh@example.com',
  phone: '0901234567',
  enabled: true,
  createdAt: '2026-10-20T09:30:00',
}

describe('role-specific screens', () => {
  it('lets staff submit maintenance feedback without asset handover controls', async () => {
    const onClose = vi.fn()
    render(
      <AssetDetailPanel
        asset={asset}
        canManage={false}
        canManageAssignments={false}
        canRequestMaintenance
        onClose={onClose}
        onEdit={vi.fn()}
        onChanged={vi.fn()}
      />,
    )

    expect(await screen.findByText('GỬI PHẢN HỒI BẢO TRÌ')).toBeInTheDocument()
    expect(screen.queryByText('BÀN GIAO THIẾT BỊ')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Mô tả sự cố / phản hồi'), {
      target: { value: 'Quạt phát tiếng ồn' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu bảo trì' }))

    await waitFor(() => {
      expect(api.openMaintenance).toHaveBeenCalledWith(1, 'Quạt phát tiếng ồn')
    })
  })

  it('does not offer maintenance feedback for sold assets', async () => {
    render(
      <AssetDetailPanel
        asset={{ ...asset, status: 'SOLD' }}
        canManage={false}
        canManageAssignments={false}
        canRequestMaintenance
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onChanged={vi.fn()}
      />,
    )

    await waitFor(() => expect(api.assetMaintenance).toHaveBeenCalledWith(1))
    expect(screen.queryByText('GỬI PHẢN HỒI BẢO TRÌ')).not.toBeInTheDocument()
  })

  it('hides ticket completion controls from staff', () => {
    render(<MaintenanceView items={[maintenanceItem]} loading={false} canResolve={false} onCloseTicket={vi.fn()} />)

    expect(screen.getByText('Máy không khởi động')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Hoàn tất/ })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Ghi chú xử lý PC-001')).not.toBeInTheDocument()
  })

  it('offers FIXER as an account role', () => {
    render(<UsersView users={[]} customerAccounts={[]} customerAccountsLoading={false} loading={false} onCreate={vi.fn()} onUpdate={vi.fn()} onUpdateCustomerAccount={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))

    expect(screen.getByRole('option', { name: 'Kỹ thuật viên bảo trì' })).toHaveValue('FIXER')
  })

  it('allows creating accounts with passwords shorter than ten characters', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined)
    render(<UsersView users={[]} customerAccounts={[]} customerAccountsLoading={false} loading={false} onCreate={onCreate} onUpdate={vi.fn()} onUpdateCustomerAccount={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))

    const passwordInput = screen.getByLabelText(/Mật khẩu tạm thời/)
    expect(passwordInput).not.toHaveAttribute('minlength')
    fireEvent.change(screen.getByLabelText(/Tên đăng nhập/), { target: { value: 'new-user' } })
    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: 'Nhân viên mới' } })
    fireEvent.change(passwordInput, { target: { value: '123' } })
    fireEvent.submit(passwordInput.closest('form')!)

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith({
      username: 'new-user',
      displayName: 'Nhân viên mới',
      password: '123',
      role: 'STAFF',
    }))
  })

  it('shows account details and submits edited account information', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(
      <UsersView
        users={[{ id: 8, username: 'staff', displayName: 'Nhân viên', role: 'STAFF', enabled: true }]}
        customerAccounts={[]}
        customerAccountsLoading={false}
        loading={false}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onUpdateCustomerAccount={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Chỉnh sửa' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Thông tin/ }))
    const detailsDialog = screen.getByRole('dialog', { name: 'Nhân viên' })
    expect(detailsDialog).toHaveTextContent('@staff')

    fireEvent.click(within(detailsDialog).getByRole('button', { name: /Chỉnh sửa/ }))
    fireEvent.change(screen.getByLabelText(/Họ và tên/), { target: { value: 'Nhân viên mới' } })
    fireEvent.change(screen.getByLabelText('Trạng thái tài khoản'), { target: { value: 'disabled' } })
    fireEvent.change(screen.getByLabelText(/Đặt lại mật khẩu/), { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))

    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith(8, {
      displayName: 'Nhân viên mới',
      role: 'STAFF',
      enabled: false,
      password: '123',
    }))
  })

  it('shows customer account details and allows managing that account', () => {
    render(
      <UsersView
        users={[]}
        customerAccounts={[customerAccount]}
        customerAccountsLoading={false}
        loading={false}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onUpdateCustomerAccount={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Khách hàng/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Chi tiết' }))

    const detailsDialog = screen.getByRole('dialog', { name: 'Minh Khách' })
    expect(detailsDialog).toHaveTextContent('@minhkhach')
    expect(detailsDialog).toHaveTextContent('minh@example.com')
    expect(detailsDialog).toHaveTextContent('0901234567')
    expect(detailsDialog).toHaveTextContent('Mật khẩu được mã hóa nên không thể xem lại.')

    fireEvent.click(within(detailsDialog).getByRole('button', { name: 'Quản lý tài khoản' }))
    expect(screen.getByRole('dialog', { name: '@minhkhach' })).toBeInTheDocument()
    expect(screen.getByLabelText('Họ và tên')).toHaveValue('Minh Khách')
  })
})
