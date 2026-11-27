import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../../test/render'

import type { HandbookBlock, HandbookTranslation } from './handbook'
import { HandbookBlocks } from './HandbookBlocks'

/** A table the PDF gave as a run of text, with no grid to rebuild it from. */
const gridless: HandbookBlock = {
  id: 't9',
  type: 'table',
  num: '9.9',
  en: 'Table 9.9 Salvage regimens',
  raw_en: 'Table 9.9 Salvage regimens DHAPORR 89%, CR 21%ICEORR 88%, CR 67%',
}

const translation = (rows: HandbookTranslation['rows']): HandbookTranslation => ({
  title: 'Розділ',
  blocks: { t9: 'Таблиця 9.9 Сальвадж-режими' },
  rows,
  references: {},
})

describe('HandbookBlocks, a table the PDF gave no grid for', () => {
  it('still shows the original text, so there is something to check against', () => {
    renderWithProviders(
      <HandbookBlocks blocks={[gridless]} translation={translation({})} view="en" />,
    )

    expect(screen.getByText(/DHAPORR 89%/)).toBeInTheDocument()
  })

  it('leaves that text out under a Ukrainian grid of the same table', () => {
    const rows = {
      t9: [
        ['Режим', 'Відповідь'],
        ['DHAP', 'ORR 89 %, CR 21 %'],
      ],
    }
    renderWithProviders(
      <HandbookBlocks blocks={[gridless]} translation={translation(rows)} view="uk" />,
    )

    expect(screen.getByText('ORR 89 %, CR 21 %')).toBeInTheDocument()
    expect(screen.queryByText(/DHAPORR 89%/)).not.toBeInTheDocument()
  })

  it('keeps it alongside the Ukrainian grid when both languages are shown', () => {
    const rows = {
      t9: [
        ['Режим', 'Відповідь'],
        ['DHAP', 'ORR 89 %, CR 21 %'],
      ],
    }
    renderWithProviders(
      <HandbookBlocks blocks={[gridless]} translation={translation(rows)} view="both" />,
    )

    expect(screen.getByText(/DHAPORR 89%/)).toBeInTheDocument()
  })
})
