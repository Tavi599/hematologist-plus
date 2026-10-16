import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../../test/render'

import { SheetPreview } from './SheetPreview'

const SHEETS = [
  {
    name: 'День 1',
    widths: [20, 10],
    heights: [21],
    rows: [[{ value: 'Ритуксимаб', format: { font: { bold: true } } }, '840 мг']],
  },
  {
    name: 'День 2',
    widths: [20, 10],
    rows: [['Циклофосфамід', '1680 мг']],
  },
]

describe('SheetPreview', () => {
  it('shows the first sheet and steps to the next by its tab', () => {
    renderWithProviders(<SheetPreview sheets={SHEETS} />)

    expect(screen.getByText('Ритуксимаб')).toBeInTheDocument()
    expect(screen.queryByText('Циклофосфамід')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: 'День 2' }))

    expect(screen.getByText('Циклофосфамід')).toBeInTheDocument()
  })

  it('says so when there is nothing to show', () => {
    renderWithProviders(<SheetPreview sheets={[]} />)

    expect(screen.getByText('Немає чого показати: лист порожній.')).toBeInTheDocument()
  })
})
