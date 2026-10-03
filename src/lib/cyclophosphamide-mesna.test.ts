import { describe, expect, it } from 'vitest'

import { calculateCourse } from '../domain'
import { indexCatalog } from './catalog-index'
import { demoCatalog } from './catalog.fixture'
import { buildCourseItems } from './course-input'
import { cyclophosphamideMesna } from './cyclophosphamide-mesna'

/** The demo catalog plus mesna in 400 mg ampoules. */
function catalogWithMesna() {
  const catalog = demoCatalog()
  const template = catalog.drugs.find((drug) => drug.id === 'vincristine')!
  catalog.drugs.push({ ...template, id: 'mesna', max_single_dose_amount: null })
  const vial = catalog.drug_presentations.find((row) => row.drug_id === 'vincristine')!
  catalog.drug_presentations.push({
    ...vial,
    id: 'mesna.s400',
    drug_id: 'mesna',
    form: 'vial',
    strength_amount: 400,
  })
  return indexCatalog(catalog)
}

const patient = { ageYears: 50, sex: 'male' as const, heightCm: 180, weightKg: 80 }
const adjustments = { startDateIso: '2026-10-05', dayStart: '09:00', bsaM2: 2 }

describe('mesna for cyclophosphamide', () => {
  it('adds the label scheme once the single dose reaches 1000 mg', () => {
    // R-CHOP cyclophosphamide 750 mg/m² at a hand-typed 2.0 m² = 1500 mg; mesna 20% = 300 mg
    // at 0, 4 and 8 hours, rounded up to one 400 mg ampoule each.
    const catalog = catalogWithMesna()
    const items = buildCourseItems(catalog, 'r-chop-21')
    const course = calculateCourse(
      patient,
      items.map((item) => item.courseDrug),
      adjustments,
    )
    const [mesna] = cyclophosphamideMesna(catalog, items, course)

    expect(mesna!.item).toMatchObject({
      drug_id: 'mesna',
      role: 'supportive',
      route: 'iv_bolus',
      dose_value: 300,
      dose_unit: 'mg_flat',
      administrations_per_day: 3,
      interval_min: 240,
      block: 'day_support',
    })
    expect(mesna!.courseDrug.anchorDrugId).toBe('r-chop-21.cyclophosphamide')

    const withMesna = [...items, mesna!]
    const again = calculateCourse(
      patient,
      withMesna.map((item) => item.courseDrug),
      adjustments,
    )
    const result = again.drugs.find((drug) => drug.id === mesna!.item.id)!
    expect(result.doseAmount).toBe(400)
    expect(result.administrationsInCourse).toBe(3)
  })

  it('adds nothing below 1000 mg', () => {
    // 750 mg/m² at 1.3 m² = 975 mg.
    const catalog = catalogWithMesna()
    const items = buildCourseItems(catalog, 'r-chop-21')
    const course = calculateCourse(
      patient,
      items.map((item) => item.courseDrug),
      {
        ...adjustments,
        bsaM2: 1.3,
      },
    )
    expect(cyclophosphamideMesna(catalog, items, course)).toEqual([])
  })

  it('adds nothing when the course gives mesna of its own or the catalog has none', () => {
    const catalog = catalogWithMesna()
    const items = buildCourseItems(catalog, 'r-chop-21')
    const course = calculateCourse(
      patient,
      items.map((item) => item.courseDrug),
      adjustments,
    )
    const ownMesna = { ...items[0]!, item: { ...items[0]!.item, drug_id: 'mesna' } }
    expect(cyclophosphamideMesna(catalog, [...items, ownMesna], course)).toEqual([])

    const plain = indexCatalog(demoCatalog())
    expect(cyclophosphamideMesna(plain, items, course)).toEqual([])
  })

  it('leaves a switched-off cyclophosphamide alone', () => {
    const catalog = catalogWithMesna()
    const items = buildCourseItems(catalog, 'r-chop-21')
    const course = calculateCourse(
      patient,
      items.map((item) => item.courseDrug),
      {
        ...adjustments,
        disabledIds: ['r-chop-21.cyclophosphamide'],
      },
    )
    expect(cyclophosphamideMesna(catalog, items, course)).toEqual([])
  })
})
