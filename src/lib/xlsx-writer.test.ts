import { describe, expect, it } from 'vitest'

import { buildXlsx, columnName, sheetName } from './xlsx-writer'

/** Reads back the stored entries of the zip the writer produced. */
function unzip(file: Uint8Array): Map<string, string> {
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength)
  const decoder = new TextDecoder()
  const entries = new Map<string, string>()
  let offset = 0
  while (offset + 4 <= file.length && view.getUint32(offset, true) === 0x04034b50) {
    const size = view.getUint32(offset + 18, true)
    const nameLength = view.getUint16(offset + 26, true)
    const extraLength = view.getUint16(offset + 28, true)
    const name = decoder.decode(file.subarray(offset + 30, offset + 30 + nameLength))
    const start = offset + 30 + nameLength + extraLength
    entries.set(name, decoder.decode(file.subarray(start, start + size)))
    offset = start + size
  }
  return entries
}

describe('buildXlsx', () => {
  it('writes the parts a spreadsheet program needs to open the file', () => {
    const file = buildXlsx([
      { name: 'День 1', rows: [['а']] },
      { name: 'Стаціонар', rows: [['б']] },
    ])
    const entries = unzip(file)

    expect([...entries.keys()]).toEqual([
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
    ])
    expect(entries.get('xl/workbook.xml')).toContain(
      '<sheet name="День 1" sheetId="1" r:id="rId1"/>',
    )
    expect(entries.get('xl/_rels/workbook.xml.rels')).toContain('Target="worksheets/sheet2.xml"')
    expect(entries.get('[Content_Types].xml')).toContain('/xl/worksheets/sheet2.xml')
    // The end-of-directory record closes the file and names every entry.
    const view = new DataView(file.buffer, file.byteOffset, file.byteLength)
    expect(view.getUint32(file.length - 22, true)).toBe(0x06054b50)
    expect(view.getUint16(file.length - 12, true)).toBe(7)
  })

  it('writes text as inline strings, numbers as numbers and escapes markup', () => {
    const sheet = unzip(
      buildXlsx([{ name: 'S', rows: [['NaCl 0,9% <500 мл>', 750, { value: 2, style: 'cell' }]] }]),
    ).get('xl/worksheets/sheet1.xml')

    expect(sheet).toContain(
      '<c r="A1" t="inlineStr"><is><t xml:space="preserve">NaCl 0,9% &lt;500 мл&gt;</t></is></c>',
    )
    expect(sheet).toContain('<c r="B1"><v>750</v></c>')
    expect(sheet).toContain('<c r="C1" s="4"><v>2</v></c>')
  })

  it('keeps an empty cell that carries a border and drops one that does not', () => {
    // The hour grid is mostly empty; without the cells the ruled columns disappear.
    const sheet = unzip(
      buildXlsx([{ name: 'S', rows: [[null, { value: null, style: 'mark' }, 'x']] }]),
    ).get('xl/worksheets/sheet1.xml')

    expect(sheet).not.toContain('r="A1"')
    expect(sheet).toContain('<c r="B1" s="5"/>')
  })

  it('writes column widths and merged ranges', () => {
    const sheet = unzip(
      buildXlsx([{ name: 'S', widths: [4, 26], rows: [['x']], merges: ['A1:G1'] }]),
    ).get('xl/worksheets/sheet1.xml')

    expect(sheet).toContain('<col min="2" max="2" width="26" customWidth="1"/>')
    expect(sheet).toContain('<mergeCells count="1"><mergeCell ref="A1:G1"/></mergeCells>')
  })

  it('refuses a workbook without sheets', () => {
    expect(() => buildXlsx([])).toThrow()
  })
})

describe('sheetName', () => {
  it('drops the characters Excel refuses and keeps names unique', () => {
    const taken = new Set<string>()
    expect(sheetName('День 1 / 19.09', taken)).toBe('День 1   19.09')
    taken.add('День 1')
    expect(sheetName('День 1', taken)).toBe('День 1 2')
    expect(sheetName('  ', new Set())).toBe('Sheet')
  })

  it('stays within the 31 characters Excel allows, even when numbering', () => {
    const long = 'Стаціонарний лист призначень відділення'
    const first = sheetName(long, new Set())
    expect(first).toHaveLength(31)
    expect(sheetName(long, new Set([first]))).toHaveLength(31)
  })
})

describe('columnName', () => {
  it('numbers columns the way a spreadsheet does', () => {
    expect([0, 25, 26, 27, 51, 52].map(columnName)).toEqual(['A', 'Z', 'AA', 'AB', 'AZ', 'BA'])
  })
})
