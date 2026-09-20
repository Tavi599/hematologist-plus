import { describe, expect, it } from 'vitest'

import { calculateCourse, type CourseDrug, type CoursePatient } from './course'
import { DomainInputError } from './types'

// 180 cm × 80 kg → BSA = √(180 × 80 / 3600) = 2.0 m² exactly, so doses stay round.
const patient: CoursePatient = {
  ageYears: 60,
  sex: 'male',
  heightCm: 180,
  weightKg: 80,
  serumCreatinine: 88.4, // = 1.0 mg/dL → CrCl = (140 − 60) × 80 / (72 × 1) = 88.89 mL/min
  creatinineUnit: 'umol_l',
}

const rituximab: CourseDrug = {
  id: 'r.rituximab',
  dose: { value: 375, unit: 'mg_m2' },
  days: [1],
  durationMin: 240,
  presentations: [
    { id: 'v100', strengthAmount: 100 },
    { id: 'v500', strengthAmount: 500 },
  ],
  infusion: {
    concentrationMinMgMl: 1,
    concentrationMaxMgMl: 4,
    stockConcentrationMgMl: 10,
    bagVolumesMl: [100, 250, 500],
  },
}

const prednisolone: CourseDrug = {
  id: 'r.prednisolone',
  dose: { value: 100, unit: 'mg_flat' },
  days: [1, 2, 3],
  presentations: [{ id: 't5', strengthAmount: 5 }],
}

const adjustments = { startDateIso: '2026-09-21' }

describe('calculateCourse', () => {
  it('uses the BSA the physician typed instead of the one Mosteller gives', () => {
    // Mosteller on 180 cm / 80 kg is exactly 2.0; the physician enters 1.7 for an amputee.
    const course = calculateCourse(patient, [rituximab], { ...adjustments, bsaM2: 1.7 })

    expect(course.bsa.actualM2).toBe(1.7)
    expect(course.bsa.entered).toBe(true)
    expect(course.bsa.isCapped).toBe(false)
    // 375 mg/m² × 1.7 = 637.5 → 638 mg after rounding to the step.
    expect(course.drugs[0]?.doseAmount).toBe(638)
  })

  it('still derives the capped variant from an entered BSA', () => {
    const course = calculateCourse(patient, [rituximab], { ...adjustments, bsaM2: 2.4 })

    expect(course.bsa.cappedM2).toBe(2)
    expect(course.bsa.isCapped).toBe(true)
    expect(course.warnings.some((warning) => warning.code === 'bsa.capped')).toBe(true)
  })

  it('questions an entered BSA that disagrees with the height and weight on the form', () => {
    // A typed digit: 12.0 instead of 2.0. The dose is still calculated from what was entered.
    const course = calculateCourse(patient, [rituximab], { ...adjustments, bsaM2: 1.2 })
    const warning = course.warnings.find((item) => item.code === 'bsa.enteredDiffers')

    expect(warning).toBeDefined()
    expect(warning?.params.enteredM2).toBe(1.2)
    expect(warning?.params.calculatedM2).toBe(2)
    expect(course.bsa.actualM2).toBe(1.2)
  })

  it('says nothing when the entered BSA matches the calculated one', () => {
    const course = calculateCourse(patient, [rituximab], { ...adjustments, bsaM2: 2.05 })
    expect(course.warnings.some((warning) => warning.code === 'bsa.enteredDiffers')).toBe(false)
  })

  it('calculates from an entered BSA alone, with no height and no weight', () => {
    // The physician has the BSA from the previous cycle's sheet and nothing else on the form.
    const bare: CoursePatient = { sex: 'male' }
    const course = calculateCourse(bare, [rituximab], { ...adjustments, bsaM2: 1.8 })

    expect(course.bsa.actualM2).toBe(1.8)
    // Nothing to compare the typed figure against, so nothing is claimed about it.
    expect(course.warnings.some((warning) => warning.code === 'bsa.enteredDiffers')).toBe(false)
    // 375 mg/m² × 1.8 = 675 mg.
    expect(course.drugs[0]?.doseAmount).toBe(675)
  })

  it('names the measurement it needs when the BSA is not entered', () => {
    const noHeight: CoursePatient = { sex: 'male', weightKg: 80 }
    const noWeight: CoursePatient = { sex: 'male', heightCm: 180 }

    expect(() => calculateCourse(noHeight, [rituximab], adjustments)).toThrow(
      expect.objectContaining({ field: 'heightCm' }),
    )
    expect(() => calculateCourse(noWeight, [rituximab], adjustments)).toThrow(
      expect.objectContaining({ field: 'weightKg' }),
    )
  })

  it('needs the weight for a dose per kilogram, whatever the BSA', () => {
    const perKilogram: CourseDrug = {
      id: 'r.cytarabine',
      dose: { value: 2, unit: 'mg_kg' },
      days: [1],
    }
    expect(() =>
      calculateCourse({ sex: 'male' }, [perKilogram], { ...adjustments, bsaM2: 1.8 }),
    ).toThrow(expect.objectContaining({ field: 'weightKg' }))
  })

  it('says so instead of passing off a missing clearance as no concern', () => {
    // Creatinine without an age: Cockcroft-Gault cannot be evaluated, and the physician is told.
    const noAge: CoursePatient = { sex: 'male', weightKg: 80, serumCreatinine: 88.4 }
    const course = calculateCourse(noAge, [rituximab], { ...adjustments, bsaM2: 1.8 })
    const warning = course.warnings.find((item) => item.code === 'review.clearanceUnknown')

    expect(course.creatinineClearanceMlMin).toBeNull()
    expect(warning?.params.field).toBe('ageYears')

    const noWeight: CoursePatient = { sex: 'male', ageYears: 60, serumCreatinine: 88.4 }
    expect(
      calculateCourse(noWeight, [rituximab], { ...adjustments, bsaM2: 1.8 }).warnings.find(
        (item) => item.code === 'review.clearanceUnknown',
      )?.params.field,
    ).toBe('weightKg')
  })

  it('says when an age-based review hint cannot be given', () => {
    const elderlyRule: CourseDrug = { ...rituximab, reviewRules: { elderly: true } }
    const course = calculateCourse({ sex: 'male' }, [elderlyRule], {
      ...adjustments,
      bsaM2: 1.8,
    })

    expect(course.warnings.some((warning) => warning.code === 'review.ageUnknown')).toBe(true)
    // With an age on the form there is nothing to say: the hint itself is shown or it is not.
    const withAge = calculateCourse({ ...patient, ageYears: 60 }, [elderlyRule], adjustments)
    expect(withAge.warnings.some((warning) => warning.code === 'review.ageUnknown')).toBe(false)
  })

  it('refuses an entered BSA that is not a positive number', () => {
    expect(() => calculateCourse(patient, [rituximab], { ...adjustments, bsaM2: 0 })).toThrow(
      DomainInputError,
    )
  })

  it('puts day 0 on the day before the course starts', () => {
    // A day 0 is optional and is for what has to be done before the regimen proper: the
    // hydration that runs the evening before the first cytostatic.
    const hydration: CourseDrug = {
      id: 'r.hydration',
      dose: { value: 1000, unit: 'mg_flat' },
      days: [0, 1],
      block: 'day_support',
    }
    const course = calculateCourse(patient, [hydration, rituximab], adjustments)

    expect(course.days.map((day) => [day.day, day.date])).toEqual([
      [0, '2026-09-20'],
      [1, '2026-09-21'],
    ])
    // Day 0 has no infusion of the regimen to hang off, so its support starts the day itself.
    expect(course.days[0]?.administrations.map((item) => item.start)).toEqual(['09:00'])
  })

  it('converts a dose written in units of activity into the packs the drug is measured in', () => {
    // Filgrastim is prescribed either way; the same syringe reads 300 mcg and 30 million IU.
    const filgrastim: CourseDrug = {
      id: 'r.filgrastim',
      dose: { value: 48, unit: 'miu_flat' },
      days: [1],
      presentations: [
        { id: 's300', strengthAmount: 300, unit: 'mcg' },
        { id: 's480', strengthAmount: 480, unit: 'mcg' },
      ],
      unitEquivalence: { amount: 300, amount_unit: 'mcg', activity: 30, activity_unit: 'miu' },
    }
    const course = calculateCourse(patient, [filgrastim], adjustments)
    const result = course.drugs[0]!

    expect(result.doseAmount).toBe(48)
    expect(result.amountUnit).toBe('miu')
    // 480 mcg is 48 million IU, so one syringe covers the dose exactly.
    expect(result.pack?.items.map((item) => [item.presentation.id, item.count])).toEqual([
      ['s480', 1],
    ])
  })

  it('refuses a pack in another family when the drug says nothing about what it is worth', () => {
    const bleomycin: CourseDrug = {
      id: 'r.bleomycin',
      dose: { value: 15, unit: 'iu_flat' },
      days: [1],
      presentations: [{ id: 'v15', strengthAmount: 15, unit: 'mg' }],
    }
    expect(() => calculateCourse(patient, [bleomycin], adjustments)).toThrow(DomainInputError)
  })

  it('calculates doses, vials, infusion and the day calendar', () => {
    const course = calculateCourse(patient, [rituximab, prednisolone], adjustments)

    expect(course.bsa.actualM2).toBe(2)
    expect(course.bsa.isCapped).toBe(false)
    expect(course.creatinineClearanceMlMin).toBeCloseTo(88.889, 3)

    const [rtx, pred] = course.drugs
    // 375 mg/m² × 2.0 m² = 750 mg.
    expect(rtx?.doseAmount).toBe(750)
    expect(rtx?.variants.differs).toBe(false)
    // Least waste covering 750 mg: 500 + 3 × 100 = 800 mg.
    expect(rtx?.pack).toMatchObject({ totalAmount: 800, wasteAmount: 50, unitCount: 4 })
    // 750 mg of a 10 mg/mL concentrate = 75 mL; the 100 mL bag would exceed 4 mg/mL.
    expect(rtx?.infusion).toMatchObject({ bagVolumeMl: 250, drugVolumeMl: 75, totalVolumeMl: 325 })
    expect(rtx?.infusion?.concentrationPerMl).toBeCloseTo(2.308, 3)
    expect(rtx?.infusion?.rateMlH).toBeCloseTo(81.25, 2)
    expect(rtx?.administrationsInCourse).toBe(1)

    expect(pred?.doseAmount).toBe(100)
    expect(pred?.administrationsInCourse).toBe(3)
    expect(pred?.packTotals).toEqual([
      { presentation: { id: 't5', strengthAmount: 5, unit: 'mg' }, count: 60 },
    ])

    expect(course.days.map((day) => `${day.day}:${day.date}`)).toEqual([
      '1:2026-09-21',
      '2:2026-09-22',
      '3:2026-09-23',
    ])
    expect(course.days[0]?.administrations).toEqual([
      expect.objectContaining({ drugId: 'r.rituximab', start: '09:00', end: '13:00' }),
      expect.objectContaining({ drugId: 'r.prednisolone', start: '13:00', end: '13:00' }),
    ])
    expect(course.days[1]?.administrations.map((a) => a.drugId)).toEqual(['r.prednisolone'])
    expect(course.presentationTotals).toEqual([
      { presentation: { id: 'v500', strengthAmount: 500, unit: 'mg' }, count: 1 },
      { presentation: { id: 'v100', strengthAmount: 100, unit: 'mg' }, count: 3 },
      { presentation: { id: 't5', strengthAmount: 5, unit: 'mg' }, count: 60 },
    ])
    expect(course.warnings).toEqual([])
    expect(rtx?.steps.map((step) => step.key)).toEqual([
      'bsa.mosteller',
      'bsa.cap',
      'dose.perBsa',
      'rounding.step',
      'infusion.volume',
      'infusion.concentration',
      'infusion.rate',
    ])
  })

  it('keeps both BSA variants and uses the selected one for vials and infusion', () => {
    // 190 cm × 95 kg → BSA 2.239 m², above the 2.0 m² cap.
    const big = { ...patient, heightCm: 190, weightKg: 95 }
    const actual = calculateCourse(big, [rituximab], { ...adjustments })
    const capped = calculateCourse(big, [rituximab], { ...adjustments, bsaVariant: 'capped' })

    expect(actual.bsa.isCapped).toBe(true)
    expect(actual.warnings).toEqual([expect.objectContaining({ code: 'bsa.capped' })])
    expect(actual.drugs[0]?.variants.differs).toBe(true)
    expect(actual.drugs[0]?.doseAmount).toBe(840) // 375 × 2.2392 = 839.7 → 840 mg
    expect(actual.drugs[0]?.rounded.capped.roundedAmount).toBe(750)
    expect(capped.drugs[0]?.doseAmount).toBe(750)
    expect(capped.drugs[0]?.pack?.totalAmount).toBe(800)
    expect(actual.drugs[0]?.pack?.totalAmount).toBe(900)
  })

  it('applies course and per-drug reductions', () => {
    const course = calculateCourse(patient, [rituximab, prednisolone], {
      ...adjustments,
      coursePercent: 25,
      drugPercent: { 'r.prednisolone': 50 },
    })
    expect(course.drugs[0]?.doseAmount).toBe(563) // 750 − 25% = 562.5 → 563 mg
    expect(course.drugs[0]?.variants.actual.reductionPercent).toBe(25)
    expect(course.drugs[1]?.doseAmount).toBe(50) // per-drug 50% replaces the course 25%
  })

  it('takes a dose typed by hand over the calculated one', () => {
    const course = calculateCourse(patient, [rituximab, prednisolone], {
      ...adjustments,
      coursePercent: 25,
      doseOverrideAmount: { 'r.rituximab': 700 },
    })
    const drug = course.drugs[0]!
    expect(drug.doseAmount).toBe(700)
    // Vials, solvent and rate follow the typed dose, the chain keeps what was calculated.
    expect(drug.pack?.totalAmount).toBe(700)
    expect(drug.infusion?.drugVolumeMl).toBe(70) // 700 mg at 10 mg/mL
    expect(drug.steps.at(-1)?.key).not.toBe('dose.manual')
    expect(drug.steps.find((step) => step.key === 'dose.manual')).toEqual({
      key: 'dose.manual',
      value: 700,
      unit: 'mg',
      params: { calculated: 563, unit: 'mg' },
    })
    expect(course.drugs[1]?.doseAmount).toBe(75) // other drugs keep the course reduction
  })

  it('rejects a hand-typed dose that is not a positive number of mg', () => {
    expect(() =>
      calculateCourse(patient, [rituximab], {
        ...adjustments,
        doseOverrideAmount: { 'r.rituximab': 0 },
      }),
    ).toThrow(DomainInputError)
  })

  it('leaves switched-off drugs out of doses, days and totals', () => {
    const course = calculateCourse(patient, [rituximab, prednisolone], {
      ...adjustments,
      disabledIds: ['r.rituximab'],
    })
    expect(course.drugs.map((drug) => drug.id)).toEqual(['r.prednisolone'])
    expect(course.days[0]?.administrations.map((a) => a.drugId)).toEqual(['r.prednisolone'])
    expect(course.presentationTotals).toEqual([
      { presentation: { id: 't5', strengthAmount: 5, unit: 'mg' }, count: 60 },
    ])
  })

  it('warns when the absolute cap or a review rule applies', () => {
    const vincristine: CourseDrug = {
      id: 'r.vincristine',
      dose: { value: 1.4, unit: 'mg_m2', capAmount: 2 },
      days: [1],
      reviewRules: { renal: true, elderly: { fromAgeYears: 60 } },
    }
    const course = calculateCourse({ ...patient, serumCreatinine: 200 }, [vincristine], adjustments)

    expect(course.drugs[0]?.doseAmount).toBe(2) // 1.4 × 2.0 = 2.8 mg → capped at 2 mg
    expect(course.drugs[0]?.warnings.map((warning) => warning.code)).toEqual([
      'review.lowCreatinineClearance',
      'review.elderly',
      'dose.capped',
    ])
    expect(course.drugs[0]?.pack).toBeNull()
    expect(course.drugs[0]?.packTotals).toEqual([])
  })

  it('warns when no bag gives an allowed concentration', () => {
    // 750 mg cannot reach 1 mg/mL in a 100 mL bag without passing 4 mg/mL: the nurse has to be
    // told, but the calculation still names the bag that is at least not over-concentrated.
    const dense: CourseDrug = {
      ...rituximab,
      infusion: { concentrationMinMgMl: 4, concentrationMaxMgMl: 5, bagVolumesMl: [500] },
    }
    const course = calculateCourse(patient, [dense], adjustments)

    expect(course.drugs[0]?.infusion?.issue).toBe('concentration_out_of_range')
    expect(course.drugs[0]?.warnings).toContainEqual({
      code: 'infusion.concentrationOutOfRange',
      params: { concentration: 1.5, unit: 'mg_ml' },
    })
  })

  it('needs creatinine for AUC doses and then uses Calvert', () => {
    const carboplatin: CourseDrug = {
      id: 'r.carboplatin',
      dose: { value: 5, unit: 'auc' },
      days: [1],
    }
    const { serumCreatinine: _omitted, ...withoutCreatinine } = patient

    expect(() => calculateCourse(withoutCreatinine, [carboplatin], adjustments)).toThrow(
      DomainInputError,
    )
    const course = calculateCourse(patient, [carboplatin], adjustments)
    // AUC 5 × (88.89 + 25) = 569.4 mg → 569 mg.
    expect(course.drugs[0]?.doseAmount).toBe(569)
  })

  it('schedules several administrations a day and shifts the rest of the day with them', () => {
    const twiceDaily: CourseDrug = { ...prednisolone, administrationsPerDay: 2, durationMin: 30 }
    const course = calculateCourse(patient, [rituximab, twiceDaily], {
      ...adjustments,
      dayStart: '08:00',
      shiftMin: { 'r.rituximab': 60 },
    })

    expect(course.days[0]?.administrations).toEqual([
      expect.objectContaining({ id: 'r.rituximab', start: '09:00', end: '13:00' }),
      expect.objectContaining({ id: 'r.prednisolone#1', start: '13:00', end: '13:30' }),
      expect.objectContaining({ id: 'r.prednisolone#2', start: '13:30', end: '14:00' }),
    ])
    expect(course.drugs[1]?.administrationsInCourse).toBe(6)
    expect(course.days[0]?.presentations).toEqual([
      { presentation: { id: 'v500', strengthAmount: 500, unit: 'mg' }, count: 1 },
      { presentation: { id: 'v100', strengthAmount: 100, unit: 'mg' }, count: 3 },
      { presentation: { id: 't5', strengthAmount: 5, unit: 'mg' }, count: 40 },
    ])
  })

  it('passes implausible patient values through as warnings, not errors', () => {
    const course = calculateCourse({ ...patient, weightKg: 17 }, [prednisolone], adjustments)
    expect(course.warnings).toEqual([
      expect.objectContaining({
        code: 'input.outOfRange',
        params: expect.objectContaining({ field: 'weightKg' }),
      }),
    ])
  })

  it('keeps a drug measured in international units in its own unit', () => {
    // Bleomycin is prescribed and packaged in IU; 10 000 IU/m² × 2.0 m² = 20 000 IU,
    // covered by two 15 000 IU vials (one alone is not enough).
    const bleomycin: CourseDrug = {
      id: 'r.bleomycin',
      dose: { value: 10_000, unit: 'iu_m2' },
      days: [1, 15],
      durationMin: 30,
      presentations: [{ id: 'v15000', strengthAmount: 15_000 }],
      infusion: { bagVolumesMl: [100] },
    }
    const course = calculateCourse(patient, [bleomycin], adjustments)
    const result = course.drugs[0]!

    expect(result.amountUnit).toBe('iu')
    expect(result.doseAmount).toBe(20_000)
    expect(result.pack?.items).toEqual([
      { presentation: { id: 'v15000', strengthAmount: 15_000, unit: 'iu' }, count: 2 },
    ])
    expect(result.pack?.wasteAmount).toBe(10_000)
    expect(result.infusion?.concentrationPerMl).toBe(200)
    expect(result.infusion?.concentrationUnit).toBe('iu')
    expect(result.steps.some((step) => step.unit === 'iu')).toBe(true)
  })

  it('counts a pack labelled in another unit of the same kind', () => {
    // Filgrastim is dosed in micrograms and comes in 300 mcg syringes; a 0.3 mg pack is the same.
    const filgrastim: CourseDrug = {
      id: 'r.filgrastim',
      dose: { value: 5, unit: 'mcg_kg' },
      days: [6],
      presentations: [{ id: 's03', strengthAmount: 0.3, unit: 'mg' }],
    }
    const result = calculateCourse(patient, [filgrastim], adjustments).drugs[0]!

    expect(result.amountUnit).toBe('mcg')
    expect(result.doseAmount).toBe(400)
    expect(result.pack?.items).toEqual([
      { presentation: { id: 's03', strengthAmount: 300, unit: 'mcg' }, count: 2 },
    ])
  })

  it('refuses mg/mL dilution limits for a drug measured in units of activity', () => {
    const wrong: CourseDrug = {
      id: 'r.wrong',
      dose: { value: 10_000, unit: 'iu_flat' },
      days: [1],
      infusion: { bagVolumesMl: [100], concentrationMaxMgMl: 4 },
    }
    expect(() => calculateCourse(patient, [wrong], adjustments)).toThrow(DomainInputError)
  })

  it('rejects a manual dose that is not a positive number', () => {
    expect(() =>
      calculateCourse(patient, [prednisolone], {
        ...adjustments,
        doseOverrideAmount: { 'r.prednisolone': 0 },
      }),
    ).toThrow(/doseOverrideAmount/)
  })

  it('rejects malformed course input', () => {
    expect(() => calculateCourse(patient, [rituximab, rituximab], adjustments)).toThrow(
      /duplicate drug id/,
    )
    expect(() => calculateCourse(patient, [{ ...prednisolone, days: [] }], adjustments)).toThrow(
      DomainInputError,
    )
    expect(() =>
      calculateCourse(patient, [{ ...prednisolone, administrationsPerDay: 0 }], adjustments),
    ).toThrow(DomainInputError)
  })

  it('works without creatinine and without presentations', () => {
    const { serumCreatinine: _omitted, ...withoutCreatinine } = patient
    const bare: CourseDrug = { id: 'x', dose: { value: 10, unit: 'mg_kg' }, days: [1] }
    const course = calculateCourse(withoutCreatinine, [bare], adjustments)

    expect(course.creatinineClearanceMlMin).toBeNull()
    expect(course.drugs[0]?.doseAmount).toBe(800)
    expect(course.drugs[0]?.infusion).toBeNull()
    expect(course.presentationTotals).toEqual([])
  })
})
