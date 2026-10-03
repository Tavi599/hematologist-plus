import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import { indexCatalog } from '../../lib/catalog-index'
import { resetOnlyObtainable, setOnlyObtainable } from '../../lib/only-obtainable'
import { emptyCatalog, type TreatmentNode } from '../../schemas/catalog'
import { renderWithProviders } from '../../test/render'

import { TreatmentTree } from './TreatmentTree'

function node(id: string, parent: string | null, title: string): TreatmentNode {
  return {
    id,
    disease_id: 'cll',
    parent_id: parent,
    kind: 'line',
    title: { uk: title, en: title },
    description: null,
    sort_order: 0,
  }
}

describe('TreatmentTree', () => {
  afterEach(() => {
    window.localStorage.clear()
    resetOnlyObtainable()
  })

  it('renders a hierarchy', () => {
    const rows = emptyCatalog()
    rows.diseases = [
      { id: 'cll', name: { uk: 'ХЛЛ' }, summary: null, sort_order: 0, references_json: [] },
    ]
    rows.treatment_nodes = [node('a', null, 'Перша лінія'), node('b', 'a', 'Підгрупа')]
    renderWithProviders(<TreatmentTree catalog={indexCatalog(rows)} diseaseId="cll" />)

    expect(screen.getByText('Перша лінія')).toBeInTheDocument()
    expect(screen.getByText('Підгрупа')).toBeInTheDocument()
  })

  it('leaves a regimen unlabelled when every drug of it is registered', () => {
    const rows = demoCatalog()
    renderWithProviders(<TreatmentTree catalog={indexCatalog(rows)} diseaseId="dlbcl" />)

    expect(screen.getByText('R-CHOP-21')).toBeInTheDocument()
    // Registration is the ordinary case: a badge on it would sit on almost every regimen and
    // say nothing. Only a drug the department cannot get at all is worth the physician's eye.
    expect(screen.queryByText(/зареєстрований/)).not.toBeInTheDocument()
  })

  it('marks a regimen whose drug cannot be obtained', () => {
    const rows = demoCatalog()
    rows.drugs.find((drug) => drug.id === 'rituximab')!.availability = 'unavailable'
    renderWithProviders(<TreatmentTree catalog={indexCatalog(rows)} diseaseId="dlbcl" />)

    expect(screen.getByText('недоступний')).toBeInTheDocument()
  })

  it('says so when a disease has no treatment tree yet', () => {
    const rows = emptyCatalog()
    renderWithProviders(<TreatmentTree catalog={indexCatalog(rows)} diseaseId="cll" />)

    expect(screen.getByText(/ще не заповнене/)).toBeInTheDocument()
  })

  it('shows a described course as a card with no way into the calculator', () => {
    const rows = demoCatalog()
    rows.regimens.push({
      ...rows.regimens[0]!,
      id: 'only-described',
      short_name: 'Глофіт-GemOx',
      name: { uk: 'Глофітамаб + GemOx' },
      sources: [{ name: 'UpToDate: тема', checkedOn: '2026-10-03' }],
      reference: {
        summary: { uk: 'Рецидив ДВКЛ.' },
        drugs: [{ name: { uk: 'Глофітамаб' } }, { name: { uk: 'Гемцитабін' } }],
        key_info: [{ uk: 'Цикли по 21 дню.' }],
        gap: { uk: 'UpToDate не вказує день GemOx.' },
        availability: 'unavailable',
      },
    })
    rows.treatment_nodes.push({
      ...node('ref', null, 'Для ознайомлення'),
      disease_id: 'dlbcl',
      kind: 'reference',
    })
    rows.treatment_node_regimens.push({
      id: 'ref.only-described',
      node_id: 'ref',
      regimen_id: 'only-described',
      notes: null,
      sort_order: 0,
    })
    renderWithProviders(<TreatmentTree catalog={indexCatalog(rows)} diseaseId="dlbcl" />)

    expect(screen.getByText('Глофіт-GemOx')).toBeInTheDocument()
    expect(screen.getByText('лише опис, без розрахунку')).toBeInTheDocument()
    expect(screen.getByText('недоступний в Україні')).toBeInTheDocument()
    expect(screen.getByText('Глофітамаб, Гемцитабін')).toBeInTheDocument()
    expect(screen.getByText('Цикли по 21 дню.')).toBeInTheDocument()
    expect(screen.getByText(/UpToDate не вказує день GemOx/)).toBeInTheDocument()
    // The ordinary regimen of the same tree keeps its way into the calculator; the described
    // one has none.
    expect(screen.getAllByRole('link', { name: /Розрахувати/ })).toHaveLength(1)
    expect(screen.queryByRole('link', { name: 'Глофіт-GemOx' })).not.toBeInTheDocument()
  })

  it('hides the regimens that cannot be obtained when asked, and says how many', async () => {
    const rows = demoCatalog()
    rows.drugs.find((drug) => drug.id === 'rituximab')!.availability = 'unavailable'
    renderWithProviders(<TreatmentTree catalog={indexCatalog(rows)} diseaseId="dlbcl" />)
    expect(screen.getByText('R-CHOP-21')).toBeInTheDocument()

    await act(async () =>
      fireEvent.click(screen.getByRole('switch', { name: 'Приховати недоступні схеми' })),
    )

    expect(screen.queryByText('R-CHOP-21')).not.toBeInTheDocument()
    expect(screen.getByText('Приховано схем: 1')).toBeInTheDocument()
    // The choice is kept for the next page.
    expect(window.localStorage.getItem('hp.onlyObtainable')).toBe('1')
  })

  it('opens with the unobtainable regimens already hidden once the choice was made', () => {
    setOnlyObtainable(true)
    const rows = demoCatalog()
    rows.drugs.find((drug) => drug.id === 'rituximab')!.availability = 'unavailable'
    renderWithProviders(<TreatmentTree catalog={indexCatalog(rows)} diseaseId="dlbcl" />)

    expect(screen.queryByText('R-CHOP-21')).not.toBeInTheDocument()
  })
})
