import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { indexCatalog } from '../../lib/catalog-index'
import { demoCatalog } from '../../lib/catalog.fixture'
import { buildCourseItems } from '../../lib/course-input'
import { renderWithProviders } from '../../test/render'
import { PreparationTable } from './PreparationTable'

const source = { name: 'Інструкція (тест)', checkedOn: '2026-10-25' }

function render(disabledIds: string[] = []) {
  const rows = demoCatalog()
  const cyclophosphamide = rows.drugs.find((drug) => drug.id === 'cyclophosphamide')!
  cyclophosphamide.preparation = [
    {
      routes: ['iv_infusion'],
      notes: { uk: 'Порошок 1 г розчиняють у 50 мл NaCl 0,9%.' },
      source,
    },
    { routes: ['oral'], notes: { uk: 'Таблетки не ділять.' }, source },
  ]
  const catalog = indexCatalog(rows)
  const items = buildCourseItems(catalog, 'r-chop-21')
  renderWithProviders(
    <PreparationTable catalog={catalog} items={items} disabledIds={disabledIds} />,
  )
}

describe('PreparationTable', () => {
  it('shows the label text for the routes of the course, and the infusion parameters', () => {
    render()
    const cyclophosphamide = screen.getByRole('article', { name: 'ДЕМО Циклофосфамід' })
    expect(
      within(cyclophosphamide).getByText('Порошок 1 г розчиняють у 50 мл NaCl 0,9%.'),
    ).toBeInTheDocument()
    // A route the course does not give it by is left out.
    expect(within(cyclophosphamide).queryByText('Таблетки не ділять.')).not.toBeInTheDocument()
    expect(within(cyclophosphamide).getByText('Інструкція (тест)')).toBeInTheDocument()

    const rituximab = screen.getByRole('article', { name: 'ДЕМО Ритуксимаб' })
    expect(
      within(rituximab).getByText(/NaCl 0,9% · розчинник 100 \/ 250 \/ 500 мл/),
    ).toBeInTheDocument()
  })

  it('says so when the catalog has nothing, and leaves out a tablet and a disabled drug', () => {
    render(['r-chop-21.vincristine'])
    const doxorubicin = screen.getByRole('article', { name: 'ДЕМО Доксорубіцин' })
    expect(within(doxorubicin).getByText(/Тексту інструкції про приготування/)).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'ДЕМО Преднізолон' })).not.toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'ДЕМО Вінкристин' })).not.toBeInTheDocument()
  })
})
