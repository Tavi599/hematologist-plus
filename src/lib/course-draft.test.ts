import { beforeEach, describe, expect, it } from 'vitest'

import { initialCourseState, type CourseState } from '../features/calculator/course-state'
import { COURSE_CARD_VERSION } from '../schemas/course-draft'
import {
  clearDraft,
  courseCard,
  DRAFT_MAX_AGE_DAYS,
  loadDraft,
  parseCourseCard,
  personalInDraft,
  saveDraft,
  setPersonalInDraft,
  withoutPersonal,
} from './course-draft'

/** A course as the physician left it: a named patient, a reduction and an hour set by hand. */
function laidOut(): CourseState {
  const state = initialCourseState()
  return {
    ...state,
    patientForm: {
      ...state.patientForm,
      fullName: 'Петренко Іван Іванович',
      recordNumber: '12345',
      birthDate: '1960-03-04',
      ageYears: 66,
      sex: 'male',
      heightCm: 180,
      weightKg: 80,
    },
    courseSettings: { ...state.courseSettings, startDate: '2026-10-20', cycleNumber: 2 },
    drugPercent: { 'r-chop-21.vincristine': 75 },
    plans: { 'r-chop-21.rituximab': { hours: [11] } },
    manualRows: [
      {
        id: 'm1',
        what: 'NaCl 0,9% 1000 мл',
        how: 'в/в крап.',
        days: [1],
        hour: 9,
        block: 'infusion',
      },
    ],
  }
}

describe('course draft', () => {
  beforeEach(() => {
    window.localStorage.clear()
    setPersonalInDraft(false)
  })

  it('brings the whole course back as it was left', () => {
    setPersonalInDraft(true)
    const state = laidOut()
    saveDraft('r-chop-21', state, true)

    const card = loadDraft()
    expect(card?.regimenId).toBe('r-chop-21')
    expect(card?.version).toBe(COURSE_CARD_VERSION)
    expect(card?.state).toEqual(state)
  })

  it('keeps no name on the device until the physician allows it', () => {
    const state = laidOut()
    saveDraft('r-chop-21', state, false)

    const raw = window.localStorage.getItem('hp.courseDraft') ?? ''
    expect(raw).not.toContain('Петренко')
    expect(raw).not.toContain('12345')
    expect(raw).not.toContain('1960-03-04')
    // What the doses are calculated from stays: the course comes back ready to be printed.
    const restored = loadDraft()!.state
    expect(restored.patientForm.fullName).toBe('')
    expect(restored.patientForm.recordNumber).toBe('')
    expect(restored.patientForm.birthDate).toBe('')
    expect(restored.patientForm.weightKg).toBe(80)
    expect(restored.patientForm.sex).toBe('male')
    expect(restored.drugPercent).toEqual({ 'r-chop-21.vincristine': 75 })
  })

  it('remembers the consent itself', () => {
    expect(personalInDraft()).toBe(false)
    setPersonalInDraft(true)
    expect(personalInDraft()).toBe(true)
  })

  it('keeps nothing for a course nobody has started', () => {
    saveDraft(null, initialCourseState(), true)
    expect(window.localStorage.getItem('hp.courseDraft')).toBeNull()
    expect(loadDraft()).toBeNull()
  })

  it('forgets a course older than a week', () => {
    saveDraft('r-chop-21', laidOut(), true)
    const later = new Date(Date.now() + (DRAFT_MAX_AGE_DAYS + 1) * 24 * 60 * 60 * 1000)
    expect(loadDraft(later)).toBeNull()
    // And it is gone from the device, not merely ignored.
    expect(window.localStorage.getItem('hp.courseDraft')).toBeNull()
  })

  it('reads a course card back from a file, and nothing else', () => {
    const card = courseCard('r-chop-21', laidOut())
    expect(parseCourseCard(JSON.stringify(card))?.state).toEqual(card.state)

    expect(parseCourseCard('not json at all')).toBeNull()
    expect(parseCourseCard(JSON.stringify({ app: 'something-else' }))).toBeNull()
    // A card of another version is dropped whole: half a course is worse than none.
    expect(
      parseCourseCard(JSON.stringify({ ...card, version: COURSE_CARD_VERSION + 1 })),
    ).toBeNull()
    // So is one whose course is damaged.
    const damaged = { ...card, state: { ...card.state, disabledIds: 'all' } }
    expect(parseCourseCard(JSON.stringify(damaged))).toBeNull()
  })

  it('leaves the measurements alone when it takes the identity out', () => {
    const stripped = withoutPersonal(laidOut())
    expect(stripped.patientForm.fullName).toBe('')
    expect(stripped.patientForm.ageYears).toBe(66)
    expect(stripped.manualRows).toHaveLength(1)
  })

  it('lets the course go when it is cleared', () => {
    saveDraft('r-chop-21', laidOut(), true)
    clearDraft()
    expect(loadDraft()).toBeNull()
  })

  it('works on in a browser whose storage refuses', () => {
    const storage = window.localStorage
    const refusing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    Object.defineProperty(window, 'localStorage', { value: refusing, configurable: true })
    try {
      expect(() => saveDraft('r-chop-21', laidOut(), true)).not.toThrow()
      expect(loadDraft()).toBeNull()
      expect(personalInDraft()).toBe(false)
      expect(() => setPersonalInDraft(true)).not.toThrow()
    } finally {
      Object.defineProperty(window, 'localStorage', { value: storage, configurable: true })
    }
  })
})
