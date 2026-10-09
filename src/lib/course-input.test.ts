import { describe, expect, it } from 'vitest'

import { calculateCourse } from '../domain'
import { indexCatalog } from './catalog-index'
import { demoCatalog } from './catalog.fixture'
import type { RegimenItem } from '../schemas/catalog'
import {
  activeModifiers,
  applyAdministrationMode,
  applyModifiers,
  buildCourseItems,
  buildCourseItemsFrom,
  canSwitchAdministration,
  customCourseItem,
  DEFAULT_DOSE_CHOICE,
  fitsRoute,
  PROTOCOL_MODE,
  resolveInfusionParams,
  solventOf,
} from './course-input'

const index = () => indexCatalog(demoCatalog())

describe('buildCourseItems', () => {
  it('joins regimen items with the drug catalog in administration order', () => {
    const items = buildCourseItems(index(), 'r-chop-21')

    expect(items.map((entry) => entry.item.drug_id)).toEqual([
      'rituximab',
      'cyclophosphamide',
      'doxorubicin',
      'vincristine',
      'prednisolone',
    ])

    const rituximab = items[0]!
    expect(rituximab.courseDrug).toEqual({
      id: 'r-chop-21.rituximab',
      block: 'infusion',
      isMain: true,
      dose: { value: 375, unit: 'mg_m2' },
      days: [1],
      administrationsPerDay: 1,
      infusion: {
        bagVolumesMl: [100, 250, 500],
        concentrationMinMgMl: 1,
        concentrationMaxMgMl: 4,
        stockConcentrationMgMl: 10,
      },
      presentations: [
        { id: 'rituximab.vial-100', strengthAmount: 100, unit: 'mg' },
        { id: 'rituximab.vial-500', strengthAmount: 500, unit: 'mg' },
      ],
    })
    expect(rituximab.missingInfusionData).toBe(false)
  })

  it('takes the absolute cap and review rules from the drug when the regimen has none', () => {
    const vincristine = buildCourseItems(index(), 'r-chop-21')[3]!
    expect(vincristine.courseDrug.dose).toEqual({ value: 1.4, unit: 'mg_m2', capAmount: 2 })
    expect(vincristine.courseDrug.reviewRules).toEqual({ hepatic: true })
  })

  it('flags an infusion without parameters and without a fallback volume', () => {
    const cyclophosphamide = buildCourseItems(index(), 'r-chop-21')[1]!
    expect(cyclophosphamide.courseDrug.infusion).toBeUndefined()
    expect(cyclophosphamide.missingInfusionData).toBe(true)
  })

  it('uses the regimen fallback volume when the drug catalog has none', () => {
    const catalog = demoCatalog()
    const item = catalog.regimen_items.find((row) => row.drug_id === 'cyclophosphamide')!
    item.fallback_volume_ml = 500
    item.duration_min = 60
    const built = buildCourseItems(indexCatalog(catalog), 'r-chop-21')[1]!

    expect(built.courseDrug.infusion).toEqual({ bagVolumesMl: [500] })
    expect(built.courseDrug.durationMin).toBe(60)
    expect(built.missingInfusionData).toBe(false)
  })

  it('skips items whose drug is missing and non-infusion routes get no infusion', () => {
    const catalog = demoCatalog()
    catalog.drugs = catalog.drugs.filter((drug) => drug.id !== 'rituximab')
    const items = buildCourseItems(indexCatalog(catalog), 'r-chop-21')

    expect(items.map((entry) => entry.item.drug_id)).toEqual([
      'cyclophosphamide',
      'doxorubicin',
      'vincristine',
      'prednisolone',
    ])
    const oral = items.at(-1)!
    expect(oral.courseDrug.infusion).toBeUndefined()
    expect(oral.missingInfusionData).toBe(false)
  })

  it('returns an empty list for an unknown regimen', () => {
    expect(buildCourseItems(index(), 'nope')).toEqual([])
  })
})

describe('dose choices', () => {
  it('offers the regimen dose first and the alternatives after it', () => {
    const prednisolone = buildCourseItems(index(), 'r-chop-21').at(-1)!
    expect(prednisolone.doseChoiceId).toBe(DEFAULT_DOSE_CHOICE)
    expect(prednisolone.doseChoices).toEqual([
      {
        id: DEFAULT_DOSE_CHOICE,
        label: null,
        doseValue: 100,
        doseUnit: 'mg_flat',
        capAmount: null,
      },
      {
        id: '40-mg_m2',
        label: 'ДЕМО: інший протокол',
        note: null,
        doseValue: 40,
        doseUnit: 'mg_m2',
        capAmount: null,
        source: { name: 'ДЕМО: інший протокол', checkedOn: '2026-09-19' },
      },
    ])
  })

  it('tells two doses of one protocol apart by their dose, not by its name', () => {
    const catalog = demoCatalog()
    const item = catalog.regimen_items.find((row) => row.id === 'r-chop-21.prednisolone')!
    const source = { name: 'ДЕМО: один протокол', checkedOn: '2026-09-19' }
    item.dose_options = [
      {
        dose_value: 60,
        dose_unit: 'mg_m2',
        cap_amount: null,
        notes: { uk: 'Старші 70 років' },
        source,
      },
      {
        dose_value: 80,
        dose_unit: 'mg_m2',
        cap_amount: null,
        notes: { uk: 'До 70 років' },
        source,
      },
    ]
    const choices = buildCourseItems(indexCatalog(catalog), 'r-chop-21').at(-1)!.doseChoices
    expect(choices.map((choice) => choice.id)).toEqual([
      DEFAULT_DOSE_CHOICE,
      '60-mg_m2',
      '80-mg_m2',
    ])
    expect(choices[2]?.note).toEqual({ uk: 'До 70 років' })
  })

  it('calculates with an alternative that shares its document with another', () => {
    const catalog = demoCatalog()
    const item = catalog.regimen_items.find((row) => row.id === 'r-chop-21.prednisolone')!
    const source = { name: 'ДЕМО: один протокол', checkedOn: '2026-09-19' }
    item.dose_options = [
      {
        dose_value: 60,
        dose_unit: 'mg_m2',
        cap_amount: null,
        notes: { uk: 'Старші 70 років' },
        source,
      },
      {
        dose_value: 80,
        dose_unit: 'mg_m2',
        cap_amount: null,
        notes: { uk: 'До 70 років' },
        source,
      },
    ]
    const items = buildCourseItems(indexCatalog(catalog), 'r-chop-21', {
      'r-chop-21.prednisolone': '80-mg_m2',
    })
    expect(items.at(-1)!.courseDrug.dose).toEqual({ value: 80, unit: 'mg_m2' })
  })

  it('calculates with the protocol the physician picked', () => {
    const items = buildCourseItems(index(), 'r-chop-21', {
      'r-chop-21.prednisolone': '40-mg_m2',
    })
    const prednisolone = items.at(-1)!
    expect(prednisolone.doseChoiceId).toBe('40-mg_m2')
    expect(prednisolone.courseDrug.dose).toEqual({ value: 40, unit: 'mg_m2' })
  })

  it('falls back to the regimen dose when the choice is unknown', () => {
    const items = buildCourseItems(index(), 'r-chop-21', { 'r-chop-21.prednisolone': 'nope' })
    expect(items.at(-1)!.courseDrug.dose).toEqual({ value: 100, unit: 'mg_flat' })
  })

  it('names the regimen source in the first choice when the regimen has one', () => {
    const catalog = demoCatalog()
    catalog.regimens[0]!.sources = [{ name: 'DEMO protocol', checkedOn: '2026-09-19' }]
    const first = buildCourseItems(indexCatalog(catalog), 'r-chop-21')[0]!
    expect(first.doseChoices[0]?.label).toBe('DEMO protocol')
    expect(first.doseChoices[0]?.source?.checkedOn).toBe('2026-09-19')
  })
})

describe('resolveInfusionParams', () => {
  it('prefers the params the item points at, then the default, then the only one', () => {
    const catalog = demoCatalog()
    const params = catalog.drug_infusion_params[0]!
    // Only one default per drug is allowed by the database.
    const second = {
      ...params,
      id: 'rituximab.glucose',
      solvent: 'glucose_5' as const,
      is_default: false,
    }
    catalog.drug_infusion_params.push(second)
    const item = catalog.regimen_items[0]!

    expect(resolveInfusionParams(indexCatalog(catalog), item)?.id).toBe('rituximab.nacl')

    item.infusion_params_id = 'rituximab.glucose'
    expect(resolveInfusionParams(indexCatalog(catalog), item)?.id).toBe('rituximab.glucose')

    item.infusion_params_id = 'rituximab.missing'
    expect(resolveInfusionParams(indexCatalog(catalog), item)).toBeNull()

    item.infusion_params_id = null
    params.is_default = false
    expect(resolveInfusionParams(indexCatalog(catalog), item)).toBeNull()
  })
})

describe('solventOf', () => {
  it('takes the drug parameters first, then the solvent the regimen names, saline last', () => {
    const items = buildCourseItems(index(), 'r-chop-21')
    const withParams = items.find((entry) => entry.infusionParams !== null)!
    expect(solventOf(withParams)).toBe(withParams.infusionParams!.solvent)

    // Liposomal doxorubicin: no catalog parameters, the regimen says 5% glucose.
    const own = { ...withParams, infusionParams: null }
    expect(solventOf({ ...own, item: { ...own.item, fallback_solvent: 'glucose_5' } })).toBe(
      'glucose_5',
    )
    expect(solventOf({ ...own, item: { ...own.item, fallback_solvent: null } })).toBe(
      'sodium_chloride_0_9',
    )
  })
})

describe('regimen calculation end to end', () => {
  it('calculates the demo regimen for a patient with BSA 2.0 m²', () => {
    const items = buildCourseItems(index(), 'r-chop-21')
    const course = calculateCourse(
      { ageYears: 60, sex: 'male', heightCm: 180, weightKg: 80, serumCreatinine: 88.4 },
      items.map((entry) => entry.courseDrug),
      { startDateIso: '2026-09-21' },
    )

    expect(course.drugs.map((drug) => drug.doseAmount)).toEqual([750, 1500, 100, 2, 100])
    expect(course.days.map((day) => day.day)).toEqual([1, 2, 3, 4, 5])
    expect(course.drugs[3]?.warnings.map((warning) => warning.code)).toEqual(['dose.capped'])
  })
})

describe('fitsRoute', () => {
  it('keeps only packs that match the route', () => {
    expect(fitsRoute('tablet', 'oral')).toBe(true)
    expect(fitsRoute('capsule', 'oral')).toBe(true)
    expect(fitsRoute('ampoule', 'oral')).toBe(false)
    expect(fitsRoute('vial', 'iv_infusion')).toBe(true)
    expect(fitsRoute('ampoule', 'subcutaneous')).toBe(true)
    expect(fitsRoute('tablet', 'iv_bolus')).toBe(false)
    expect(fitsRoute('other', 'oral')).toBe(false)
    // Drops, ointments and gels: a bottle is not used up per administration, so none is counted.
    expect(fitsRoute('vial', 'topical')).toBe(false)
    expect(fitsRoute('tablet', 'topical')).toBe(false)
  })

  it('counts oral prednisolone in tablets, not in ampoules', () => {
    const catalog = demoCatalog()
    catalog.drugs.push({ ...catalog.drugs[0]!, id: 'prednisolone-mix' })
    const oral = catalog.regimen_items.find((row) => row.route === 'oral')!
    catalog.drug_presentations.push(
      {
        ...catalog.drug_presentations[0]!,
        id: 'p.amp',
        drug_id: oral.drug_id,
        form: 'ampoule',
        strength_amount: 30,
      },
      {
        ...catalog.drug_presentations[0]!,
        id: 'p.tab',
        drug_id: oral.drug_id,
        form: 'tablet',
        strength_amount: 5,
      },
    )
    const built = buildCourseItemsFrom(indexCatalog(catalog), [oral])[0]!
    expect(built.courseDrug.presentations?.map((p) => p.id)).not.toContain('p.amp')
    expect(built.courseDrug.presentations?.map((p) => p.id)).toContain('p.tab')
  })
})

describe('dose modifiers', () => {
  const source = { name: 'ДЕМО: інструкція', checkedOn: '2026-09-19' }
  const withModifiers = () => {
    const catalog = demoCatalog()
    const item = catalog.regimen_items.find((row) => row.id === 'r-chop-21.prednisolone')!
    item.dose_modifiers = [
      {
        key: 'strong-inhibitor',
        label: { uk: 'Сильний інгібітор' },
        dose_value: 25,
        cap_amount: null,
        notes: null,
        default_on: false,
        source,
      },
      {
        key: 'moderate-inhibitor',
        label: { uk: 'Помірний інгібітор' },
        dose_value: 50,
        cap_amount: null,
        notes: null,
        default_on: true,
        source,
      },
    ]
    return catalog
  }

  it('applies the modifiers the protocol itself assumes until the physician says otherwise', () => {
    const item = buildCourseItems(indexCatalog(withModifiers()), 'r-chop-21').at(-1)!
    expect(item.activeModifierKeys).toEqual(['moderate-inhibitor'])
    expect(item.courseDrug.dose).toEqual({ value: 50, unit: 'mg_flat' })
  })

  it('lets the physician switch a modifier off and keeps the regimen dose', () => {
    const items = buildCourseItems(indexCatalog(withModifiers()), 'r-chop-21', undefined, {
      'r-chop-21.prednisolone': [],
    })
    expect(items.at(-1)!.courseDrug.dose).toEqual({ value: 100, unit: 'mg_flat' })
  })

  it('takes the lowest dose when several circumstances hold at once', () => {
    const items = buildCourseItems(indexCatalog(withModifiers()), 'r-chop-21', undefined, {
      'r-chop-21.prednisolone': ['moderate-inhibitor', 'strong-inhibitor'],
    })
    expect(items.at(-1)!.courseDrug.dose).toEqual({ value: 25, unit: 'mg_flat' })
  })

  it('keeps the lowest cap among the modifiers that name one', () => {
    expect(
      applyModifiers({ value: 100, capAmount: 60 }, [
        {
          ...{ key: 'a', label: {}, notes: null, default_on: false, source },
          dose_value: 80,
          cap_amount: 40,
        },
        {
          ...{ key: 'b', label: {}, notes: null, default_on: false, source },
          dose_value: 90,
          cap_amount: null,
        },
      ]),
    ).toEqual({ value: 80, capAmount: 40 })
  })

  it('ignores a modifier key that is not in the catalog', () => {
    const catalog = withModifiers()
    const item = catalog.regimen_items.find((row) => row.id === 'r-chop-21.prednisolone')!
    expect(activeModifiers(item, ['nope'])).toEqual([])
  })
})

describe('administration mode', () => {
  /** The demo catalog plus mesna: a copy of another demo drug under the id the switch knows. */
  const withMesna = () => {
    const catalog = demoCatalog()
    const template = catalog.drugs.find((drug) => drug.id === 'vincristine')!
    catalog.drugs.push({ ...template, id: 'mesna', max_single_dose_amount: null })
    return indexCatalog(catalog)
  }
  const mesnaItem = () =>
    customCourseItem({
      id: 'mesna-row',
      drugId: 'mesna',
      doseValue: 2600,
      doseUnit: 'mg_m2',
      days: [1, 2, 3, 4],
      route: 'iv_infusion',
      durationMin: 120,
      sortOrder: 0,
    })
  const five = { kind: 'bolus', count: 5, intervalMin: 180 } as const

  it('leaves the row alone in the protocol mode', () => {
    const item = mesnaItem()
    expect(applyAdministrationMode(item, PROTOCOL_MODE)).toBe(item)
  })

  it('splits the daily dose into equal boluses timed from the first drug of the day', () => {
    // 2600 mg/m² a day in five boluses is 520 mg/m² each, every three hours.
    const split = applyAdministrationMode(mesnaItem(), five)
    expect(split).toMatchObject({
      route: 'iv_bolus',
      dose_value: 520,
      administrations_per_day: 5,
      interval_min: 180,
      anchor_offset_min: 0,
      block: 'day_support',
      duration_min: null,
      fallback_volume_ml: null,
    })
  })

  it('keeps the daily dose when the protocol already gives the drug several times a day', () => {
    // Twice a day at 1000 is 2000 a day; in four boluses that is 500 each.
    const twice = { ...mesnaItem(), dose_value: 1000, administrations_per_day: 2 }
    expect(
      applyAdministrationMode(twice, { kind: 'bolus', count: 4, intervalMin: 240 }).dose_value,
    ).toBe(500)
  })

  it('rescales the alternative doses and the cap with the split', () => {
    const item: RegimenItem = {
      ...mesnaItem(),
      cap_amount: 5000,
      dose_options: [
        {
          dose_value: 1000,
          dose_unit: 'mg_m2',
          cap_amount: 3000,
          notes: null,
          source: { name: 'x', checkedOn: '2026-10-03' },
        },
      ],
    }
    const split = applyAdministrationMode(item, five)
    expect(split.cap_amount).toBe(1000)
    expect(split.dose_options[0]).toMatchObject({ dose_value: 200, cap_amount: 600 })
  })

  it('does not touch any other drug', () => {
    const vincristine = { ...mesnaItem(), drug_id: 'vincristine' }
    expect(applyAdministrationMode(vincristine, five)).toBe(vincristine)
    expect(canSwitchAdministration(vincristine)).toBe(false)
    expect(canSwitchAdministration(mesnaItem())).toBe(true)
  })

  it('leaves mesna the protocol already gives as a bolus', () => {
    const bolus = { ...mesnaItem(), route: 'iv_bolus' as const }
    expect(canSwitchAdministration(bolus)).toBe(false)
    expect(applyAdministrationMode(bolus, five)).toBe(bolus)
    const [built] = buildCourseItemsFrom(withMesna(), [bolus])
    expect(built!.switchable).toBe(false)
  })

  it('counts the ampoules for every bolus of the course', () => {
    // BSA 1.65 m²: 520 × 1.65 = 858 mg a bolus; 5 boluses × 4 days = 20 administrations.
    const [built] = buildCourseItemsFrom(withMesna(), [mesnaItem()], undefined, undefined, {
      'mesna-row': five,
    })
    expect(built!.courseDrug).toMatchObject({
      dose: { value: 520, unit: 'mg_m2' },
      administrationsPerDay: 5,
      block: 'day_support',
      intervalMin: 180,
    })
    expect(built!.missingInfusionData).toBe(false)
    expect(built!.switchable).toBe(true)

    const course = calculateCourse(
      { ageYears: 50, sex: 'female', heightCm: 165, weightKg: 62 },
      [built!.courseDrug],
      { startDateIso: '2026-10-05', dayStart: '09:00' },
    )
    const drug = course.drugs[0]!
    expect(drug.administrationsInCourse).toBe(20)
    expect(drug.rounded.actual.roundedAmount).toBe(Math.round(520 * course.bsa.actualM2))
  })
})

describe('whole ampoules of mesna', () => {
  it('rounds every dose of mesna up to whole ampoules of the smallest strength', () => {
    const catalog = demoCatalog()
    const template = catalog.drugs.find((drug) => drug.id === 'vincristine')!
    catalog.drugs.push({ ...template, id: 'mesna', max_single_dose_amount: null })
    const vial = catalog.drug_presentations.find((row) => row.drug_id === 'vincristine')!
    catalog.drug_presentations.push(
      { ...vial, id: 'mesna.s400', drug_id: 'mesna', form: 'vial', strength_amount: 400 },
      { ...vial, id: 'mesna.s1000', drug_id: 'mesna', form: 'vial', strength_amount: 1000 },
    )
    const item = customCourseItem({
      id: 'mesna-row',
      drugId: 'mesna',
      doseValue: 520,
      doseUnit: 'mg_m2',
      days: [1],
      route: 'iv_bolus',
      sortOrder: 0,
    })
    const [built] = buildCourseItemsFrom(indexCatalog(catalog), [item])
    expect(built!.courseDrug.roundUpToWholePack).toBe(true)

    // BSA 1.65 m² (forced): 520 × 1.65 = 858 mg, 2.1 ampoules of 400 mg → 3 ampoules, 1200 mg.
    const course = calculateCourse(
      { ageYears: 50, sex: 'female', heightCm: 165, weightKg: 62 },
      [built!.courseDrug],
      { startDateIso: '2026-10-05', dayStart: '09:00', bsaM2: 1.65 },
    )
    const rounded = course.drugs[0]!.rounded.actual
    expect(rounded.unroundedAmount).toBeCloseTo(858, 6)
    expect(rounded).toMatchObject({ roundedAmount: 1200, method: 'pack' })
  })
})

describe('mesna boluses after the ifosfamide', () => {
  it('times the boluses from the ifosfamide of the same course', () => {
    const catalog = demoCatalog()
    const template = catalog.drugs.find((drug) => drug.id === 'vincristine')!
    catalog.drugs.push(
      { ...template, id: 'mesna', max_single_dose_amount: null },
      { ...template, id: 'ifosfamide', max_single_dose_amount: null },
    )
    const ifosfamide = customCourseItem({
      id: 'ifo',
      drugId: 'ifosfamide',
      doseValue: 2000,
      doseUnit: 'mg_m2',
      days: [1],
      route: 'iv_infusion',
      durationMin: 120,
      sortOrder: 1,
    })
    const mesna = customCourseItem({
      id: 'mes',
      drugId: 'mesna',
      doseValue: 2600,
      doseUnit: 'mg_m2',
      days: [1],
      route: 'iv_infusion',
      durationMin: 120,
      sortOrder: 2,
    })
    const modes = { mes: { kind: 'bolus', count: 5, intervalMin: 180 } as const }
    const built = buildCourseItemsFrom(indexCatalog(catalog), [ifosfamide, mesna], {}, {}, modes)
    expect(built[1]!.courseDrug.anchorDrugId).toBe('ifo')

    // In the protocol mode mesna stays an infusion of the chain and has no anchor of its own.
    const plain = buildCourseItemsFrom(indexCatalog(catalog), [ifosfamide, mesna])
    expect(plain[1]!.courseDrug.anchorDrugId).toBeUndefined()
  })
})
