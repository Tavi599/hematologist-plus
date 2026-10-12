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
      /**
       * The label gives a range per administration rather than one dose (colistimethate 30-49
       * mL/min: 5.5-7.5 MIU a day); `doseValue` is the end the calculation starts from, and the
       * physician may move to the other end or the middle.
       */
      doseRange?: { min: number; max: number }
      /** The first dose of the course stays the regimen's own, in full; the rest are corrected. */
      firstDoseFull?: true
      /** The physician may give the regimen's full dose every other day instead. */
      everyOtherDayFull?: true
    }
  | { withhold: RenalWithhold }
)

/** Where in a range the physician puts the dose: its lower end, the middle, its upper end. */
export type RenalBandLevel = 'low' | 'mid' | 'high'

/** The dose at a level of a range: its ends, or the middle between them. */
export function renalBandDose(range: { min: number; max: number }, level: RenalBandLevel): number {
  if (level === 'low') return range.min
  if (level === 'high') return range.max
  return (range.min + range.max) / 2
}

/** What the clearance did to one drug, for the row that shows it. */
export type RenalAdjustment =
  /**
   * The dose and interval of `band` replaced the regimen's; or, with `everyOtherDay`, the
   * regimen's full dose is given every other day instead.
   */
  | {
      status: 'applied'
      clearanceMlMin: number
      band: RenalBand
      doseValue: number
      everyOtherDay?: true
    }
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
  days: number[]
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
  level?: RenalBandLevel,
  everyOtherDay = false,
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
  if (band.everyOtherDayFull && everyOtherDay) {
    // The same total as half the dose daily, made from whole forms: the full dose on day 1, 3, 5…
    const first = Math.min(...drug.days)
    const { intervalMin: _interval, ...kept } = drug
    return {
      drug: {
        ...kept,
        days: drug.days.filter((day) => (day - first) % 2 === 0),
        administrationsPerDay: 1,
      } as T,
      withheld: false,
      adjustment: {
        status: 'applied',
        clearanceMlMin: clearance,
        band,
        doseValue: drug.dose.value,
        everyOtherDay: true,
      },
      steps: [
        {
          key: 'renal.bandEveryOtherDay',
          value: drug.dose.value,
          unit: amountUnitOf(drug.dose.unit),
          params: {
            clearanceMlMin: clearance,
            minMlMin: band.minMlMin,
            maxMlMin: band.maxMlMin,
            unit: amountUnitOf(drug.dose.unit),
          },
        },
      ],
      warnings: [],
    }
  }
  const doseValue = band.doseRange && level ? renalBandDose(band.doseRange, level) : band.doseValue
  const { intervalMin: _protocolInterval, ...rest } = drug
  const adjusted = {
    ...rest,
    dose: { ...drug.dose, value: doseValue },
    administrationsPerDay: band.administrationsPerDay,
    ...(band.intervalMin === undefined ? {} : { intervalMin: band.intervalMin }),
  } as T
  return {
    drug: adjusted,
    withheld: false,
    adjustment: { status: 'applied', clearanceMlMin: clearance, band, doseValue },
    steps: [
      {
        key: 'renal.band',
        value: doseValue,
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
      ...(band.doseRange
        ? [
            {
              key: 'renal.bandRange',
              value: doseValue,
              unit: amountUnitOf(drug.dose.unit),
              params: {
                rangeMin: band.doseRange.min,
                rangeMax: band.doseRange.max,
                unit: amountUnitOf(drug.dose.unit),
              },
            },
          ]
        : []),
    ],
    warnings: [],
  }
}
