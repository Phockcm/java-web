import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardView } from './DashboardView'

describe('DashboardView', () => {
  it('shows asset status counts and recent equipment', () => {
    render(<DashboardView
      summary={{ total: 4, available: 1, assigned: 2, maintenance: 1, retired: 0, maintenanceRequests: 3 }}
      recentAssets={[{
        id: 1,
        assetCode: 'LT-01',
        serialNumber: null,
        type: 'LAPTOP',
        manufacturer: 'Lenovo',
        modelName: 'ThinkPad E14',
        processor: 'Intel Core Ultra 5',
        memoryGb: 16,
        storage: '512 GB SSD',
        screenSizeInch: 14,
        refreshRateHz: 60,
        usbPorts: '2 × USB-A, 2 × USB-C',
        hasHeadphoneJack: true,
        hasDedicatedGraphics: false,
        purchaseDate: null,
        warrantyUntil: null,
        purchaseCost: null,
        location: 'Kho thiết bị',
        assigneeName: null,
        status: 'AVAILABLE',
        notes: null,
      }]}
      onOpenAssets={vi.fn()}
    />)

    expect(screen.getByText('Chào mừng trở lại 👋')).toBeInTheDocument()
    expect(screen.getByText('4 thiết bị')).toBeInTheDocument()
    expect(screen.getByText('LT-01')).toBeInTheDocument()
    expect(screen.getByText('Lenovo ThinkPad E14')).toBeInTheDocument()
  })
})