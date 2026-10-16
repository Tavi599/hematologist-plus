import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import i18n from '../../lib/i18n'
import { renderWithProviders } from '../../test/render'
import { GlobalSearch } from './GlobalSearch'

const source = vi.hoisted(() => ({ fetchTable: vi.fn() }))
vi.mock('../../lib/catalog-source', () => ({ catalogFetcher: source.fetchTable }))

async function open() {
  renderWithProviders(<GlobalSearch />)
  fireEvent.click(screen.getByRole('button', { name: 'Пошук у довіднику' }))
  return await screen.findByLabelText('Пошук')
}

async function type(field: HTMLElement, value: string) {
  await act(async () => {
    fireEvent.change(field, { target: { value } })
  })
}

describe('GlobalSearch', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('uk'))
    const catalog = demoCatalog()
    source.fetchTable.mockReset()
    source.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])
  })

  it('groups what it finds and shows nothing before two letters', async () => {
    const field = await open()
    await type(field, 'r')
    expect(screen.queryByText('Схеми')).not.toBeInTheDocument()

    await type(field, 'r-chop')
    expect(await screen.findByText('Схеми')).toBeInTheDocument()
    expect(screen.getByText('R-CHOP-21')).toBeInTheDocument()
  })

  it('finds a regimen by a drug in it, and the drug as a way into the disease', async () => {
    const field = await open()
    await type(field, 'ритуксимаб')
    expect(await screen.findByText('R-CHOP-21')).toBeInTheDocument()
    expect(screen.getByText('Препарати')).toBeInTheDocument()
  })

  it('finds a disease by its ICD-10 code', async () => {
    const field = await open()
    await type(field, 'c83')
    expect(await screen.findByText('Захворювання')).toBeInTheDocument()
    expect(screen.getByText('ДЕМО Дифузна В-великоклітинна лімфома')).toBeInTheDocument()
  })

  it('says so when it finds nothing', async () => {
    const field = await open()
    await type(field, 'карфілзоміб')
    expect(await screen.findByText('Нічого не знайдено.')).toBeInTheDocument()
  })

  it('closes the window when a result is chosen', async () => {
    const field = await open()
    await type(field, 'r-chop')
    await act(async () => {
      fireEvent.click(await screen.findByText('R-CHOP-21'))
    })
    expect(screen.queryByLabelText('Пошук')).not.toBeInTheDocument()
  })
})
