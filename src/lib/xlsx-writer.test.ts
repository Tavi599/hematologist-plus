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
      { name: 'Стацлист', rows: [['б']] },
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
      buildXlsx([
        { name: 'S', rows: [['NaCl 0,9% <500 мл>', 750, { value: 2, format: { wrap: true } }]] },
      ]),
    ).get('xl/worksheets/sheet1.xml')

    expect(sheet).toContain(
      '<c r="A1" t="inlineStr"><is><t xml:space="preserve">NaCl 0,9% &lt;500 мл&gt;</t></is></c>',
    )
    expect(sheet).toContain('<c r="B1"><v>750</v></c>')
    expect(sheet).toContain('<c r="C1" s="1"><v>2</v></c>')
  })

  it('keeps the line break inside a cell and drops characters Excel refuses', () => {
    const sheet = unzip(
      buildXlsx([{ name: 'S', rows: [[{ value: 'Цитарабін\n0,9% NaCl', format: {} }]] }]),
    ).get('xl/worksheets/sheet1.xml')

    expect(sheet).toContain('>Цитарабін\n0,9% NaCl</t>')
  })

  it('keeps an empty cell that carries a format and drops one that does not', () => {
    // The hour grid is mostly empty; without the cells the ruled columns disappear.
    const sheet = unzip(
      buildXlsx([
        { name: 'S', rows: [[null, { value: null, format: { box: { left: 'thin' } } }, 'x']] },
      ]),
    ).get('xl/worksheets/sheet1.xml')

    expect(sheet).not.toContain('r="A1"')
    expect(sheet).toContain('<c r="B1" s="1"/>')
  })

  it('writes column widths, row heights and merged ranges', () => {
    const sheet = unzip(
      buildXlsx([
        { name: 'S', widths: [4, 26], heights: [15, 23.25], rows: [['x'], []], merges: ['A1:G1'] },
      ]),
    ).get('xl/worksheets/sheet1.xml')

    expect(sheet).toContain('<col min="2" max="2" width="26" customWidth="1"/>')
    expect(sheet).toContain('<row r="1" ht="15" customHeight="1">')
    // The second row has a height but no cells; it still has to be written or the blank shrinks.
    expect(sheet).toContain('<row r="2" ht="23.25" customHeight="1"></row>')
    expect(sheet).toContain('<mergeCells count="1"><mergeCell ref="A1:G1"/></mergeCells>')
  })

  it('sets up the page so a wide sheet prints whole instead of losing a column', () => {
    const sheet = unzip(buildXlsx([{ name: 'S', rows: [['x']] }])).get('xl/worksheets/sheet1.xml')

    expect(sheet).toContain('<pageSetUpPr fitToPage="1"/>')
    expect(sheet).toContain('fitToWidth="1" fitToHeight="0" orientation="landscape"')
    expect(sheet).toContain('<printOptions horizontalCentered="1" gridLines="1"/>')
  })

  it('writes each font, border and format once however many cells share it', () => {
    const bold = { font: { size: 16, bold: true }, box: { left: 'thin' as const }, wrap: true }
    const styles = unzip(
      buildXlsx([
        {
          name: 'S',
          rows: [
            [
              { value: '+', format: bold },
              { value: '+', format: bold },
            ],
          ],
        },
      ]),
    ).get('xl/styles.xml')

    expect(styles).toContain('<fonts count="2">')
    expect(styles).toContain('<b/><sz val="16"/><name val="Arial"/>')
    expect(styles).toContain('<borders count="2">')
    expect(styles).toContain('<cellXfs count="2">')
    expect(styles).toContain('<alignment wrapText="1"/>')
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
