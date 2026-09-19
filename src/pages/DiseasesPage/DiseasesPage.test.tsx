import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import i18n from '../../lib/i18n'
import { renderWithProviders } from '../../test/render'
import { DiseasesPage } from './DiseasesPage'

const source = vi.hoisted(() => ({ fetchTable: vi.fn() }))
vi.mock('../../lib/catalog-source', () => ({ catalogFetcher: source.fetchTable }))

describe('DiseasesPage', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('uk'))
    const catalog = demoCatalog()
    source.fetchTable.mockReset()
    source.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])
  })

  it('lists diseases from the catalog with their ICD-10 code', async () => {
    renderWithProviders(<DiseasesPage />)
    const link = await screen.findByRole('link', { name: 'ДЕМО Дифузна В-великоклітинна лімфома' })
    expect(link).toHaveAttribute('href', '/diseases/dlbcl')
    expect(screen.getByText('C83.3')).toBeInTheDocument()
  })

  it('shows localized names in English', async () => {
    await act(() => i18n.changeLanguage('en'))
    renderWithProviders(<DiseasesPage />)
    expect(
      await screen.findByRole('link', { name: 'DEMO Diffuse large B-cell lymphoma' }),
    ).toBeInTheDocument()
  })

  it('reports an empty catalog', async () => {
    source.fetchTable.mockImplementation(async () => [])
    renderWithProviders(<DiseasesPage />)
    expect(await screen.findByText('Перелік захворювань поки порожній.')).toBeInTheDocument()
  })
})

describe('DiseasesPage search', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('uk'))
    const catalog = demoCatalog()
    source.fetchTable.mockReset()
    source.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])
  })

  it('filters by name and by ICD-10 code', async () => {
    const { fireEvent } = await import('@testing-library/react')
    renderWithProviders(<DiseasesPage />)
    const search = await screen.findByLabelText('Пошук')

    await act(async () => {
      fireEvent.change(search, { target: { value: 'c83' } })
    })
    expect(screen.getByText('C83.3')).toBeInTheDocument()

    await act(async () => {
      fireEvent.change(search, { target: { value: 'лейкоз' } })
    })
    expect(screen.getByText('Нічого не знайдено.')).toBeInTheDocument()
  })

  it('groups by ICD-10 chapter', async () => {
    renderWithProviders(<DiseasesPage />)
    expect(await screen.findByText('Клас МКХ-10: C')).toBeInTheDocument()
  })
})
