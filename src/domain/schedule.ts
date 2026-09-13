import { assertNonNegative } from './math'
import { DomainInputError } from './types'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME = /^([01]?\d|2[0-3]):([0-5]\d)$/
const MINUTES_PER_DAY = 24 * 60

function parseIsoDate(value: string): Date {
  const match = ISO_DATE.exec(value)
  if (!match) throw new DomainInputError('date', `expected YYYY-MM-DD, got "${value}"`)
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  if (date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) {
    throw new DomainInputError('date', `invalid calendar date "${value}"`)
  }
  return date
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** Adds whole days in UTC, so daylight-saving changes never shift the date. */
export function addDays(dateIso: string, days: number): string {
  if (!Number.isInteger(days)) throw new DomainInputError('days', 'must be an integer')
  const date = parseIsoDate(dateIso)
  date.setUTCDate(date.getUTCDate() + days)
  return formatIsoDate(date)
}

export interface CourseDay {
  day: number
  date: string
}

/** Maps regimen day numbers to calendar dates; day 1 is the course start date (day 0 is the day before). */
export function courseDayDates(startDateIso: string, dayNumbers: number[]): CourseDay[] {
  parseIsoDate(startDateIso)
  return [...new Set(dayNumbers)]
    .sort((a, b) => a - b)
    .map((day) => ({ day, date: addDays(startDateIso, day - 1) }))
}

export function parseTime(value: string): number {
  const match = TIME.exec(value)
  if (!match) throw new DomainInputError('time', `expected HH:MM, got "${value}"`)
  return Number(match[1]) * 60 + Number(match[2])
}

/** Formats minutes from the start of the course day; times past midnight wrap and report a day offset. */
export function formatTime(minutes: number): { time: string; dayOffset: number } {
  const dayOffset = Math.floor(minutes / MINUTES_PER_DAY)
  const inDay = minutes - dayOffset * MINUTES_PER_DAY
  const hh = String(Math.floor(inDay / 60)).padStart(2, '0')
  const mm = String(inDay % 60).padStart(2, '0')
  return { time: `${hh}:${mm}`, dayOffset }
}

export interface AdministrationInput {
  id: string
  /** 0 for bolus / push. */
  durationMin: number
  /** Pause before this administration (e.g. premedication → chemo), min. */
  gapBeforeMin?: number
  /** Manual shift by the physician, min; later administrations move with it. */
  shiftMin?: number
}

export interface ScheduledAdministration {
  id: string
  startMin: number
  endMin: number
  start: string
  end: string
  /** Day offset of the start relative to the course day (1 = after midnight). */
  startDayOffset: number
  endDayOffset: number
}

/**
 * Places administrations one after another from `dayStart` (HH:MM) in the given order.
 * CALIBRATION: default gaps and whether infusions may run in parallel will be taken from real sheets.
 */
export function scheduleAdministrations(
  dayStart: string,
  items: AdministrationInput[],
): ScheduledAdministration[] {
  let cursor = parseTime(dayStart)

  return items.map((item) => {
    assertNonNegative(`${item.id}.durationMin`, item.durationMin)
    assertNonNegative(`${item.id}.gapBeforeMin`, item.gapBeforeMin ?? 0)
    const shift = item.shiftMin ?? 0
    if (!Number.isFinite(shift)) throw new DomainInputError(`${item.id}.shiftMin`, 'must be finite')

    const startMin = Math.max(0, cursor + (item.gapBeforeMin ?? 0) + shift)
    const endMin = startMin + item.durationMin
    cursor = endMin

    const start = formatTime(startMin)
    const end = formatTime(endMin)
    return {
      id: item.id,
      startMin,
      endMin,
      start: start.time,
      end: end.time,
      startDayOffset: start.dayOffset,
      endDayOffset: end.dayOffset,
    }
  })
}
