import { doseBasisOf } from '../domain/units'
import type { PatientInput } from '../schemas/patient'
import type { CourseItem } from './course-input'

/** What a course may ask of the patient form. */
export type PatientField = 'heightCm' | 'weightKg' | 'sex' | 'ageYears' | 'serumCreatinine'

/**
 * Why a drug of the course needs a measurement:
 * - `bsa`: a dose per square metre, unless the BSA is typed in by hand;
 * - `perKg`: a dose per kilogram;
 * - `dosingWeight`: a dose per kilogram on the ideal or adjusted weight (aminoglycosides);
 * - `auc`: a dose by AUC (Calvert), on the creatinine clearance;
 * - `clearance`: a drug whose dose follows the label's ranges of creatinine clearance.
 */
export type RequirementReason = 'bsa' | 'perKg' | 'dosingWeight' | 'auc' | 'clearance'

export interface MissingRequirement {
  reason: RequirementReason
  /** The fields still empty, in the order of the form. */
  fields: PatientField[]
  /** Course items that need them. */
  itemIds: string[]
}

const FIELD_ORDER: PatientField[] = ['ageYears', 'sex', 'heightCm', 'weightKg', 'serumCreatinine']

const NEEDS: Record<RequirementReason, PatientField[]> = {
  bsa: ['heightCm', 'weightKg'],
  perKg: ['weightKg'],
  dosingWeight: ['sex', 'heightCm', 'weightKg'],
  auc: ['ageYears', 'sex', 'weightKg', 'serumCreatinine'],
  clearance: ['ageYears', 'sex', 'weightKg', 'serumCreatinine'],
}

function reasonsOf(entry: CourseItem, bsaEntered: boolean, renalOff: boolean): RequirementReason[] {
  const drug = entry.courseDrug
  const basis = doseBasisOf(drug.dose.unit)
  const reasons: RequirementReason[] = []
  if (basis === 'm2' && !bsaEntered) reasons.push('bsa')
  if (basis === 'kg') {
    reasons.push(
      drug.dosingWeight !== undefined && drug.dosingWeight !== 'actual' ? 'dosingWeight' : 'perKg',
    )
  }
  if (basis === 'auc') reasons.push('auc')
  if (!renalOff && (drug.renalBands?.length ?? 0) > 0) reasons.push('clearance')
  return reasons
}

function emptyFields(patient: PatientInput | null): Set<PatientField> {
  if (patient === null) return new Set(FIELD_ORDER)
  return new Set(FIELD_ORDER.filter((field) => patient[field] === null))
}

/**
 * The measurements the course cannot be calculated, and so printed, without: only those a drug
 * switched on actually needs. A course of flat-dose antibiotics needs no height and weight; one
 * that is corrected by creatinine clearance needs what Cockcroft-Gault is worked out on.
 *
 * Supportive rows (prophylaxis switched on around a course) do not hold the calculation up: their
 * correction by clearance is reported by `unadjustedSupport` instead, and the dose is the usual one.
 */
export function missingRequirements(
  items: CourseItem[],
  options: {
    patient: PatientInput | null
    disabledIds: readonly string[]
    bsaEntered: boolean
    renalBandOffIds: readonly string[]
  },
): MissingRequirement[] {
  const empty = emptyFields(options.patient)
  const byReason = new Map<RequirementReason, MissingRequirement>()
  for (const entry of items) {
    if (options.disabledIds.includes(entry.item.id)) continue
    const renalOff = options.renalBandOffIds.includes(entry.item.id)
    for (const reason of reasonsOf(entry, options.bsaEntered, renalOff)) {
      if (reason === 'clearance' && entry.item.role !== 'main') continue
      const fields = NEEDS[reason].filter((field) => empty.has(field))
      if (fields.length === 0) continue
      const found = byReason.get(reason)
      if (found) {
        if (!found.itemIds.includes(entry.item.id)) found.itemIds.push(entry.item.id)
      } else {
        byReason.set(reason, {
          reason,
          fields: FIELD_ORDER.filter((field) => fields.includes(field)),
          itemIds: [entry.item.id],
        })
      }
    }
  }
  return [...byReason.values()]
}

/** Supportive rows switched on whose correction by clearance cannot be checked for want of data. */
export function unadjustedSupport(
  items: CourseItem[],
  options: { patient: PatientInput | null; disabledIds: readonly string[] },
): { fields: PatientField[]; itemIds: string[] } | null {
  const empty = emptyFields(options.patient)
  const fields = NEEDS.clearance.filter((field) => empty.has(field))
  if (fields.length === 0) return null
  const itemIds = items
    .filter(
      (entry) =>
        !options.disabledIds.includes(entry.item.id) &&
        entry.item.role !== 'main' &&
        (entry.courseDrug.renalBands?.length ?? 0) > 0,
    )
    .map((entry) => entry.item.id)
  return itemIds.length === 0 ? null : { fields, itemIds }
}
