import { act, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import i18n from '../../lib/i18n'
import { renderWithProviders } from '../../test/render'
import { SourcesPage } from './SourcesPage'

const source = vi.hoisted(() => ({ fetchTable: vi.fn() }))
vi.mock('../../lib/catalog-source', () => ({ catalogFetcher: source.fetchTable }))

describe('SourcesPage', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('uk'))
    const catalog = demoCatalog()
    catalog.regimens[0]!.sources = [
      {
        name: 'ДЕМО протокол',
        version: '2.1',
        url: 'https://example.org',
        checkedOn: '2026-09-19',
      },
    ]
    source.fetchTable.mockReset()
    source.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])
  })

  it('lists the documents of the catalog and what rests on them', async () => {
    renderWithProviders(<SourcesPage />)
    const table = within(await screen.findByRole('table', { name: 'Джерела' }))
    expect(table.getByRole('link', { name: 'ДЕМО протокол' })).toHaveAttribute(
      'href',
      'https://example.org',
    )
    expect(table.getByText(/схема: R-CHOP-21/)).toBeInTheDocument()
    expect(table.getByText(/доза: R-CHOP-21/)).toBeInTheDocument()
    expect(table.getByText('2.1')).toBeInTheDocument()
  })

  it('reports a catalog without any sources', async () => {
    source.fetchTable.mockImplementation(async () => [])
    renderWithProviders(<SourcesPage />)
    expect(await screen.findByText('У довіднику ще немає джерел.')).toBeInTheDocument()
  })
})
