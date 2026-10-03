import { describe, expect, it } from 'vitest'

import {
  defaultMonthlyUse,
  needLineTotals,
  needSheetRows,
  newNeedLine,
  type NeedLine,
} from './need-lines'

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
    expect(needLineTotals(filled())).toEqual({
      total: 12,
      monthlyUse: 4,
      monthsCovered: 3,
      proposed: 12,
    })
  })

  it('takes the average month from a month of the whole department', () => {
    // Two patients, three packs each in a course and a course to a month: six packs a month, and
    // the six courses planned come out of the division as six months.
    const line = filled({ packsPerCourse: 3, monthlyUse: null })
    expect(defaultMonthlyUse(line)).toBe(6)
    expect(needLineTotals(line)).toMatchObject({ total: 36, monthlyUse: 6, monthsCovered: 6 })
  })

  it('keeps the figure the department typed over the counted one', () => {
    expect(needLineTotals(filled({ packsPerCourse: 3, monthlyUse: 9 }))).toMatchObject({
      monthlyUse: 9,
      monthsCovered: 4,
    })
  })

  it('has no month to count without patients to spend it', () => {
    expect(defaultMonthlyUse(filled({ patients: null, monthlyUse: null }))).toBeNull()
  })

  it('keeps the months the department typed over the division', () => {
    expect(needLineTotals(filled({ months: 7 })).monthsCovered).toBe(7)
  })

  it('leaves the average month empty when there is no course to count it from', () => {
    expect(defaultMonthlyUse(filled({ packsPerCourse: null, monthlyUse: null }))).toBeNull()
    expect(needLineTotals(filled({ packsPerCourse: null, monthlyUse: null }))).toMatchObject({
      monthlyUse: null,
      monthsCovered: null,
    })
  })

  it('proposes the whole need unless a figure is typed over it', () => {
    expect(needLineTotals(filled({ proposed: 8 })).proposed).toBe(8)
  })

  it('counts nothing out of a line that is only started', () => {
    expect(needLineTotals(newNeedLine('line-2'))).toEqual({
      total: 0,
      monthlyUse: null,
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
