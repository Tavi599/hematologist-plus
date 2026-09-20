import { describe, expect, it } from 'vitest'

import { calculateCourse } from '../domain'
import { indexCatalog } from './catalog-index'
import { demoCatalog } from './catalog.fixture'
import {
  buildCourseItems,
  buildCourseItemsFrom,
  DEFAULT_DOSE_CHOICE,
  fitsRoute,
  resolveInfusionParams,
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
        id: 'ДЕМО: інший протокол',
        label: 'ДЕМО: інший протокол',
        doseValue: 40,
        doseUnit: 'mg_m2',
        capAmount: null,
        source: { name: 'ДЕМО: інший протокол', checkedOn: '2026-09-19' },
      },
    ])
  })

  it('calculates with the protocol the physician picked', () => {
    const items = buildCourseItems(index(), 'r-chop-21', {
      'r-chop-21.prednisolone': 'ДЕМО: інший протокол',
    })
    const prednisolone = items.at(-1)!
    expect(prednisolone.doseChoiceId).toBe('ДЕМО: інший протокол')
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
