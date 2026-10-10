import { describe, expect, it } from 'vitest'

import { demoCatalog } from './catalog.fixture'
import { indexCatalog } from './catalog-index'
import { contraindicated, regimenCautions } from './cautions'
import type { DrugCaution } from '../schemas/common'

const source = { name: 'FDA label', checkedOn: '2026-10-10' }
const note = { uk: 'п', en: 'n' }

function setup(cautions: DrugCaution[], role: 'main' | 'premedication' = 'main') {
  const rows = demoCatalog()
  const item = rows.regimen_items.find((entry) => entry.role === 'main')!
  item.role = role
  const drug = rows.drugs.find((entry) => entry.id === item.drug_id)!
  drug.cautions = cautions
  return { catalog: indexCatalog(rows), regimenId: item.regimen_id, drugId: drug.id }
}

describe('regimen cautions', () => {
  const renal: DrugCaution = { condition: 'renal', level: 'dose_reduction', notes: note, source }
  const renalNo: DrugCaution = { condition: 'renal', level: 'contraindicated', notes: note, source }
  const heart: DrugCaution = { condition: 'cardiac', level: 'caution', notes: note, source }

  it('says nothing until a condition is chosen', () => {
    const { catalog, regimenId } = setup([renal])
    expect(regimenCautions(catalog, regimenId, [])).toEqual([])
  })

  it('names the drug with only the conditions chosen, at its strongest level', () => {
    const { catalog, regimenId, drugId } = setup([renalNo, heart])
    const found = regimenCautions(catalog, regimenId, ['renal', 'cardiac'])
    expect(found.filter((entry) => entry.drugId === drugId)).toEqual([
      { drugId, level: 'contraindicated', cautions: [renalNo, heart] },
    ])
    expect(contraindicated(catalog, regimenId, ['renal'])).toBe(true)
    expect(contraindicated(catalog, regimenId, ['cardiac'])).toBe(false)
  })

  it('reads a drug given at a lower dose and forbidden only when severe as a dose reduction', () => {
    const { catalog, regimenId, drugId } = setup([renal, renalNo])
    const found = regimenCautions(catalog, regimenId, ['renal'])
    expect(found.find((entry) => entry.drugId === drugId)?.level).toBe('dose_reduction')
    expect(contraindicated(catalog, regimenId, ['renal'])).toBe(false)
  })

  it('leaves out a premedication drug', () => {
    const { catalog, regimenId, drugId } = setup([renalNo], 'premedication')
    expect(
      regimenCautions(catalog, regimenId, ['renal']).some((entry) => entry.drugId === drugId),
    ).toBe(false)
  })
})
