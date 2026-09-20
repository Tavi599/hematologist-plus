import { DOMAIN_DEFAULTS } from './config'

export type WarningCode =
  | 'input.outOfRange'
  | 'bsa.capped'
  | 'bsa.enteredDiffers'
  | 'dose.capped'
  | 'carboplatin.gfrCapped'
  | 'infusion.concentrationOutOfRange'
  | 'review.lowCreatinineClearance'
  | 'review.elderly'
  | 'review.highBilirubin'

/** Warnings never change a dose; they are shown to the physician for a decision. */
export interface DomainWarning {
  code: WarningCode
  params: Record<string, number | string>
}

export interface PatientInputs {
  ageYears?: number
  heightCm?: number
  weightKg?: number
  creatinineUmolL?: number
}

type LimitField = keyof typeof DOMAIN_DEFAULTS.patientLimits

/** Flags implausible adult values (typos like 17 kg or 1800 cm) without blocking the calculation. */
export function checkPatientInputs(inputs: PatientInputs): DomainWarning[] {
  const warnings: DomainWarning[] = []
  for (const field of Object.keys(DOMAIN_DEFAULTS.patientLimits) as LimitField[]) {
    const value = inputs[field]
    if (value === undefined) continue
    const { min, max } = DOMAIN_DEFAULTS.patientLimits[field]
    if (value < min || value > max) {
      warnings.push({ code: 'input.outOfRange', params: { field, value, min, max } })
    }
  }
  return warnings
}

export interface ReviewContext {
  ageYears?: number
  creatinineClearanceMlMin?: number
  bilirubinUmolL?: number
}

/** Which organ-function checks apply to a drug, with optional drug-specific thresholds. */
export interface ReviewRules {
  renal?: boolean | { belowMlMin: number }
  hepatic?: boolean | { aboveUmolL: number }
  elderly?: boolean | { fromAgeYears: number }
}

/**
 * Suggests a dose review based on organ function and age.
 * CALIBRATION: generic thresholds are placeholders until drug-specific rules are loaded from the catalog.
 */
export function suggestDoseReview(context: ReviewContext, rules: ReviewRules): DomainWarning[] {
  const t = DOMAIN_DEFAULTS.warningThresholds
  const warnings: DomainWarning[] = []

  if (rules.renal && context.creatinineClearanceMlMin !== undefined) {
    const threshold =
      typeof rules.renal === 'object' ? rules.renal.belowMlMin : t.creatinineClearanceMlMin
    if (context.creatinineClearanceMlMin < threshold) {
      warnings.push({
        code: 'review.lowCreatinineClearance',
        params: { value: context.creatinineClearanceMlMin, threshold },
      })
    }
  }

  if (rules.hepatic && context.bilirubinUmolL !== undefined) {
    const threshold =
      typeof rules.hepatic === 'object' ? rules.hepatic.aboveUmolL : t.bilirubinUmolL
    if (context.bilirubinUmolL > threshold) {
      warnings.push({
        code: 'review.highBilirubin',
        params: { value: context.bilirubinUmolL, threshold },
      })
    }
  }

  if (rules.elderly && context.ageYears !== undefined) {
    const threshold = typeof rules.elderly === 'object' ? rules.elderly.fromAgeYears : t.ageYears
    if (context.ageYears >= threshold) {
      warnings.push({ code: 'review.elderly', params: { value: context.ageYears, threshold } })
    }
  }

  return warnings
}
