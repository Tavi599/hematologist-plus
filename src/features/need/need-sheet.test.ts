import { describe, expect, it } from 'vitest'

import { buildNeedSheet, type NeedSheetRow } from './need-sheet'

const row: NeedSheetRow = {
  name: 'Вориконазол Аккорд 200 мг',
  unit: 'таб',
  orderRef: '1280-Р від 22.07.26',
  patients: 5,
  total: 308,
  stock: 0,
  monthlyUse: 60,
  months: 5,
  proposed: 308,
}

const text = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object' && 'value' in value) return String(value.value ?? '')
  return String(value)
}

describe('buildNeedSheet', () => {
  it('lays the form out as the Ministry’s appendix: nine graphs, title over them', () => {
    const sheet = buildNeedSheet([row], 'Потреба')
    expect(sheet.widths).toHaveLength(9)
    expect(text(sheet.rows[1]?.[0])).toContain('Узагальнена інформація')
    expect(sheet.rows[2]?.map(text)[0]).toBe('Назва ЗОЗ, що отримає товар')
    expect(sheet.rows[2]).toHaveLength(9)
    expect(sheet.merges).toContain('A2:I2')
  })

  it('writes a line of the table into the graphs in order', () => {
    const sheet = buildNeedSheet([row], 'Потреба')
    expect(sheet.rows[3]?.map(text)).toEqual([
      'Вориконазол Аккорд 200 мг',
      'таб',
      '1280-Р від 22.07.26',
      '5',
      '308',
      '0',
      '60',
      '5',
      '308',
    ])
  })

  it('keeps every signatory of the form, each with a place for the name', () => {
    const sheet = buildNeedSheet([row, row], 'Потреба')
    const rows = sheet.rows.map((cells) => cells.map(text))
    expect(rows.at(-4)?.[0]).toBe('Керівник закладу')
    expect(rows.at(-4)?.at(-1)).toBe('ПІБ')
    expect(rows.at(-3)?.[0]).toBe('Головний бухгалтер')
    expect(rows.at(-2)?.[0]).toBe('Відповідальний фахівець')
    expect(rows.at(-1)?.[0]).toBe('тел. відповідального фахівця')
    // Two lines of the table, so the names sit two rows lower than with one.
    expect(sheet.merges).toContain('H7:I7')
    expect(sheet.heights).toHaveLength(sheet.rows.length)
  })

  it('prints an empty form to fill in by hand when nothing is counted yet', () => {
    const sheet = buildNeedSheet([], 'Потреба')
    expect(sheet.rows[3]?.map(text)).toEqual(['', '', '', '', '', '', '', '', ''])
  })
})
