import { emptyHeader } from '../features/calculator/header'
import { freeSheetDraftSchema, type FreeSheetState } from '../schemas/free-sheet'
import { todayIso } from '../schemas/patient'
import { DRAFT_MAX_AGE_DAYS } from './course-draft'

/**
 * The free sheet kept on this device, by the same rules as the calculator's draft: nothing leaves
 * the browser, the patient's name is written only with the physician's consent (the same switch
 * as the calculator's), and a sheet older than a week is dropped.
 */

const DRAFT_KEY = 'hp.freeSheetDraft'

/** A sheet nobody has started: today's date, the ward's working day, no lines. */
export function initialFreeSheet(): FreeSheetState {
  return {
    fullName: '',
    recordNumber: '',
    startDate: todayIso(),
    dayStart: '11:00',
    header: emptyHeader(),
    rows: [],
  }
}

/** Nothing written yet: an empty sheet is not kept, so it never overwrites the morning's one. */
function isBlank(state: FreeSheetState): boolean {
  return state.rows.length === 0 && state.fullName.trim() === '' && state.recordNumber.trim() === ''
}

/** Keeps the sheet for the next visit; false when the browser refused to keep it. */
export function saveFreeSheet(state: FreeSheetState, personal: boolean): boolean {
  try {
    if (isBlank(state)) {
      window.localStorage.removeItem(DRAFT_KEY)
      return true
    }
    const kept = personal ? state : { ...state, fullName: '', recordNumber: '' }
    window.localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        app: 'hematologist-plus',
        kind: 'free-sheet',
        version: 1,
        savedAt: new Date().toISOString(),
        state: kept,
      }),
    )
    return true
  } catch {
    return false
  }
}

/** The sheet kept on this device, or null when there is none this version can read. */
export function loadFreeSheet(now = new Date()): FreeSheetState | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (raw === null) return null
    const parsed = freeSheetDraftSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    const age = now.getTime() - new Date(parsed.data.savedAt).getTime()
    if (Number.isNaN(age) || age > DRAFT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000) {
      window.localStorage.removeItem(DRAFT_KEY)
      return null
    }
    return parsed.data.state
  } catch {
    return null
  }
}
