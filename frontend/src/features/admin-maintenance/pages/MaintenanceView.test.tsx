import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { MaintenanceItem } from '../../../lib/types'
import { MaintenanceView } from './MaintenanceView'

describe('MaintenanceView', () => {
  it('shows all open maintenance tickets without pagination', () => {
    const items: MaintenanceItem[] = Array.from({ length: 11 }, (_, index) => ({
      id: index + 1,
      assetId: index + 1,
      assetCode: `ASSET-${index + 1}`,
      issue: `ISSUE-${index + 1}`,
      openedAt: '2026-01-01T10:00:00',
      closedAt: null,
      resolutionNote: null,
      status: 'OPEN',
    }))

    render(
      <MaintenanceView
        items={items}
        loading={false}
        canResolve
        onCloseTicket={vi.fn()}
      />,
    )

    expect(document.querySelectorAll('.maintenance-row')).toHaveLength(11)
    expect(screen.getByText('ISSUE-11')).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Phân trang' })).not.toBeInTheDocument()
  })
})
