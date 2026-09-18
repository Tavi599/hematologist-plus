// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { makeXlsx, sheetXlsx } from './__fixtures__/make-xlsx'
import { columnIndex, readWorkbook } from './xlsx'

let dir: string | undefined
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true })
  dir = undefined
})

function write(buffer: Buffer): string {
  dir ??= mkdtempSync(join(tmpdir(), 'hp-xlsx-'))
  const file = join(dir, 'book.xlsx')
  writeFileSync(file, buffer)
  return file
}

describe('readWorkbook', () => {
  it('reads shared strings, numbers and the sheet name', () => {
    const file = write(
      sheetXlsx([
        ['Препарат', 'Дозування'],
        ['Ритуксимаб', '100 мг'],
        ['Доксорубіцин', 50],
      ]),
    )
    const [sheet] = readWorkbook(file)
    expect(sheet?.name).toBe('Список')
    expect(sheet?.rows).toEqual([
      ['Препарат', 'Дозування'],
      ['Ритуксимаб', '100 мг'],
      ['Доксорубіцин', 50],
    ])
  })

  it('keeps columns aligned when cells are empty or skipped', () => {
    // Excel writes empty styled cells as <c r="B5" s="1"/> and omits others entirely.
    const file = write(
      makeXlsx({
        'xl/workbook.xml': '<workbook><sheets><sheet name="A" r:id="rId1"/></sheets></workbook>',
        'xl/_rels/workbook.xml.rels':
          '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
        'xl/sharedStrings.xml': '<sst><si><t>назва</t></si><si><t>форма</t></si></sst>',
        'xl/worksheets/sheet1.xml':
          '<worksheet><sheetData>' +
          '<row r="1"><c r="A1" s="1"/><c r="B1" s="2" t="s"><v>0</v></c><c r="D1" t="s"><v>1</v></c></row>' +
          '<row r="3"><c r="C3"><v>7</v></c></row>' +
          '</sheetData></worksheet>',
      }),
    )
    const [sheet] = readWorkbook(file)
    expect(sheet?.rows).toEqual([[null, 'назва', null, 'форма'], [], [null, null, 7]])
  })

  it('reads inline strings, rich text and uncompressed entries', () => {
    const file = write(
      makeXlsx(
        {
          'xl/workbook.xml': '<workbook><sheets><sheet name="B" r:id="rId1"/></sheets></workbook>',
          'xl/_rels/workbook.xml.rels':
            '<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>',
          'xl/sharedStrings.xml': '<sst><si><r><t>Ме</t></r><r><t>тотрексат</t></r></si></sst>',
          'xl/worksheets/sheet1.xml':
            '<worksheet><sheetData>' +
            '<row r="1"><c r="A1" t="s"><v>0</v></c>' +
            '<c r="B1" t="inlineStr"><is><t>50 мг &amp; 100 мг</t></is></c>' +
            '<c r="C1" t="b"><v>1</v></c><c r="D1" t="str"><v>формула</v></c></row>' +
            '</sheetData></worksheet>',
        },
        { store: true },
      ),
    )
    expect(readWorkbook(file)[0]?.rows[0]).toEqual([
      'Метотрексат',
      '50 мг & 100 мг',
      true,
      'формула',
    ])
  })

  it('maps column letters to indexes', () => {
    expect(columnIndex('A1')).toBe(0)
    expect(columnIndex('C3')).toBe(2)
    expect(columnIndex('AA10')).toBe(26)
  })

  it('rejects data that is not a workbook', () => {
    expect(() => readWorkbook(write(Buffer.from('not a zip')))).toThrow(/not a ZIP/)
  })
})
