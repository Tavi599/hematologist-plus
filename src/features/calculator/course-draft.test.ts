import { beforeEach, describe, expect, it } from 'vitest'

import { emptyPatientForm, patientFormSchema } from '../../schemas/patient'
import {
  clearCourseDraft,
  courseCardFile,
  loadCourseDraft,
  readCourseCard,
  rememberName,
  saveCourseDraft,
  setRememberName,
} from './course-draft'
import { initialCourseState, type CourseState } from './course-state'

const DRAFT_KEY = 'hp.courseDraft'

function course(): CourseState {
  return {
    ...initialCourseState(),
    patient: patientFormSchema.parse({
      ...emptyPatientForm(),
      fullName: 'Шевченко Тарас Григорович',
      recordNumber: 'A-77219',
      birthDate: '1960-03-09',
      sex: 'male',
      heightCm: 178,
      weightKg: 82,
      serumCreatinine: 95,
    }),
    regimenId: 'r.abvd',
    disabledIds: ['r.ondansetron'],
    drugPercent: { 'r.doxorubicin': 80 },
    plans: { 'r.ondansetron': { hours: [9], perDay: 3, wardMode: 'hours' } },
    manualRows: [
      { id: 'own', what: 'Контроль ЗАК', how: '', days: [1, 8], hour: null, block: 'ward' },
    ],
    administrationModes: { 'r.cytarabine': { kind: 'bolus', count: 2, intervalMin: 720 } },
    sheetChoices: { 'r.ondansetron': 'ward' },
    renalBandLevel: { 'r.lenalidomide': 'mid' },
    chosenRoutes: { 'r.ondansetron': 'oral' },
    header: {
      hospitalId: 'h.okl',
      institution: 'КНП «Обласна клінічна лікарня»',
      department: 'ОГНТ-1',
      address: 'м. Полтава',
      registryCode: '01234567',
    },
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('the draft in this browser', () => {
  it('restores the course whole, down to the hours of a row', () => {
    setRememberName(true)
    saveCourseDraft(course())
    const back = loadCourseDraft()
    expect(back).not.toBeNull()
    expect(back?.regimenId).toBe('r.abvd')
    expect(back?.plans['r.ondansetron']).toEqual({ hours: [9], perDay: 3, wardMode: 'hours' })
    expect(back?.administrationModes['r.cytarabine']).toEqual({
      kind: 'bolus',
      count: 2,
      intervalMin: 720,
    })
    expect(back?.manualRows[0]?.what).toBe('Контроль ЗАК')
    expect(back?.header.department).toBe('ОГНТ-1')
    expect(back?.patient?.weightKg).toBe(82)
  })

  it('leaves who the patient is out of storage unless the physician asked for it', () => {
    saveCourseDraft(course())
    const raw = window.localStorage.getItem(DRAFT_KEY) ?? ''
    expect(raw).not.toContain('Шевченко')
    expect(raw).not.toContain('A-77219')
    expect(raw).not.toContain('1960-03-09')
    // The measurements and the sheet are still there: that is what the draft is for.
    expect(raw).toContain('82')
    const back = loadCourseDraft()
    expect(back?.patient?.fullName).toBe('')
    expect(back?.patient?.recordNumber).toBe('')
    expect(back?.patient?.birthDate).toBe('')
    expect(back?.patient?.weightKg).toBe(82)
    expect(back?.disabledIds).toEqual(['r.ondansetron'])
  })

  it('keeps the name once the switch is on, and takes it out again when it goes off', () => {
    setRememberName(true)
    expect(rememberName()).toBe(true)
    saveCourseDraft(course())
    expect(loadCourseDraft()?.patient?.fullName).toBe('Шевченко Тарас Григорович')

    setRememberName(false)
    saveCourseDraft(course())
    expect(window.localStorage.getItem(DRAFT_KEY)).not.toContain('Шевченко')
    expect(loadCourseDraft()?.patient?.fullName).toBe('')
  })

  it('has nothing to restore before anything is saved, or after it is cleared', () => {
    expect(loadCourseDraft()).toBeNull()
    saveCourseDraft(course())
    clearCourseDraft()
    expect(loadCourseDraft()).toBeNull()
  })

  it('drops a draft whose shape no longer fits instead of half-restoring it', () => {
    window.localStorage.setItem(DRAFT_KEY, 'not json at all')
    expect(loadCourseDraft()).toBeNull()

    const card = JSON.parse(new TextDecoder().decode(courseCardFile(course()).bytes))
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...card, version: 99 }))
    expect(loadCourseDraft()).toBeNull()

    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ ...card, course: { ...card.course, settings: { cycleNumber: 'first' } } }),
    )
    expect(loadCourseDraft()).toBeNull()

    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...card, kind: 'something.else' }))
    expect(loadCourseDraft()).toBeNull()
  })

  it('does not keep what was only true of the moment', () => {
    setRememberName(true)
    saveCourseDraft({ ...course(), phaseNote: 'Консолідація' })
    expect(loadCourseDraft()?.phaseNote).toBeNull()
  })
})

describe('the course card as a file', () => {
  it('is named after the start of the course and reads back whole', () => {
    const file = courseCardFile(course())
    expect(file.name).toBe(`course-${course().settings.startDate}.json`)
    const back = readCourseCard(new TextDecoder().decode(file.bytes))
    expect(back?.drugPercent).toEqual({ 'r.doxorubicin': 80 })
    expect(back?.sheetChoices).toEqual({ 'r.ondansetron': 'ward' })
    expect(back?.renalBandLevel).toEqual({ 'r.lenalidomide': 'mid' })
  })

  it('carries the name, the file being the physician own', () => {
    setRememberName(false)
    const back = readCourseCard(new TextDecoder().decode(courseCardFile(course()).bytes))
    expect(back?.patient?.fullName).toBe('Шевченко Тарас Григорович')
    expect(back?.patient?.recordNumber).toBe('A-77219')
  })

  it('refuses a file that is not a course card', () => {
    expect(readCourseCard('{}')).toBeNull()
    expect(readCourseCard('[1,2,3]')).toBeNull()
    expect(readCourseCard('<html></html>')).toBeNull()
  })
})
