import { act, fireEvent, screen } from '@testing-library/react'
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

  it('lists the conditions that need irradiated components in a tab of their own', async () => {
    renderWithProviders(<DiseasesPage />)
    expect(
      screen.queryByText('Лімфома Ходжкіна — будь-яка стадія, дорослі й діти'),
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Опромінені компоненти крові' }))
    expect(
      await screen.findByRole('heading', {
        name: 'Стани, що потребують переливання опромінених компонентів крові',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Лімфома Ходжкіна — будь-яка стадія, дорослі й діти'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ритуксимаб сам по собі (1B)')).toBeInTheDocument()
  })

  it('shows the febrile neutropenia algorithm in a tab of its own', async () => {
    renderWithProviders(<DiseasesPage />)
    fireEvent.click(screen.getByRole('tab', { name: 'Фебрильна нейтропенія' }))
    expect(
      await screen.findByRole('heading', { name: 'Фебрильна нейтропенія: емпірична терапія' }),
    ).toBeInTheDocument()
    expect(screen.getByText('4 г/0,5 г в/в кожні 6 год (інфузія 30 хв)')).toBeInTheDocument()
  })
})
