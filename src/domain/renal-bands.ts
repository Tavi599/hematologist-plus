import type { CalculationStep } from './types'
import { amountUnitOf } from './units'
import type { DoseSpec } from './dosing'
import type { DomainWarning } from './warnings'

/**
 * A dose and interval the label gives for one range of creatinine clearance, in place of the
 * regimen's own. The range is in whole mL/min, both ends included, as the labels write it
 * («30–60 mL/min»); above the highest range the regimen's own dose stands.
 */
export interface RenalBand {
  minMlMin: number
  maxMlMin: number
  doseValue: number
  administrationsPerDay: number
  /** Minutes between administrations within a day; absent for once a day. */
  intervalMin?: number
}

/** What the clearance did to one drug, for the row that shows it. */
export type RenalAdjustment =
  /** The dose and interval of `band` replaced the regimen's. */
  | { status: 'applied'; clearanceMlMin: number; band: RenalBand }
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
 * without a clearance the regimen's dose stands and the physician is told it is unchecked.
 */
export function applyRenalBand<T extends BandedDrug>(
  drug: T,
  clearanceMlMin: number | undefined,
  off: boolean,
): RenalBandResult<T> {
  const bands = drug.renalBands ?? []
  if (drug.renalBandsNotForDose) {
    return {
      drug,
      adjustment: { status: 'notForDose' },
      steps: [],
      warnings: [{ code: 'renal.bandNotForDose', params: {} }],
    }
  }
  if (bands.length === 0) return { drug, adjustment: null, steps: [], warnings: [] }
  if (clearanceMlMin === undefined) {
    return {
      drug,
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
      drug,
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
      drug,
      adjustment: { status: 'off', clearanceMlMin: clearance, band },
      steps: [],
      warnings: [
        {
          code: 'renal.bandOff',
          params: {
            clearanceMlMin: clearance,
            doseValue: band.doseValue,
            unit: amountUnitOf(drug.dose.unit),
            everyH: everyHours(band.administrationsPerDay, band.intervalMin),
          },
        },
      ],
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
