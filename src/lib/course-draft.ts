import type { CourseState } from '../features/calculator/course-state'
import { courseCardSchema, COURSE_CARD_VERSION, type CourseCard } from '../schemas/course-draft'
import { emptyPatientForm } from '../schemas/patient'

/**
 * A course in progress, kept on this device so it is not lost: leaving the calculator for the
 * disease pages unmounts it, and accepting an update of the app reloads the tab — a sheet laid
 * out over four days used to disappear with either.
 *
 * What is written to storage is the physician's own choice where the patient is named: the name
 * and the record number go into the draft only with consent, and nothing ever leaves the browser
 * — no draft is sent to Supabase and none is cached by the service worker.
 *
 * The same shape, written to a file, is the «course card»: it carries a course to another device
 * or into the next cycle. That file is saved by hand, so it holds the course as it stands.
 */

const DRAFT_KEY = 'hp.courseDraft'
const CONSENT_KEY = 'hp.courseDraft.personal'

/** Fields that name the patient; kept in the draft only with consent. */
export const PERSONAL_FIELDS = ['fullName', 'recordNumber', 'birthDate'] as const

/** Whether the physician allowed the patient's name and record number into the draft. */
export function personalInDraft(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === '1'
  } catch {
    return false
  }
}

/** Remembers the choice; withdrawing it takes the names out of the draft already written. */
export function setPersonalInDraft(allowed: boolean): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, allowed ? '1' : '0')
  } catch {
    // The choice still holds for this session.
  }
}

/** The course with the patient unnamed: the measurements stay, the identity does not. */
export function withoutPersonal(state: CourseState): CourseState {
  const empty = emptyPatientForm()
  const patientForm = { ...state.patientForm }
  for (const field of PERSONAL_FIELDS) patientForm[field] = empty[field]
  return { ...state, patientForm }
}

/** The course written out as a card, ready to be stored or saved to a file. */
export function courseCard(regimenId: string | null, state: CourseState): CourseCard {
  return {
    app: 'hematologist-plus',
    kind: 'course-card',
    version: COURSE_CARD_VERSION,
    savedAt: new Date().toISOString(),
    regimenId,
    state,
  }
}

/** Nothing set yet: no regimen, no measurement, no line written out. */
function isBlank(regimenId: string | null, state: CourseState): boolean {
  if (regimenId !== null) return false
  const untouchedPatient = JSON.stringify(state.patientForm) === JSON.stringify(emptyPatientForm())
  return (
    untouchedPatient &&
    state.customItems.length === 0 &&
    state.manualRows.length === 0 &&
    state.disabledIds.length === 0 &&
    Object.keys(state.plans).length === 0
  )
}

/**
 * Keeps the course for the next visit. A course nobody has started is not kept — otherwise an
 * empty draft would silently overwrite the one from the morning.
 */
export function saveDraft(regimenId: string | null, state: CourseState, personal: boolean): void {
  if (isBlank(regimenId, state)) {
    clearDraft()
    return
  }
  const card = courseCard(regimenId, personal ? state : withoutPersonal(state))
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(card))
  } catch {
    // Storage full or blocked: the course still holds for this visit.
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Nothing to do: there is no draft to speak of either way.
  }
}

/**
 * How long a kept course is still the one the physician left: a draft older than this is a
 * course from another patient's week, and a patient's data has no business lingering past it.
 */
export const DRAFT_MAX_AGE_DAYS = 7

/** The course kept on this device, or null when there is none this version can read. */
export function loadDraft(now = new Date()): CourseCard | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    const card = raw === null ? null : parseCourseCard(raw)
    if (card === null) return null
    const age = now.getTime() - new Date(card.savedAt).getTime()
    if (Number.isNaN(age) || age > DRAFT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000) {
      clearDraft()
      return null
    }
    return card
  } catch {
    return null
  }
}

/**
 * A course card read back from text: a file the physician picked, or the draft in storage.
 * Anything that is not a card of this version — another file, a half-written one, a draft from a
 * version whose courses had other fields — is null, and the calculator simply starts fresh.
 */
export function parseCourseCard(text: string): CourseCard | null {
  try {
    const parsed = courseCardSchema.safeParse(JSON.parse(text))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export const COURSE_CARD_MEDIA_TYPE = 'application/json'
