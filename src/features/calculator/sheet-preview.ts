/**
 * The sheet as it will land in the workbook, laid out for the screen: the physician sees the
 * blank before downloading it, so a column that came out too narrow or an order that fell off
 * the day is caught here instead of in Excel.
 *
 * It reads the very same `XlsxSheet` the writer is given, so the preview cannot drift from the
 * file: a cell shown here is the cell written there.
 */

import type { XlsxFormat, XlsxInput, XlsxSheet } from '../../lib/xlsx-writer'

export interface PreviewCell {
  value: string
  format: XlsxFormat | undefined
  /** 1 unless the cell heads a merged range. */
  rowSpan: number
  colSpan: number
}

export interface PreviewRow {
  /** Height in points, as the sheet gives it; absent for a row left to the default. */
  heightPt: number | undefined
  cells: PreviewCell[]
}

export interface PreviewGrid {
  /** Column widths in characters, one per column of the widest row. */
  widths: number[]
  rows: PreviewRow[]
}

/** Column letters as their index (A = 0), so a merge in A1 notation can be placed on the grid. */
export function columnIndex(letters: string): number {
  let index = 0
  for (const letter of letters.toUpperCase()) {
    index = index * 26 + (letter.charCodeAt(0) - 64)
  }
  return index - 1
}

interface Span {
  rows: number
  columns: number
}

/** `A1:F2` as the cell it starts at and how far it reaches. */
function parseMerge(range: string): { row: number; column: number; span: Span } | null {
  const match = /^([A-Za-z]+)(\d+):([A-Za-z]+)(\d+)$/.exec(range.trim())
  if (!match) return null
  const [, fromColumn, fromRow, toColumn, toRow] = match
  if (
    fromColumn === undefined ||
    fromRow === undefined ||
    toColumn === undefined ||
    toRow === undefined
  ) {
    return null
  }
  const row = Number(fromRow) - 1
  const column = columnIndex(fromColumn)
  const rows = Number(toRow) - Number(fromRow) + 1
  const columns = columnIndex(toColumn) - column + 1
  if (row < 0 || column < 0 || rows < 1 || columns < 1) return null
  return { row, column, span: { rows, columns } }
}

function cellValue(input: XlsxInput): { value: string; format: XlsxFormat | undefined } {
  if (input === null || input === undefined) return { value: '', format: undefined }
  if (typeof input === 'string') return { value: input, format: undefined }
  if (typeof input === 'number') return { value: String(input), format: undefined }
  return {
    value: input.value === null ? '' : String(input.value),
    format: input.format,
  }
}

/**
 * Turns the sheet into rows of cells ready for a table: a merged range becomes one cell with its
 * spans and the cells it swallows are dropped, the way the browser wants them. Rows shorter than
 * the widest one are padded, so every row of the table has the same number of columns and the
 * ruled grid closes on the right.
 */
export function previewGrid(sheet: XlsxSheet): PreviewGrid {
  const columns = Math.max(
    sheet.widths?.length ?? 0,
    ...sheet.rows.map((row) => row.length),
    // An empty sheet still draws a grid of one cell rather than nothing at all.
    1,
  )

  const spans = new Map<string, Span>()
  const covered = new Set<string>()
  for (const range of sheet.merges ?? []) {
    const merge = parseMerge(range)
    if (!merge) continue
    spans.set(`${merge.row}:${merge.column}`, merge.span)
    for (let row = merge.row; row < merge.row + merge.span.rows; row++) {
      for (let column = merge.column; column < merge.column + merge.span.columns; column++) {
        if (row === merge.row && column === merge.column) continue
        covered.add(`${row}:${column}`)
      }
    }
  }

  // A merge may reach past the last row that holds a value: the grid runs to the taller of the two.
  let rowCount = sheet.rows.length
  for (const [key, span] of spans) {
    const row = Number(key.split(':')[0])
    rowCount = Math.max(rowCount, row + span.rows)
  }

  const rows: PreviewRow[] = []
  for (let row = 0; row < rowCount; row++) {
    const cells: PreviewCell[] = []
    for (let column = 0; column < columns; column++) {
      if (covered.has(`${row}:${column}`)) continue
      const span = spans.get(`${row}:${column}`)
      const { value, format } = cellValue(sheet.rows[row]?.[column] ?? null)
      cells.push({
        value,
        format,
        rowSpan: span?.rows ?? 1,
        colSpan: span?.columns ?? 1,
      })
    }
    rows.push({ heightPt: sheet.heights?.[row], cells })
  }

  const widths: number[] = []
  for (let column = 0; column < columns; column++) {
    widths.push(sheet.widths?.[column] ?? DEFAULT_WIDTH)
  }

  return { widths, rows }
}

/** Excel's own default column width in characters, for a sheet that sets none. */
const DEFAULT_WIDTH = 8.43

/** A character of the workbook font is about this wide on screen; a point, 96/72 of a pixel. */
const PIXELS_PER_CHARACTER = 7
const PIXELS_PER_POINT = 96 / 72

export function widthPx(characters: number, scale: number): number {
  return Math.round(characters * PIXELS_PER_CHARACTER * scale)
}

export function heightPx(points: number, scale: number): number {
  return Math.round(points * PIXELS_PER_POINT * scale)
}
