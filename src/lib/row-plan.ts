import type { RegimenItem } from '../schemas/catalog'
import type { CourseItem } from './course-input'

/**
 * How the physician set a row out on the sheets: at which hours it is given, how many times a day,
 * on which days. One place for all of it, so the time of a drug is dragged along a strip of the
 * sheet's own hours instead of being worked out from shifts.
 */

/** Hours of the department's sheet: 9…23, then 24 (0) and 1…8, the night after the working day. */
export const SHEET_HOURS = [
  ...Array.from({ length: 15 }, (_unused, index) => index + 9),
  ...Array.from({ length: 9 }, (_unused, index) => index),
]

/** The inpatient sheet writes how many times a day, or the hours themselves. */
export type WardMode = 'count' | 'hours'

export interface RowPlan {
  /** Hours of the sheet (0–23) the administrations start in; absent, the regimen's own timing. */
  hours?: number[]
  /** How many times a day, where that is the physician's to set and no hours are written. */
  perDay?: number
  /** Inpatient sheet only: the frequency (the default) or the hours. */
  wardMode?: WardMode
  /** The days the row is given on, where they are the physician's to set. */
  days?: number[]
}

/** Minutes from midnight of the course day an hour of the sheet stands for: 1…8 are the night after. */
export function minutesOfHour(hour: number): number {
  return (hour < SHEET_HOURS[0]! ? hour + 24 : hour) * 60
}

/** The hour of the sheet an administration starts in. */
export function hourOfMinutes(minutes: number): number {
  return Math.floor(minutes / 60) % 24
}

/** Hours in the order the sheet runs: the working day, then the night after it. */
export function inSheetOrder(hours: number[]): number[] {
  return [...new Set(hours)].sort((a, b) => minutesOfHour(a) - minutesOfHour(b))
}

/** «07:00», and «24:00» for midnight, as the sheet heads that column. */
export function clockOfHour(hour: number): string {
  return `${String(hour === 0 ? 24 : hour).padStart(2, '0')}:00`
}

/**
 * Hours a tablet taken so many times a day is written at, once the physician asks for hours:
 * the department's 07:00, 15:00, 23:00 for three times a day.
 */
export function defaultWardHours(perDay: number): number[] {
  const table: Record<number, number[]> = {
    1: [9],
    2: [9, 21],
    3: [7, 15, 23],
    4: [6, 12, 18, 0],
  }
  return table[perDay] ?? table[1]!
}

/** Separator of a variant's id: `r.ondansetron~2` is the second row of the regimen's ondansetron. */
const VARIANT_MARK = '~'

export function isVariant(id: string): boolean {
  return id.includes(VARIANT_MARK)
}

/** The row a variant was copied from; the row itself for anything else. */
export function variantBase(id: string): string {
  const at = id.indexOf(VARIANT_MARK)
  return at === -1 ? id : id.slice(0, at)
}

/** Id of the next copy of a row, given the variants that already exist. */
export function nextVariantId(baseId: string, variants: string[]): string {
  let n = 2
  while (variants.includes(`${baseId}${VARIANT_MARK}${n}`)) n++
  return `${baseId}${VARIANT_MARK}${n}`
}

/**
 * The rows with the copies the physician made of them, each copy right after its row: the same
 * drug given again with settings of its own (by mouth on other days, three times a day instead of
 * two, on the other sheet). A copy of a row that is not there is dropped.
 */
export function withVariants(items: RegimenItem[], variants: string[]): RegimenItem[] {
  if (variants.length === 0) return items
  return items.flatMap((item) => [
    item,
    ...variants
      .filter((id) => variantBase(id) === item.id)
      .sort()
      .map((id) => ({ ...item, id })),
  ])
}

/**
 * A row whose frequency and days are the physician's: the support around the regimen, a drug
 * added by hand, a copy. A cytostatic's days and frequency are the protocol's.
 */
export function isFreeRow(item: Pick<RegimenItem, 'id' | 'role'>, customIds: string[]): boolean {
  return item.role !== 'main' || customIds.includes(variantBase(item.id)) || isVariant(item.id)
}

/** The row as the physician set it out: its days, how many times a day, and when. */
export function applyPlans(
  items: CourseItem[],
  plans: Record<string, RowPlan>,
  customIds: string[],
): CourseItem[] {
  return items.map((entry) => {
    const plan = plans[entry.item.id]
    if (plan === undefined) return entry
    const free = isFreeRow(entry.item, customIds)
    const days = free && plan.days && plan.days.length > 0 ? plan.days : entry.item.days
    const hours = plan.hours && plan.hours.length > 0 ? inSheetOrder(plan.hours) : null
    const ward = entry.item.block === 'ward'

    let perDay = entry.item.administrations_per_day
    let startsMin: number[] | undefined
    let wardHours: number[] | undefined
    if (ward) {
      if (plan.wardMode === 'hours' && hours) {
        wardHours = hours
        if (free) perDay = hours.length
      } else if (free && plan.perDay) {
        perDay = plan.perDay
      }
    } else if (hours) {
      // A cytostatic is put at an hour as a whole; its repeats keep the protocol's interval.
      if (free) perDay = hours.length
      startsMin = (free ? hours : hours.slice(0, 1)).map(minutesOfHour)
    }

    const { startsMin: _old, ...drug } = entry.courseDrug
    return {
      ...entry,
      item: { ...entry.item, days, administrations_per_day: perDay },
      courseDrug: {
        ...drug,
        days,
        administrationsPerDay: perDay,
        ...(startsMin ? { startsMin } : {}),
      },
      ...(wardHours ? { wardHours } : {}),
    }
  })
}

/** Days a drug is given on by more than one of its rows switched on: two variants that overlap. */
export function overlappingDays(items: CourseItem[], disabledIds: string[]): Map<string, number[]> {
  const result = new Map<string, number[]>()
  const on = items.filter((entry) => !disabledIds.includes(entry.item.id))
  for (const entry of on) {
    const others = on.filter(
      (other) =>
        other !== entry &&
        other.item.drug_id === entry.item.drug_id &&
        variantBase(other.item.id) === variantBase(entry.item.id),
    )
    const days = entry.item.days.filter((day) => others.some((o) => o.item.days.includes(day)))
    if (days.length > 0) result.set(entry.item.id, days)
  }
  return result
}
