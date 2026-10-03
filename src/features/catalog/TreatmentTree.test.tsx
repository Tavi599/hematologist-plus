import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { indexCatalog } from '../../lib/catalog-index'
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

  it('says so when a disease has no treatment tree yet', () => {
    const rows = emptyCatalog()
    renderWithProviders(<TreatmentTree catalog={indexCatalog(rows)} diseaseId="cll" />)

    expect(screen.getByText(/ще не заповнене/)).toBeInTheDocument()
  })
})
