import { describe, expect, it } from 'vitest'

import i18n from '../../lib/i18n'
import { indexCatalog } from '../../lib/catalog-index'
import { demoCatalog } from '../../lib/catalog.fixture'
import { buildCourseItems } from '../../lib/course-input'
import type { Translate } from './course-sheets'
import { initialCourseState, type CourseState } from './course-state'
import { collectDeviations, deviationLine, revertAll, revertDeviation } from './deviations'

const items = buildCourseItems(indexCatalog(demoCatalog()), 'r-chop-21')
const RITUXIMAB = 'r-chop-21.rituximab'

function state(patch: Partial<CourseState> = {}): CourseState {
  return { ...initialCourseState(), ...patch }
}

/** The Ukrainian strings themselves, so a line is read the way the physician reads it. */
const translate: Translate = (key, values) =>
  (i18n.t as (key: string, values?: Record<string, unknown>) => string)(key, values)

function kinds(course: CourseState) {
  return collectDeviations(items, course, 'uk').map((deviation) => deviation.kind)
}

describe('collectDeviations', () => {
  it('finds nothing in a course nobody has touched', () => {
    expect(collectDeviations(items, state(), 'uk')).toEqual([])
  })

  it('lists what changes a dose and names the drug', () => {
    const deviations = collectDeviations(
      items,
      state({
        doseOverrideAmount: { [RITUXIMAB]: 600 },
        drugPercent: { 'r-chop-21.doxorubicin': 25 },
        disabledIds: ['r-chop-21.vincristine'],
      }),
      'uk',
    )

    expect(deviations.map((deviation) => deviation.kind).sort()).toEqual([
      'disabled',
      'manualDose',
      'reduction',
    ])
    expect(deviations.every((deviation) => deviation.changesDose)).toBe(true)
    expect(deviations.every((deviation) => (deviation.drug ?? '') !== '')).toBe(true)
    const manual = deviations.find((deviation) => deviation.kind === 'manualDose')
    expect(manual?.values).toMatchObject({ amount: 600, unit: 'mg' })
  })

  it('writes the hours of a row out as the sheet heads them, not as a count', () => {
    const deviations = collectDeviations(
      items,
      state({ plans: { [RITUXIMAB]: { hours: [15, 9] } } }),
      'uk',
    )

    expect(deviations).toHaveLength(1)
    expect(deviations[0]!.values).toEqual({ hours: '09:00, 15:00' })
    expect(deviationLine(deviations[0]!, translate, 'uk')).toBe(
      'ДЕМО Ритуксимаб: години введення задано лікарем: 09:00, 15:00',
    )
  })

  it('leaves a reduction nobody has typed a number into out of the list', () => {
    expect(kinds(state({ drugPercent: { [RITUXIMAB]: 0 } }))).toEqual([])
    expect(kinds(state({ drugPercent: { [RITUXIMAB]: 25 } }))).toEqual(['reduction'])
  })

  it('lists what moves a row without changing a dose', () => {
    const deviations = collectDeviations(
      items,
      state({
        plans: { [RITUXIMAB]: { days: [1, 2] } },
        sheetChoices: { [RITUXIMAB]: 'ward' },
      }),
      'uk',
    )

    expect(deviations.map((deviation) => deviation.kind)).toEqual(['planDays', 'sheet'])
    expect(deviations.some((deviation) => deviation.changesDose)).toBe(false)
  })

  it('ignores an override left behind by another regimen', () => {
    expect(kinds(state({ drugPercent: { 'other-regimen.rituximab': 50 } }))).toEqual([])
  })

  it('counts the first infusion only when it is not the one this cycle opens with', () => {
    expect(kinds(state({ infusionStart: { rituximab: 1 } }))).toEqual([])
    expect(kinds(state({ infusionStart: { rituximab: 3 } }))).toEqual(['infusionStart'])
  })

  it('takes the BSA source and the clearance weight as deviations of the whole course', () => {
    const deviations = collectDeviations(
      items,
      state({
        courseSettings: { ...initialCourseState().courseSettings, bsaVariant: 'capped' },
        clearanceWeight: 'adjusted',
      }),
      'uk',
    )

    expect(deviations.map((deviation) => deviation.kind)).toEqual(['bsaSource', 'clearanceWeight'])
    expect(deviations.every((deviation) => deviation.itemId === null)).toBe(true)
    expect(deviations.every((deviation) => deviation.changesDose)).toBe(true)
  })
})

describe('revertDeviation', () => {
  it('takes back one deviation and leaves the rest alone', () => {
    const current = state({
      doseOverrideAmount: { [RITUXIMAB]: 600 },
      drugPercent: { [RITUXIMAB]: 25 },
    })
    const manual = collectDeviations(items, current, 'uk').find(
      (deviation) => deviation.kind === 'manualDose',
    )!

    const next = revertDeviation(current, manual)

    expect(next.doseOverrideAmount).toEqual({})
    expect(next.drugPercent).toEqual({ [RITUXIMAB]: 25 })
  })

  it('leaves the row itself when only one part of its plan is taken back', () => {
    const current = state({ plans: { [RITUXIMAB]: { days: [1, 2], perDay: 2 } } })
    const days = collectDeviations(items, current, 'uk').find(
      (deviation) => deviation.kind === 'planDays',
    )!

    expect(revertDeviation(current, days).plans).toEqual({ [RITUXIMAB]: { perDay: 2 } })
  })

  it('drops the plan entry once nothing is left of it', () => {
    const current = state({ plans: { [RITUXIMAB]: { hours: [9] } } })
    const hours = collectDeviations(items, current, 'uk').find(
      (deviation) => deviation.kind === 'planHours',
    )!

    expect(revertDeviation(current, hours).plans).toEqual({})
  })

  it('keeps the patient and the dates when the whole course goes back to the protocol', () => {
    const current = state({
      patientForm: { ...initialCourseState().patientForm, weightKg: '70' },
      doseOverrideAmount: { [RITUXIMAB]: 600 },
      drugPercent: { [RITUXIMAB]: 25 },
      disabledIds: ['r-chop-21.vincristine'],
      sheetChoices: { [RITUXIMAB]: 'ward' },
      clearanceWeight: 'adjusted',
      courseSettings: { ...initialCourseState().courseSettings, bsaVariant: 'entered', bsaM2: 1.9 },
    })

    const next = revertAll(current, collectDeviations(items, current, 'uk'))

    expect(collectDeviations(items, next, 'uk')).toEqual([])
    expect(next.patientForm.weightKg).toBe('70')
    expect(next.courseSettings.startDate).toBe(current.courseSettings.startDate)
    expect(next.courseSettings.bsaVariant).toBe('actual')
    expect(next.courseSettings.bsaM2).toBeNull()
  })
})
