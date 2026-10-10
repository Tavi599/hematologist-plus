import { describe, expect, it } from 'vitest'

import type { RegimenItem } from '../schemas/catalog'
import type { CourseItem } from './course-input'
import { needsPremedicationOn, premedicationOnByDefault, unpremedicated } from './premedication'

function entry(id: string, drug: string, role: RegimenItem['role'], days: number[]): CourseItem {
  return {
    item: { id, regimen_id: 'r', drug_id: drug, role, route: 'iv_infusion', days } as RegimenItem,
  } as CourseItem
}

const rchop = [
  entry('paracetamol', 'paracetamol', 'premedication', [1]),
  entry('dexamethasone', 'dexamethasone', 'premedication', [1]),
  entry('ondansetron', 'ondansetron', 'premedication', [1]),
  entry('rituximab', 'rituximab', 'main', [1]),
  entry('doxorubicin', 'doxorubicin', 'main', [1]),
]

describe('premedication', () => {
  it('opens a rituximab or daratumumab regimen with its premedication on', () => {
    expect(needsPremedicationOn(rchop)).toBe(true)
    expect([...premedicationOnByDefault(rchop)]).toEqual(['paracetamol', 'dexamethasone'])
  })

  it('leaves the premedication of other regimens to the physician', () => {
    const obi = [
      entry('paracetamol', 'paracetamol', 'premedication', [1]),
      entry('obinutuzumab', 'obinutuzumab', 'main', [1]),
    ]
    expect(needsPremedicationOn(obi)).toBe(false)
    expect(premedicationOnByDefault(obi).size).toBe(0)
  })

  it('flags the days a drug that asks for premedication gets none', () => {
    expect(unpremedicated(rchop, []).size).toBe(0)
    // An antiemetic is not premedication for the antibody.
    expect(unpremedicated(rchop, ['paracetamol', 'dexamethasone'])).toEqual(
      new Map([['rituximab', [1]]]),
    )
    const dara = [
      entry('paracetamol', 'paracetamol', 'premedication', [1]),
      entry('daratumumab', 'daratumumab', 'main', [1, 8]),
    ]
    expect(unpremedicated(dara, [])).toEqual(new Map([['daratumumab', [8]]]))
    // A drug switched off asks for nothing.
    expect(unpremedicated(dara, ['daratumumab']).size).toBe(0)
  })
})
