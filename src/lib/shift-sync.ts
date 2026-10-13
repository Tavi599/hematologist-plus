import type { CourseItem } from './course-input'

/**
 * Times of the schedule that follow the previous day. A drug the physician moved on one day is
 * moved by the same amount on the days after it — unless that day, or that drug on that day, is
 * set free of the previous one, and then the day has the times the chain gives it, or the shift
 * typed in for it.
 */
export interface ShiftSync {
  /** Shifts typed in, minutes, by drug and course day. */
  explicit: Record<string, Record<number, number>>
  /** Days whose times do not follow the previous day, for every drug. */
  offDays: number[]
  /** Days a drug's time does not follow the previous one, by drug. */
  offDrugDays: Record<string, number[]>
}

export const NO_SHIFT_SYNC: ShiftSync = { explicit: {}, offDays: [], offDrugDays: {} }

/** The days each drug is given on, in order; the days of a drug that is switched off count too. */
export function daysOfDrugs(items: CourseItem[]): Map<string, number[]> {
  const result = new Map<string, number[]>()
  for (const entry of items) {
    const known = result.get(entry.item.id) ?? []
    result.set(
      entry.item.id,
      [...new Set([...known, ...entry.item.days])].sort((a, b) => a - b),
    )
  }
  return result
}

/** The earlier day on which the drug is given, nearest to this one; null on its first day. */
export function previousDayOf(
  daysOf: Map<string, number[]>,
  drugId: string,
  day: number,
): number | null {
  const earlier = (daysOf.get(drugId) ?? []).filter((entry) => entry < day)
  return earlier.length === 0 ? null : Math.max(...earlier)
}

/** Whether this drug's time on this day follows the one before it. */
export function isSynced(sync: ShiftSync, drugId: string, day: number): boolean {
  return !sync.offDays.includes(day) && !(sync.offDrugDays[drugId] ?? []).includes(day)
}

/**
 * The shift of every drug on every day it is given: what was typed in for that day, otherwise
 * what the previous day has while the day follows it, otherwise none.
 */
export function effectiveShifts(
  daysOf: Map<string, number[]>,
  sync: ShiftSync,
): Record<string, Record<number, number>> {
  const result: Record<string, Record<number, number>> = {}
  for (const [drugId, days] of daysOf) {
    const shifts: Record<number, number> = {}
    let previous: number | null = null
    for (const day of days) {
      const typed = sync.explicit[drugId]?.[day]
      shifts[day] =
        typed ?? (previous !== null && isSynced(sync, drugId, day) ? shifts[previous]! : 0)
      previous = day
    }
    if (Object.values(shifts).some((value) => value !== 0)) result[drugId] = shifts
  }
  return result
}
