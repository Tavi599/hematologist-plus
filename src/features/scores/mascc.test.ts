import { describe, expect, it } from 'vitest'

import { mascc } from './mascc'

describe('MASCC', () => {
  it('adds the weights up to 26 and calls 21 or more standard risk', () => {
    const all = {
      burden: '5',
      noHypotension: true,
      noCopd: true,
      noFungal: true,
      noDehydration: true,
      outpatient: true,
      under60: true,
    }
    expect(mascc.compute(all)?.value?.amount).toBe(26)
    // 5 + 5 + 4 + 4 + 3 = 21: the threshold itself is standard risk.
    const edge = mascc.compute({ ...all, outpatient: false, under60: false })
    expect(edge?.value?.amount).toBe(21)
    expect(edge?.group?.tone).toBe('green')
    const below = mascc.compute({ ...all, burden: '3', outpatient: false, under60: false })
    expect(below?.value?.amount).toBe(19)
    expect(below?.group?.tone).toBe('red')
  })

  it('waits for the burden of illness', () => {
    expect(mascc.compute({ noCopd: true })).toBeNull()
  })
})
