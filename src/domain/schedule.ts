import { assertNonNegative } from './math'
import { DomainInputError, type ScheduleBlock } from './types'

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
  /** Which block the row belongs to; only `infusion` rows form the hourly chain. */
  block: ScheduleBlock
  /** 0 for bolus / push. */
  durationMin: number
  /** Pause before this administration (e.g. premedication → chemo), min. */
  gapBeforeMin?: number
  /** Manual shift by the physician, min; later administrations of the chain move with it. */
  shiftMin?: number
  /**
   * `day_support`: minutes from the start of the day's first chained drug; negative is before it
   * (ondansetron 30 min before the cytostatic).
   */
  anchorOffsetMin?: number
  /** `day_support`: minutes between the repeats of this drug within the day (q8h = 480). */
  intervalMin?: number
  /**
   * `infusion`: this is a drug of the regimen itself, not its premedication. The support of
   * the day is timed from the first of these — 30 min before the cytostatic, not before the
   * premedication that precedes it.
   */
  isMain?: boolean
  /** 0-based number of this administration within the day. */
  occurrence?: number
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
 * Places the `infusion` rows one after another from `dayStart` (HH:MM), then hangs the
 * `day_support` rows off the start of the day's first cytostatic — ondansetron before the cytostatic
 * and every 8 hours after it, so they follow when the infusion is shifted.
 *
 * `ward` rows get no time at all: tablets are given on the ward round, and moving an infusion
 * must not move them. They are returned by `untimedIds` instead.
 *
 * CALIBRATION: default gaps and whether infusions may run in parallel will be taken from real sheets.
 */
export function scheduleAdministrations(
  dayStart: string,
  items: AdministrationInput[],
): ScheduledAdministration[] {
  const dayStartMin = parseTime(dayStart)
  let cursor = dayStartMin
  let firstStart: number | null = null
  let firstMainStart: number | null = null
  const scheduled: ScheduledAdministration[] = []

  for (const item of items) {
    if (item.block !== 'infusion') continue
    const startMin = Math.max(0, cursor + (item.gapBeforeMin ?? 0) + shiftOf(item))
    cursor = startMin + durationOf(item)
    firstStart ??= startMin
    if (item.isMain) firstMainStart ??= startMin
    scheduled.push(placed(item.id, startMin, durationOf(item)))
  }

  const anchor = firstMainStart ?? firstStart ?? dayStartMin
  for (const item of items) {
    if (item.block !== 'day_support') continue
    const offset = item.anchorOffsetMin ?? 0
    if (!Number.isInteger(offset)) {
      throw new DomainInputError(`${item.id}.anchorOffsetMin`, 'must be a whole number of minutes')
    }
    const interval = item.intervalMin ?? 0
    assertNonNegative(`${item.id}.intervalMin`, interval)
    const startMin = Math.max(
      0,
      anchor + offset + interval * (item.occurrence ?? 0) + shiftOf(item),
    )
    scheduled.push(placed(item.id, startMin, durationOf(item)))
  }

  return scheduled.sort((a, b) => a.startMin - b.startMin || (a.id < b.id ? -1 : 1))
}

/** Ids of the rows that are not placed in the hourly grid: the inpatient sheet. */
export function untimedIds(items: AdministrationInput[]): string[] {
  return items.filter((item) => item.block === 'ward').map((item) => item.id)
}

function durationOf(item: AdministrationInput): number {
  assertNonNegative(`${item.id}.durationMin`, item.durationMin)
  return item.durationMin
}

function shiftOf(item: AdministrationInput): number {
  assertNonNegative(`${item.id}.gapBeforeMin`, item.gapBeforeMin ?? 0)
  const shift = item.shiftMin ?? 0
  if (!Number.isFinite(shift)) throw new DomainInputError(`${item.id}.shiftMin`, 'must be finite')
  return shift
}

function placed(id: string, startMin: number, durationMin: number): ScheduledAdministration {
  const endMin = startMin + durationMin
  const start = formatTime(startMin)
  const end = formatTime(endMin)
  return {
    id,
    startMin,
    endMin,
    start: start.time,
    end: end.time,
    startDayOffset: start.dayOffset,
    endDayOffset: end.dayOffset,
  }
}
