import type { AmountUnit } from './types'

/**
 * Default parameters of the calculation engine.
 *
 * CALIBRATION: every value here is a provisional default taken from common
 * clinical references. They must be verified against the department's real
 * prescription sheets (see docs/calibration.md) before the calculator is used
 * for patients. Change values here, not inline in the formulas.
 */
export const DOMAIN_DEFAULTS = {
  /** Upper BSA limit for the second ("capped") dose variant, m². */
  bsaCapM2: 2.0,

  /** µmol/L → mg/dL divisor for serum creatinine. */
  creatinineUmolPerMgDl: 88.4,

  /** Cockcroft-Gault multiplier for female patients. */
  cockcroftGaultFemaleFactor: 0.85,

  /** GFR ceiling used in the Calvert formula (FDA carboplatin guidance), mL/min. */
  carboplatinGfrCapMlMin: 125,

  /** Dose rounding step per unit the drug is measured in. */
  doseRoundingStep: { mg: 1, mcg: 1, iu: 1, miu: 0.1 } as Record<AmountUnit, number>,

  /**
   * Snap the dose to an amount made of whole vials when the difference is within
   * this percentage. `null` disables vial snapping until the rule is confirmed.
   */
  vialRoundingTolerancePercent: null as number | null,

  /** Standard giving-set drop factor, drops per mL. */
  dropFactorGttPerMl: 20,

  /** Plausible adult input ranges; values outside produce warnings, not errors. */
  patientLimits: {
    ageYears: { min: 18, max: 110 },
    heightCm: { min: 120, max: 230 },
    weightKg: { min: 30, max: 250 },
    creatinineUmolL: { min: 20, max: 1500 },
  },

  /** Generic thresholds for dose-reduction suggestions. */
  warningThresholds: {
    creatinineClearanceMlMin: 60,
    ageYears: 70,
    bilirubinUmolL: 34,
  },
} as const

export type DomainDefaults = typeof DOMAIN_DEFAULTS
