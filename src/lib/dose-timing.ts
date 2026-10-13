import type { RegimenItem } from '../schemas/catalog'
import type { CourseItem } from './course-input'

/** Suffix of the row that carries the first day of a drug whose timing differs on that day. */
export const DAY_ONE_SUFFIX = '--day1'

/**
 * How often a drug is given in a day and when: how many times (кратність), the gap between the
 * doses, and what the first one is timed from — the day's first cytostatic (`chemo`, with an
 * offset: -30 is half an hour before it) or a fixed time of day (`clock`).
 */
export interface DoseTiming {
  perDay: number
  intervalH: number
  mode: 'chemo' | 'clock'
  /** `chemo`: minutes from the start of the day's first cytostatic; negative is before it. */
  offsetMin: number
  /** `clock`: HH:MM the first dose is given at. */
  clock: string
}

/**
 * The timing the physician chose for a drug: one for its days, and optionally another for the
 * first of them — before the cytostatic on day 1, then every 8 hours at a convenient time.
 */
export interface TimingChoice {
  rest: DoseTiming
  firstDay: DoseTiming | null
}

/**
 * The rows whose frequency and time are the physician's to set: ondansetron wherever it is, and
 * any supportive drug timed from the cytostatic. A cytostatic's own schedule is the protocol's.
 */
export function canChooseTiming(
  item: Pick<RegimenItem, 'drug_id' | 'block' | 'role'>,
  dayOneOf?: string,
): boolean {
  if (dayOneOf !== undefined || item.role === 'main') return false
  return item.drug_id === 'ondansetron' || item.block === 'day_support'
}

/** The row's own timing, as the regimen writes it; `clock` is where a fixed time would start. */
export function defaultTiming(
  item: Pick<RegimenItem, 'administrations_per_day' | 'interval_min' | 'anchor_offset_min'>,
  clock: string,
): DoseTiming {
  const perDay = item.administrations_per_day ?? 1
  return {
    perDay,
    intervalH: item.interval_min ? item.interval_min / 60 : perDay > 1 ? 24 / perDay : 8,
    mode: 'chemo',
    offsetMin: item.anchor_offset_min ?? 0,
    clock,
  }
}

/** HH:MM as minutes from midnight; null for anything else. */
export function clockMinutes(clock: string): number | null {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(clock.trim())
  return match ? Number(match[1]) * 60 + Number(match[2]) : null
}

function timed(entry: CourseItem, id: string, days: number[], timing: DoseTiming): CourseItem {
  const perDay = Math.max(1, Math.round(timing.perDay))
  const intervalMin = perDay > 1 ? Math.round(timing.intervalH * 60) : null
  const clockStart = timing.mode === 'clock' ? clockMinutes(timing.clock) : null
  const anchorOffsetMin = timing.mode === 'chemo' ? Math.round(timing.offsetMin) : null
  const {
    anchorOffsetMin: _offset,
    intervalMin: _interval,
    clockStartMin: _clock,
    ...drug
  } = entry.courseDrug
  return {
    ...entry,
    item: {
      ...entry.item,
      id,
      days,
      administrations_per_day: perDay,
      interval_min: intervalMin,
      anchor_offset_min: anchorOffsetMin,
    },
    courseDrug: {
      ...drug,
      id,
      days,
      administrationsPerDay: perDay,
      ...(intervalMin === null ? {} : { intervalMin }),
      ...(anchorOffsetMin === null ? {} : { anchorOffsetMin }),
      ...(clockStart === null ? {} : { clockStartMin: clockStart }),
    },
  }
}

/**
 * The rows with the frequency and time the physician chose. Where the first day has a timing of
 * its own, it becomes a row of its own beside the others, so both go to the sheets, the schedule
 * and the pack count as ordinary rows.
 */
export function applyTimingChoices(
  items: CourseItem[],
  chosen: Record<string, TimingChoice>,
): CourseItem[] {
  return items.flatMap((entry) => {
    const choice = chosen[entry.item.id]
    if (choice === undefined || !canChooseTiming(entry.item, entry.dayOneOf)) return [entry]
    const days = [...entry.item.days].sort((a, b) => a - b)
    if (choice.firstDay === null || days.length < 2)
      return [timed(entry, entry.item.id, days, choice.rest)]
    const first = timed(entry, `${entry.item.id}${DAY_ONE_SUFFIX}`, [days[0]!], choice.firstDay)
    return [
      { ...first, dayOneOf: entry.item.id },
      timed(entry, entry.item.id, days.slice(1), choice.rest),
    ]
  })
}

/** The id of the row a first-day row was split off. */
export function parentOf(id: string): string {
  return id.endsWith(DAY_ONE_SUFFIX) ? id.slice(0, -DAY_ONE_SUFFIX.length) : id
}

/**
 * What was set for a drug applies to the row that was split off it too, unless that row has a
 * setting of its own: a dose typed in, a reduction. `own` wins.
 */
export function inheritedByDayOne<T>(
  own: Record<string, T>,
  items: CourseItem[],
): Record<string, T> {
  const result: Record<string, T> = {}
  for (const entry of items) {
    if (entry.dayOneOf !== undefined && own[entry.dayOneOf] !== undefined) {
      result[entry.item.id] = own[entry.dayOneOf]!
    }
  }
  return { ...result, ...own }
}

/** Switched off with its drug: the first-day row of a drug that is off is off too. */
export function disabledWithDayOne(ids: string[], items: CourseItem[]): string[] {
  const extra = items
    .filter((entry) => entry.dayOneOf !== undefined && ids.includes(entry.dayOneOf))
    .map((entry) => entry.item.id)
  return extra.length === 0 ? ids : [...new Set([...ids, ...extra])]
}
