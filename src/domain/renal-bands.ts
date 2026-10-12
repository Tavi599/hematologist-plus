import type { CalculationStep } from './types'
import { amountUnitOf } from './units'
import type { DoseSpec } from './dosing'
import type { DomainWarning } from './warnings'

/**
 * Why a range gives no dose at all: the label does not recommend the drug there, or the doses
 * after the first are set by its concentration in the blood. Either way nothing is calculated.
 */
export type RenalWithhold = 'not_recommended' | 'levels'

/**
 * A dose and interval the label gives for one range of creatinine clearance, in place of the
 * regimen's own — or no dose at all (`withhold`). The range is in whole mL/min, both ends
 * included, as the labels write it («30–60 mL/min»); above the highest range the regimen's own
 * dose stands.
 */
export type RenalBand = { minMlMin: number; maxMlMin: number } & (
  | {
      withhold?: undefined
      doseValue: number
      administrationsPerDay: number
      /** Minutes between administrations within a day; absent for once a day. */
      intervalMin?: number
    }
  | { withhold: RenalWithhold }
)

/** What the clearance did to one drug, for the row that shows it. */
export type RenalAdjustment =
  /** The dose and interval of `band` replaced the regimen's. */
  | { status: 'applied'; clearanceMlMin: number; band: RenalBand }
  /** The range gives no dose: the drug is not calculated at all. */
  | { status: 'withheld'; clearanceMlMin: number; band: RenalBand }
  /** The clearance is above every range: the regimen's dose stands. */
  | { status: 'above'; clearanceMlMin: number; aboveMlMin: number }
  /** The physician switched the correction off; `band` is what it would have been. */
  | { status: 'off'; clearanceMlMin: number; band: RenalBand }
  /** No clearance to choose a range by: the regimen's dose stands, unchecked. */
  | { status: 'unchecked' }
  /** The ranges are written for the regimen's own dose, and another one is in force. */
  | { status: 'notForDose' }

interface BandedDrug {
  id: string
  dose: DoseSpec
  administrationsPerDay?: number
  intervalMin?: number
  renalBands?: RenalBand[]
  renalBandsNotForDose?: boolean
}

export interface RenalBandResult<T> {
  drug: T
  /** The range gives no dose: the drug is left out of the course like a switched-off one. */
  withheld: boolean
  adjustment: RenalAdjustment | null
  steps: CalculationStep[]
  warnings: DomainWarning[]
}

/** Hours between administrations: the interval when given, else the day split evenly. */
function everyHours(administrationsPerDay: number, intervalMin: number | undefined): number {
  return intervalMin === undefined ? 24 / administrationsPerDay : intervalMin / 60
}

/**
 * Puts the label's dose and interval for the patient's clearance in place of the regimen's.
 * The clearance is rounded to whole mL/min, as the ranges are written. Nothing is guessed:
 * without a clearance the regimen's dose stands and the physician is told it is unchecked, and
 * a range with no dose leaves the drug uncalculated unless the physician switches it off.
 */
export function applyRenalBand<T extends BandedDrug>(
  drug: T,
  clearanceMlMin: number | undefined,
  off: boolean,
): RenalBandResult<T> {
  const unchanged = { drug, withheld: false }
  const bands = drug.renalBands ?? []
  if (drug.renalBandsNotForDose) {
    return {
      ...unchanged,
      adjustment: { status: 'notForDose' },
      steps: [],
      warnings: [{ code: 'renal.bandNotForDose', params: {} }],
    }
  }
  if (bands.length === 0) return { ...unchanged, adjustment: null, steps: [], warnings: [] }
  if (clearanceMlMin === undefined) {
    return {
      ...unchanged,
      adjustment: { status: 'unchecked' },
      steps: [],
      warnings: [
        {
          code: 'renal.bandUnchecked',
          params: { belowMlMin: Math.max(...bands.map((band) => band.maxMlMin)) + 1 },
        },
      ],
    }
  }
  const clearance = Math.round(clearanceMlMin)
  const band = bands.find((range) => clearance >= range.minMlMin && clearance <= range.maxMlMin)
  if (!band) {
    const aboveMlMin = Math.max(...bands.map((range) => range.maxMlMin))
    return {
      ...unchanged,
      adjustment: { status: 'above', clearanceMlMin: clearance, aboveMlMin },
      steps: [
        {
          key: 'renal.bandAbove',
          value: clearance,
          unit: 'ml_min',
          params: { aboveMlMin },
        },
      ],
      warnings: [],
    }
  }
  if (off) {
    return {
      ...unchanged,
      adjustment: { status: 'off', clearanceMlMin: clearance, band },
      steps: [],
      warnings: [
        band.withhold === undefined
          ? {
              code: 'renal.bandOff',
              params: {
                clearanceMlMin: clearance,
                doseValue: band.doseValue,
                unit: amountUnitOf(drug.dose.unit),
                everyH: everyHours(band.administrationsPerDay, band.intervalMin),
              },
            }
          : {
              code: `renal.withheldOff.${band.withhold}`,
              params: { clearanceMlMin: clearance },
            },
      ],
    }
  }
  if (band.withhold !== undefined) {
    return {
      drug,
      withheld: true,
      adjustment: { status: 'withheld', clearanceMlMin: clearance, band },
      steps: [],
      warnings: [],
    }
  }
  const protocolEveryH = everyHours(drug.administrationsPerDay ?? 1, drug.intervalMin)
  const { intervalMin: _protocolInterval, ...rest } = drug
  const adjusted = {
    ...rest,
    dose: { ...drug.dose, value: band.doseValue },
    administrationsPerDay: band.administrationsPerDay,
    ...(band.intervalMin === undefined ? {} : { intervalMin: band.intervalMin }),
  } as T
  return {
    drug: adjusted,
    withheld: false,
    adjustment: { status: 'applied', clearanceMlMin: clearance, band },
    steps: [
      {
        key: 'renal.band',
        value: band.doseValue,
        unit: amountUnitOf(drug.dose.unit),
        params: {
          clearanceMlMin: clearance,
          minMlMin: band.minMlMin,
          maxMlMin: band.maxMlMin,
          everyH: everyHours(band.administrationsPerDay, band.intervalMin),
          protocolValue: drug.dose.value,
          protocolEveryH,
          unit: amountUnitOf(drug.dose.unit),
        },
      },
    ],
    warnings: [],
  }
}
