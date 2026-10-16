import { describe, expect, it } from 'vitest'

import { emptyPatientForm, patientFormSchema } from '../../schemas/patient'
import { courseReducer, initialCourseState, type CourseState } from './course-state'
import { NO_INFUSION_THERAPY } from './supportive-rows'

/** A course with something already set in it, to see what an action keeps and what it clears. */
function laidOut(): CourseState {
  return {
    ...initialCourseState(),
    regimenId: 'r.abvd',
    settings: { ...initialCourseState().settings, cycleNumber: 2 },
    disabledIds: ['r.ondansetron'],
    drugPercent: { 'r.doxorubicin': 80 },
    plans: { 'r.ondansetron': { hours: [9] } },
    variants: ['r.ondansetron~2'],
    infusionStart: { rituximab: 2 },
    mesnaFor: ['r.cyclophosphamide'],
    manualRows: [
      { id: 'own', what: 'Контроль ЗАК', how: '', days: [1], hour: null, block: 'ward' },
      {
        id: 'ivig',
        what: 'Дексаметазон 8 мг',
        how: 'в/в',
        days: [1],
        hour: 9,
        block: 'infusion',
        supportFor: 'r.ivig',
      },
    ],
  }
}

describe('courseReducer', () => {
  it('keeps one row setting apart from the next', () => {
    const state = courseReducer(laidOut(), { type: 'reduction', id: 'r.vinblastine', percent: 75 })
    expect(state.drugPercent).toEqual({ 'r.doxorubicin': 80, 'r.vinblastine': 75 })
  })

  it('clears a reduction the physician emptied', () => {
    const state = courseReducer(laidOut(), {
      type: 'reduction',
      id: 'r.doxorubicin',
      percent: null,
    })
    expect(state.drugPercent).toEqual({})
  })

  it('switches a row off and on again without listing it twice', () => {
    const off = courseReducer(laidOut(), { type: 'toggleRow', id: 'r.dacarbazine', enabled: false })
    const twice = courseReducer(off, { type: 'toggleRow', id: 'r.dacarbazine', enabled: false })
    expect(twice.disabledIds).toEqual(['r.ondansetron', 'r.dacarbazine'])
    const on = courseReducer(twice, { type: 'toggleRow', id: 'r.dacarbazine', enabled: true })
    expect(on.disabledIds).toEqual(['r.ondansetron'])
  })

  it('switches a whole kind of support on with the regimen rows that belong to it', () => {
    const state = courseReducer(
      { ...laidOut(), disabledIds: ['r.ondansetron', 'r.metoclopramide'] },
      { type: 'support', category: 'antiemetic', on: true, ids: ['r.ondansetron'] },
    )
    expect(state.support.antiemetic).toBe(true)
    expect(state.disabledIds).toEqual(['r.metoclopramide'])
  })

  it('switches the same kind back off and puts its rows away', () => {
    const state = courseReducer(laidOut(), {
      type: 'support',
      category: 'antiemetic',
      on: false,
      ids: ['r.ondansetron', 'r.aprepitant'],
    })
    expect(state.support.antiemetic).toBe(false)
    expect(state.disabledIds).toEqual(['r.ondansetron', 'r.aprepitant'])
  })

  it('takes the first-infusion ticks back when the cycle number changes', () => {
    const state = courseReducer(laidOut(), {
      type: 'settings',
      settings: { ...laidOut().settings, cycleNumber: 3 },
    })
    expect(state.infusionStart).toEqual({})
    expect(state.settings.cycleNumber).toBe(3)
  })

  it('keeps them when the settings change without the cycle', () => {
    const state = courseReducer(laidOut(), {
      type: 'settings',
      settings: { ...laidOut().settings, startDate: '2026-10-20' },
    })
    expect(state.infusionStart).toEqual({ rituximab: 2 })
  })

  it('leaves the phase note alone unless the action carries one', () => {
    const noted: CourseState = { ...laidOut(), phaseNote: 'Консолідація' }
    const kept = courseReducer(noted, { type: 'settings', settings: noted.settings })
    expect(kept.phaseNote).toBe('Консолідація')
    const cleared = courseReducer(noted, {
      type: 'settings',
      settings: noted.settings,
      phaseNote: null,
    })
    expect(cleared.phaseNote).toBeNull()
  })

  it('moves the cycle into a phase chosen by hand and clears the note', () => {
    const state = courseReducer(
      { ...laidOut(), phaseNote: 'Індукція' },
      {
        type: 'cycle',
        cycleNumber: 5,
      },
    )
    expect(state.settings.cycleNumber).toBe(5)
    expect(state.infusionStart).toEqual({})
    expect(state.phaseNote).toBeNull()
  })

  it('opens another regimen at its defaults and keeps the physician own lines', () => {
    const state = courseReducer(laidOut(), {
      type: 'regimen',
      regimenId: 'r.dhap',
      support: { ...initialCourseState().support, antiviral: true },
      disabledIds: ['r.dexamethasone'],
      ivigRows: [],
    })
    expect(state.regimenId).toBe('r.dhap')
    expect(state.support.antiviral).toBe(true)
    expect(state.disabledIds).toEqual(['r.dexamethasone'])
    expect(state.plans).toEqual({})
    expect(state.variants).toEqual([])
    expect(state.mesnaFor).toEqual([])
    expect(state.infusionTherapy).toBe(NO_INFUSION_THERAPY)
    // The hand-written line stays; the one proposed for the previous regimen goes with it.
    expect(state.manualRows.map((row) => row.id)).toEqual(['own'])
  })

  it('keeps the patient and the measurements across a change of regimen', () => {
    const patient = patientFormSchema.parse({ ...emptyPatientForm(), weightKg: 70, heightCm: 170 })
    const state = courseReducer(
      { ...laidOut(), patient, drugPercent: { 'r.doxorubicin': 50 } },
      {
        type: 'regimen',
        regimenId: null,
        support: initialCourseState().support,
        disabledIds: [],
        ivigRows: [],
      },
    )
    expect(state.patient?.weightKg).toBe(70)
    expect(state.drugPercent).toEqual({ 'r.doxorubicin': 50 })
    expect(state.settings.cycleNumber).toBe(2)
  })

  it('drops a dose picked before the split when the administration changes', () => {
    const state = courseReducer(
      {
        ...laidOut(),
        chosenDoses: { 'r.rituximab': 'd1' },
        doseOverrideAmount: { 'r.rituximab': 700 },
      },
      { type: 'administrationMode', id: 'r.rituximab', mode: { kind: 'short' } },
    )
    expect(state.chosenDoses).toEqual({})
    expect(state.doseOverrideAmount).toEqual({})
    expect(state.administrationModes['r.rituximab']).toEqual({ kind: 'short' })
  })

  it('patches a row plan and clears it whole', () => {
    const patched = courseReducer(laidOut(), {
      type: 'plan',
      id: 'r.ondansetron',
      patch: { perDay: 3 },
    })
    expect(patched.plans['r.ondansetron']).toEqual({ hours: [9], perDay: 3 })
    const cleared = courseReducer(patched, { type: 'plan', id: 'r.ondansetron', patch: null })
    expect(cleared.plans).toEqual({})
  })

  it('numbers each copy of a row after the copies that exist', () => {
    const second = courseReducer(
      { ...laidOut(), variants: [] },
      {
        type: 'variant',
        id: 'r.ondansetron',
      },
    )
    expect(second.variants).toEqual(['r.ondansetron~2'])
    const third = courseReducer(second, { type: 'variant', id: 'r.ondansetron~2' })
    expect(third.variants).toEqual(['r.ondansetron~2', 'r.ondansetron~3'])
  })

  it('removes a copy of a row without touching the drugs added by hand', () => {
    const state = courseReducer(laidOut(), { type: 'removeRow', id: 'r.ondansetron~2' })
    expect(state.variants).toEqual([])
  })

  it('replaces the standard support of one row only', () => {
    const state = courseReducer(laidOut(), {
      type: 'ivigSupport',
      id: 'r.ivig',
      rows: [{ id: 'new', what: 'Супрастин', how: 'в/м', days: [1], hour: 9, block: 'infusion' }],
    })
    expect(state.manualRows.map((row) => row.id)).toEqual(['own', 'new'])
  })

  it('restores a course whole', () => {
    const saved = laidOut()
    expect(courseReducer(initialCourseState(), { type: 'restore', state: saved })).toEqual(saved)
  })
})
