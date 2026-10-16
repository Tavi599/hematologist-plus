import { describe, expect, it } from 'vitest'

import type { XlsxSheet } from '../../lib/xlsx-writer'

import { columnIndex, heightPx, previewGrid, widthPx } from './sheet-preview'

describe('columnIndex', () => {
  it('reads the letters of a column', () => {
    expect(columnIndex('A')).toBe(0)
    expect(columnIndex('I')).toBe(8)
    expect(columnIndex('AA')).toBe(26)
    expect(columnIndex('ab')).toBe(27)
  })
})

describe('previewGrid', () => {
  it('pads every row to the width of the sheet', () => {
    const sheet: XlsxSheet = {
      name: 'День 1',
      widths: [10, 10, 10],
      rows: [['Препарат'], ['Ритуксимаб', '840 мг']],
    }

    const grid = previewGrid(sheet)

    expect(grid.widths).toEqual([10, 10, 10])
    expect(grid.rows).toHaveLength(2)
    expect(grid.rows.map((row) => row.cells.length)).toEqual([3, 3])
    expect(grid.rows[0]?.cells[0]?.value).toBe('Препарат')
    expect(grid.rows[0]?.cells[2]?.value).toBe('')
    expect(grid.rows[1]?.cells[1]?.value).toBe('840 мг')
  })

  it('turns a merged range into one cell and drops the cells it covers', () => {
    const sheet: XlsxSheet = {
      name: 'Лист',
      widths: [8, 8, 8],
      rows: [
        ['Шапка', null, null],
        ['A', 'B', 'C'],
        ['D', 'E', 'F'],
      ],
      merges: ['A1:C1', 'A2:A3'],
    }

    const grid = previewGrid(sheet)

    const head = grid.rows[0]?.cells ?? []
    expect(head).toHaveLength(1)
    expect(head[0]).toMatchObject({ value: 'Шапка', colSpan: 3, rowSpan: 1 })

    const second = grid.rows[1]?.cells ?? []
    expect(second[0]).toMatchObject({ value: 'A', rowSpan: 2, colSpan: 1 })
    // The third row lost the cell the vertical merge swallowed, so it is one shorter.
    expect(grid.rows[2]?.cells.map((cell) => cell.value)).toEqual(['E', 'F'])
  })

  it('keeps the format and the height of a row', () => {
    const sheet: XlsxSheet = {
      name: 'Лист',
      widths: [12],
      heights: [21],
      rows: [[{ value: 'Ондансетрон', format: { font: { bold: true }, align: 'center' } }]],
    }

    const grid = previewGrid(sheet)

    expect(grid.rows[0]?.heightPt).toBe(21)
    expect(grid.rows[0]?.cells[0]?.format).toEqual({ font: { bold: true }, align: 'center' })
  })

  it('writes a number out and leaves an empty cell empty', () => {
    const grid = previewGrid({ name: 'Лист', widths: [8, 8], rows: [[2, null]] })

    expect(grid.rows[0]?.cells.map((cell) => cell.value)).toEqual(['2', ''])
  })

  it('runs the grid down to a merge that reaches past the last row with a value', () => {
    const grid = previewGrid({
      name: 'Лист',
      widths: [8],
      rows: [['Підпис']],
      merges: ['A1:A3'],
    })

    expect(grid.rows).toHaveLength(3)
    expect(grid.rows[0]?.cells[0]).toMatchObject({ value: 'Підпис', rowSpan: 3 })
    // The rows the merge covers hold no cell of their own.
    expect(grid.rows[1]?.cells).toEqual([])
  })

  it('ignores a range it cannot read instead of losing the sheet', () => {
    const grid = previewGrid({ name: 'Лист', widths: [8], rows: [['A']], merges: ['nonsense'] })

    expect(grid.rows[0]?.cells[0]).toMatchObject({ value: 'A', rowSpan: 1, colSpan: 1 })
  })

  it('gives a sheet without widths Excel’s own column width', () => {
    const grid = previewGrid({ name: 'Лист', rows: [['A', 'B']] })

    expect(grid.widths).toEqual([8.43, 8.43])
  })

  it('scales a width and a height to pixels', () => {
    expect(widthPx(10, 1)).toBe(70)
    expect(widthPx(10, 0.5)).toBe(35)
    expect(heightPx(21, 1)).toBe(28)
  })
})
