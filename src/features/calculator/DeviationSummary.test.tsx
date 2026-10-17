import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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

  it('asks before taking the whole course back and shows what would be lost', async () => {
    const onRevertAll = vi.fn()
    renderWithProviders(
      <DeviationSummary
        deviations={[MANUAL, SHEET]}
        onRevert={() => {}}
        onRevertAll={onRevertAll}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Повернути все як у схемі' }))

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByText(/Буде скасовано все, що ви змінили вручну \(2\)/),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('Ритуксимаб: доза вручну 600 мг')).toBeInTheDocument()
    expect(within(dialog).getByText('Преднізолон: перенесено: Стац. лист')).toBeInTheDocument()
    expect(onRevertAll).not.toHaveBeenCalled()
  })

  it('leaves the course untouched when the question is turned down', async () => {
    const onRevertAll = vi.fn()
    renderWithProviders(
      <DeviationSummary deviations={[MANUAL]} onRevert={() => {}} onRevertAll={onRevertAll} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Повернути все як у схемі' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Скасувати' }))

    expect(onRevertAll).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('takes the whole course back only once the question is answered', async () => {
    const onRevertAll = vi.fn()
    renderWithProviders(
      <DeviationSummary deviations={[MANUAL]} onRevert={() => {}} onRevertAll={onRevertAll} />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Повернути все як у схемі' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Повернути як у схемі' }))

    expect(onRevertAll).toHaveBeenCalledTimes(1)
  })

  it('shows nothing at all for a course that follows the protocol', () => {
    renderWithProviders(
      <DeviationSummary deviations={[]} onRevert={() => {}} onRevertAll={() => {}} />,
    )

    expect(screen.queryByText(/Відхилення від схеми/)).not.toBeInTheDocument()
  })
})
