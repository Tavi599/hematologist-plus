import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../test/render'

import { DeviationSummary } from './DeviationSummary'
import type { Deviation } from './deviations'

const MANUAL: Deviation = {
  kind: 'manualDose',
  itemId: 'r-chop-21.rituximab',
  drug: 'Ритуксимаб',
  values: { amount: 600, unit: 'mg' },
  changesDose: true,
}

const SHEET: Deviation = {
  kind: 'sheet',
  itemId: 'r-chop-21.prednisolone',
  drug: 'Преднізолон',
  values: { sheet: 'ward' },
  changesDose: false,
}

describe('DeviationSummary', () => {
  it('says how many there are and how many change a dose', () => {
    renderWithProviders(
      <DeviationSummary deviations={[MANUAL, SHEET]} onRevert={() => {}} onRevertAll={() => {}} />,
    )

    expect(screen.getByText('Відхилення від схеми: 2')).toBeInTheDocument()
    expect(screen.getByText('впливають на дозу: 1')).toBeInTheDocument()
  })

  it('writes each line out with the drug and takes it back by its own button', () => {
    const onRevert = vi.fn()
    renderWithProviders(
      <DeviationSummary deviations={[MANUAL, SHEET]} onRevert={onRevert} onRevertAll={() => {}} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Показати' }))

    expect(screen.getByText('Ритуксимаб: доза вручну 600 мг')).toBeInTheDocument()
    expect(screen.getByText('Преднізолон: перенесено: Стац. лист')).toBeInTheDocument()

    // The buttons sit inside the folded block, which jsdom still counts as hidden.
    fireEvent.click(screen.getAllByText('повернути')[0]!)

    expect(onRevert).toHaveBeenCalledWith(MANUAL)
  })

  it('shows nothing at all for a course that follows the protocol', () => {
    renderWithProviders(
      <DeviationSummary deviations={[]} onRevert={() => {}} onRevertAll={() => {}} />,
    )

    expect(screen.queryByText(/Відхилення від схеми/)).not.toBeInTheDocument()
  })
})
