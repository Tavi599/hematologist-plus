import { act, fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import i18n from '../../lib/i18n'
import { renderWithProviders } from '../../test/render'
import { SourcesPage } from './SourcesPage'

const source = vi.hoisted(() => ({ fetchTable: vi.fn() }))
vi.mock('../../lib/catalog-source', () => ({ catalogFetcher: source.fetchTable }))

const PROTOCOL = 'NSSG Oxford Haematology, L.66 DA-EPOCH-R'
const LABEL = 'SmPC Rituximab (emc), 4.2'

describe('SourcesPage', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('uk'))
    const catalog = demoCatalog()
    catalog.regimens[0]!.sources = [
      { name: PROTOCOL, version: '2.1', url: 'https://example.org', checkedOn: '2026-09-19' },
    ]
    catalog.drugs.find((drug) => drug.id === 'rituximab')!.sources = [
      { name: LABEL, checkedOn: '2024-01-05' },
    ]
    source.fetchTable.mockReset()
    source.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])
  })

  it('groups the documents by kind, collapsed, with a count and the oldest check', async () => {
    renderWithProviders(<SourcesPage />)
    const protocols = await screen.findByRole('button', {
      name: /Протоколи NSSG Oxford Haematology/,
    })
    expect(within(protocols).getByText('1')).toBeInTheDocument()
    expect(within(protocols).getByText('найдавніша звірка — 2026-09-19')).toBeInTheDocument()
    expect(
      await screen.findByRole('button', { name: /Інструкції та характеристики препаратів/ }),
    ).toBeInTheDocument()
    // Collapsed by default: nothing of the table is on the page yet.
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('Документів: 3')).toBeInTheDocument()
  })

  it('shows what rests on a document once its group is opened', async () => {
    renderWithProviders(<SourcesPage />)
    fireEvent.click(
      await screen.findByRole('button', { name: /Протоколи NSSG Oxford Haematology/ }),
    )
    const table = within(
      await screen.findByRole('table', { name: 'Протоколи NSSG Oxford Haematology' }),
    )
    expect(table.getByRole('link', { name: PROTOCOL })).toHaveAttribute(
      'href',
      'https://example.org',
    )
    expect(table.getByText(/схема: R-CHOP-21/)).toBeInTheDocument()
    expect(table.getByText('2.1')).toBeInTheDocument()
  })

  it('searches by document, by what rests on it and by version, and opens what it found', async () => {
    renderWithProviders(<SourcesPage />)
    const field = await screen.findByRole('textbox', { name: 'Пошук джерела' })

    fireEvent.change(field, { target: { value: 'ритуксимаб' } })
    expect(screen.getByText('Знайдено: 1')).toBeInTheDocument()
    // A search opens the groups that answer it, so the row is readable at once.
    expect(
      within(
        await screen.findByRole('table', { name: 'Інструкції та характеристики препаратів' }),
      ).getByText(LABEL),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Протоколи NSSG Oxford Haematology/ }),
    ).not.toBeInTheDocument()

    fireEvent.change(field, { target: { value: '2.1' } })
    expect(screen.getByText('Знайдено: 1')).toBeInTheDocument()
    expect(
      within(
        await screen.findByRole('table', { name: 'Протоколи NSSG Oxford Haematology' }),
      ).getByText(PROTOCOL),
    ).toBeInTheDocument()

    fireEvent.change(field, { target: { value: 'бендамустин' } })
    expect(await screen.findByText('Нічого не знайдено.')).toBeInTheDocument()
  })

  it('reports a catalog without any sources', async () => {
    source.fetchTable.mockImplementation(async () => [])
    renderWithProviders(<SourcesPage />)
    expect(await screen.findByText('У довіднику ще немає джерел.')).toBeInTheDocument()
  })
})
