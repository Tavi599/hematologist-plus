import { describe, expect, it } from 'vitest'

import { HD_ARA_C_SHEET } from './__fixtures__/hd-ara-c-1500'
import { calculateCourse } from './course'

/**
 * Calibration of the calculator against the department's finished prescription sheets
 * (docs/calibration.md, stage 5). Every sheet that has been read becomes a test here: the
 * calculator has to reproduce the dose, the solvent volume, the rate and the hours that are
 * written on it. A number nowhere on the sheet is not asserted — it is not calibrated.
 */

interface RegimenFile {
  items: Record<string, unknown>[]
}
interface DrugFile {
  infusion_params: { key: string; bag_volumes_ml: number[]; duration_min?: number }[]
}

const regimenFile = import.meta.glob<RegimenFile>('../../data/regimens/hd-ara-c.json', {
  eager: true,
  import: 'default',
})
const drugFile = import.meta.glob<DrugFile>('../../data/drugs/cytarabine.json', {
  eager: true,
  import: 'default',
})

describe('HD ARA-C (Цитозар 1,5 г/м²) department sheet', () => {
  const { cytarabine, patient, adjustments, expected } = HD_ARA_C_SHEET
  const course = calculateCourse(patient, [cytarabine], adjustments)
  const result = course.drugs[0]!

  it('gives the dose the sheet carries, on the BSA the sheet carries', () => {
    expect(course.bsa?.actualM2).toBe(expected.bsaM2)
    // 1.8 m² is under the 2.0 m² limit, so the capped variant is the same dose.
    expect(course.bsa?.isCapped).toBe(false)
    expect(result.doseAmount).toBe(expected.doseAmount)
    expect(result.rounded.capped.roundedAmount).toBe(expected.doseAmount)
    // The sheet's figure is the exact product: rounding and vial snapping change nothing here.
    expect(result.rounded.actual.unroundedAmount).toBe(expected.doseAmount)
    expect(result.administrationsInCourse).toBe(expected.administrationsInCourse)
  })

  it('gives the solvent volume and the rate the sheet carries', () => {
    expect(result.infusion?.bagVolumeMl).toBe(expected.bagVolumeMl)
    expect(result.infusion?.totalVolumeMl).toBe(expected.totalVolumeMl)
    expect(result.infusion?.rateMlH).toBe(expected.rateMlH)
    // No concentration limits for cytarabine in the catalog, so the bag is the regimen's own.
    expect(result.infusion?.issue).toBeNull()
  })

  it('puts the two daily infusions at the hours the sheet marks', () => {
    const dayOne = course.days.find((day) => day.day === 1)!
    expect(dayOne.administrations.map((item) => item.start)).toEqual(expected.times)
    // The same two hours on every cytarabine day; 22:00 + 3 h runs into the next morning.
    for (const day of course.days) {
      expect(day.administrations.map((item) => item.start)).toEqual(expected.times)
    }
    expect(course.days.map((day) => day.day)).toEqual([1, 3, 5])
  })

  it('is the course the shipped data files describe', () => {
    const regimen = Object.values(regimenFile)[0]!
    const item = regimen.items.find((entry) => entry.key === 'cytarabine')!
    expect(item.dose_value).toBe(cytarabine.dose.value)
    expect(item.dose_unit).toBe(cytarabine.dose.unit)
    expect(item.days).toEqual(cytarabine.days)
    expect(item.administrations_per_day).toBe(cytarabine.administrationsPerDay)
    expect(item.interval_min).toBe(cytarabine.intervalMin)
    expect(item.duration_min).toBe(cytarabine.durationMin)

    const drug = Object.values(drugFile)[0]!
    const params = drug.infusion_params.find((set) => set.key === item.infusion_params_key)!
    expect(params.bag_volumes_ml).toEqual(cytarabine.infusion.bagVolumesMl)
    expect(params.duration_min).toBe(cytarabine.durationMin)
  })
})
