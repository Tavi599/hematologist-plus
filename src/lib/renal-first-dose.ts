import type { CourseResult } from '../domain'
import type { CourseItem } from './course-input'

/** Suffix of the row that carries the first, full dose split off a corrected one. */
export const FIRST_DOSE_SUFFIX = '--first'

/**
 * Where the label gives the first dose in full and corrects only the ones after it (cefepime
 * with a low clearance: 2 g first, then 1 g once a day), the first day becomes a row of its
 * own: the regimen's dose once, uncorrected. The rest of the days keep the corrected dose. As
 * ordinary rows, both go to the sheets, the schedule and the vial count without anything else
 * knowing about it. Nothing is split where the corrected dose is the regimen's own anyway.
 */
export function withFirstFullDose(items: CourseItem[], course: CourseResult): CourseItem[] {
  return items.flatMap((entry) => {
    const adjustment = course.renal[entry.item.id]
    if (
      adjustment?.status !== 'applied' ||
      adjustment.band.withhold !== undefined ||
      !adjustment.band.firstDoseFull ||
      adjustment.doseValue === entry.courseDrug.dose.value
    ) {
      return [entry]
    }
    const firstDay = Math.min(...entry.item.days)
    const restDays = entry.item.days.filter((day) => day !== firstDay)
    const id = `${entry.item.id}${FIRST_DOSE_SUFFIX}`
    const {
      renalBands: _bands,
      renalBandsNotForDose: _notForDose,
      intervalMin: _interval,
      ...drug
    } = entry.courseDrug
    const first: CourseItem = {
      ...entry,
      item: { ...entry.item, id, days: [firstDay], administrations_per_day: 1, renal_bands: [] },
      courseDrug: { ...drug, id, days: [firstDay], administrationsPerDay: 1 },
      firstDoseOf: entry.item.id,
    }
    if (restDays.length === 0) return [first]
    const rest: CourseItem = {
      ...entry,
      item: { ...entry.item, days: restDays },
      courseDrug: { ...entry.courseDrug, days: restDays },
    }
    return [first, rest]
  })
}
