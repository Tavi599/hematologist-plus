export type Sex = 'male' | 'female'

export type CreatinineUnit = 'umol_l' | 'mg_dl'

/** How a regimen expresses a dose. */
export type DoseUnit = 'mg_m2' | 'mg_kg' | 'mg_flat' | 'auc'

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
