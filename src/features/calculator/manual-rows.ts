/**
 * Orders the physician writes out themselves, for everything the catalog cannot be asked about:
 * a bag of saline, a dressing, a control blood count, a drug that is given by a protocol the
 * catalog does not hold yet. A hand-written line is never calculated — it is printed exactly as
 * it is typed, on the sheet it belongs to, at the hour it is marked at.
 *
 * It is the escape hatch that lets a sheet be made for a course that has no regimen at all.
 */

/** Which sheet the line belongs to: the hourly day sheet, or the inpatient list of form №003-4/о. */
export type ManualBlock = 'infusion' | 'ward'

export interface ManualRow {
  id: string
  /** The orders column, written out as the ward reads it. */
  what: string
  /** The narrow column beside it: how it is given — «в/в крап. 200 мл/год», «р.о.», «в/м». */
  how: string
  /** Course days the line is given on. */
  days: number[]
  /** Hour of the day the mark goes in; null leaves the line ruled but unmarked. */
  hour: number | null
  block: ManualBlock
}

export function newManualRow(id: string): ManualRow {
  return { id, what: '', how: '', days: [1], hour: null, block: 'infusion' }
}

/** A line with nothing written in it is not printed. */
export function isWritten(row: ManualRow): boolean {
  return row.what.trim() !== ''
}

/** Days any hand-written line falls on, so a sheet is made even for a day the course skips. */
export function manualDayNumbers(rows: ManualRow[]): number[] {
  const days = new Set<number>()
  for (const row of rows.filter(isWritten)) {
    for (const day of row.days) days.add(day)
  }
  return [...days].sort((a, b) => a - b)
}

/** The hand-written lines of one sheet, on one day. */
export function manualRowsOn(rows: ManualRow[], block: ManualBlock, day: number): ManualRow[] {
  return rows.filter((row) => isWritten(row) && row.block === block && row.days.includes(day))
}

/** The hand-written lines of the inpatient sheet, in the order they were written. */
export function manualWardRows(rows: ManualRow[]): ManualRow[] {
  return rows.filter((row) => isWritten(row) && row.block === 'ward')
}

/** A day of the course as both the screen and the printed sheet count them. */
export interface SheetDay {
  day: number
  date: string
}

/**
 * The days a sheet covers: the course's own, plus every day a hand-written line falls on. One
 * list, so the schedule on screen and the printed blank never disagree about what exists.
 */
export function daysWithManual(
  courseDays: SheetDay[],
  rows: ManualRow[],
  /** The date of a day the course itself does not have; day 1 is the start of the course. */
  dateOf: (dayNumber: number) => string,
): SheetDay[] {
  const days = new Map<number, SheetDay>(courseDays.map((day) => [day.day, day]))
  for (const day of manualDayNumbers(rows)) {
    if (!days.has(day)) days.set(day, { day, date: dateOf(day) })
  }
  return [...days.values()].sort((a, b) => a.day - b.day)
}

/**
 * Moves a line one place up or down. The order of the lines is the order they are printed in,
 * and on an infusion sheet that order is the order the ward gives them in.
 */
export function moveRow(rows: ManualRow[], id: string, by: -1 | 1): ManualRow[] {
  const from = rows.findIndex((row) => row.id === id)
  const to = from + by
  if (from === -1 || to < 0 || to >= rows.length) return rows
  const moved = [...rows]
  const [row] = moved.splice(from, 1)
  moved.splice(to, 0, row!)
  return moved
}
