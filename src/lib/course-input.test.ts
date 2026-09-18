import { describe, expect, it } from 'vitest'

import { calculateCourse } from '../domain'
import { indexCatalog } from './catalog-index'
import { demoCatalog } from './catalog.fixture'
import { buildCourseItems, resolveInfusionParams } from './course-input'

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
        { id: 'rituximab.vial-100', strengthMg: 100 },
        { id: 'rituximab.vial-500', strengthMg: 500 },
      ],
    })
    expect(rituximab.missingInfusionData).toBe(false)
  })

  it('takes the absolute cap and review rules from the drug when the regimen has none', () => {
    const vincristine = buildCourseItems(index(), 'r-chop-21')[3]!
    expect(vincristine.courseDrug.dose).toEqual({ value: 1.4, unit: 'mg_m2', capMg: 2 })
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

    expect(course.drugs.map((drug) => drug.doseMg)).toEqual([750, 1500, 100, 2, 100])
    expect(course.days.map((day) => day.day)).toEqual([1, 2, 3, 4, 5])
    expect(course.drugs[3]?.warnings.map((warning) => warning.code)).toEqual(['dose.capped'])
  })
})
