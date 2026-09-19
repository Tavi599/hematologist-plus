export type Sex = 'male' | 'female'

export type CreatinineUnit = 'umol_l' | 'mg_dl'

/**
 * The unit a drug is measured in. Mass (mg, mcg) and biological activity (iu, miu) are never
 * converted into each other: the factor is a property of the drug, not arithmetic.
 */
export type AmountUnit = 'mg' | 'mcg' | 'iu' | 'miu'

/** What a dose is proportional to. */
export type DoseBasis = 'm2' | 'kg' | 'flat'

/** How a regimen expresses a dose: amount unit + basis, or the Calvert AUC (milligrams). */
export type DoseUnit = `${AmountUnit}_${DoseBasis}` | 'auc'

/**
 * One step of a calculation chain, shown to the physician next to the result.
 * `key` doubles as an i18n key suffix; `params` are the inputs used in that step.
 */
export interface CalculationStep {
  key: string
  value: number
  unit: string
  params?: Record<string, number | string | boolean>
}

export class DomainInputError extends RangeError {
  readonly field: string

  constructor(field: string, message: string) {
    super(`${field}: ${message}`)
    this.name = 'DomainInputError'
    this.field = field
  }
}
