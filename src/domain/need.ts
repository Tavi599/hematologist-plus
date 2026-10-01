import { assertNonNegative } from './math'
import { DomainInputError } from './types'

/**
 * The need for one drug across the department, in the graphs the Ministry's distribution form
 * asks for: how many patients need it, what their whole planned treatment comes to, and how long
 * that lasts at the department's own average monthly use.
 *
 * Packs, not milligrams: the form is filled in the unit the drug is bought in — a vial, a tablet,
 * an ampoule. Turning a dose into packs is the course calculation's job (`presentationTotals`);
 * here they are only multiplied out.
 *
 * Nothing about any patient is used — only how many of them there are.
 */
export interface NeedRow {
  /** Patients of the institution who need this drug. */
  patients: number
  /** Packs one patient needs for one course. */
  packsPerCourse: number
  /** Courses planned for one patient. */
  courses: number
  /** Packs the department uses in an average month; 0 when it is not known. */
  monthlyUse: number
}

export interface NeedResult {
  /** The form's «100 % потреба»: every patient's whole planned treatment, in packs. */
  total: number
  /**
   * Whole months the need covers at the average monthly use, as the department's own forms
   * count it; null when there is no average to divide by.
   */
  monthsCovered: number | null
}

export function calculateNeed(row: NeedRow): NeedResult {
  assertNonNegative('patients', row.patients)
  assertNonNegative('packsPerCourse', row.packsPerCourse)
  assertNonNegative('courses', row.courses)
  assertNonNegative('monthlyUse', row.monthlyUse)
  assertWhole('patients', row.patients)
  assertWhole('packsPerCourse', row.packsPerCourse)
  assertWhole('courses', row.courses)

  const total = row.patients * row.packsPerCourse * row.courses
  return { total, monthsCovered: monthsCovered(total, row.monthlyUse) }
}

/**
 * How many months a quantity lasts. Whole months down: a form that promises a month the stock
 * cannot cover is worse than one that promises none.
 */
export function monthsCovered(packs: number, monthlyUse: number): number | null {
  assertNonNegative('packs', packs)
  assertNonNegative('monthlyUse', monthlyUse)
  return monthlyUse === 0 ? null : Math.floor(packs / monthlyUse)
}

function assertWhole(field: string, value: number): void {
  if (!Number.isInteger(value)) {
    throw new DomainInputError(field, `must be a whole number, got ${value}`)
  }
}
