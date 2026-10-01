import { describe, expect, it } from 'vitest'

import { needLineTotals, needSheetRows, newNeedLine, type NeedLine } from './need-lines'

const filled = (patch: Partial<NeedLine> = {}): NeedLine => ({
  ...newNeedLine('line-1'),
  drugId: 'rituximab',
  presentationId: 'rituximab.vial-500',
  name: 'Мабтера 500 мг',
  orderRef: '1253-Р від 20.07.2026',
  patients: 2,
  courses: 6,
  packsPerCourse: 1,
  stock: 1,
  monthlyUse: 4,
  ...patch,
})

describe('needLineTotals', () => {
  it('counts the whole planned treatment of every patient', () => {
    expect(needLineTotals(filled())).toEqual({ total: 12, monthsCovered: 3, proposed: 12 })
  })

  it('proposes the whole need unless a figure is typed over it', () => {
    expect(needLineTotals(filled({ proposed: 8 })).proposed).toBe(8)
  })

  it('counts nothing out of a line that is only started', () => {
    expect(needLineTotals(newNeedLine('line-2'))).toEqual({
      total: 0,
      monthsCovered: null,
      proposed: 0,
    })
  })
})

describe('needSheetRows', () => {
  const rows = (lines: NeedLine[]) =>
    needSheetRows(
      lines,
      () => 'флак',
      (line) => line.name,
    )

  it('writes a filled line out with the counted graphs', () => {
    expect(rows([filled()])).toEqual([
      {
        name: 'Мабтера 500 мг',
        unit: 'флак',
        orderRef: '1253-Р від 20.07.2026',
        patients: 2,
        total: 12,
        stock: 1,
        monthlyUse: 4,
        months: 3,
        proposed: 12,
      },
    ])
  })

  it('leaves a line nobody has filled in out of the file', () => {
    expect(rows([newNeedLine('line-2')])).toEqual([])
  })

  it('leaves a graph empty rather than writing a nought into it', () => {
    const row = rows([filled({ patients: null, proposed: null })])[0]
    expect(row?.total).toBeNull()
    expect(row?.proposed).toBeNull()
    expect(row?.months).toBe(0)
  })
})
