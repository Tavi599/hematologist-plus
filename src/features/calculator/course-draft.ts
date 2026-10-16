import { z } from 'zod'

import { regimenItemRowSchema } from '../../schemas/catalog'
import { routeSchema } from '../../schemas/common'
import { patientFormSchema } from '../../schemas/patient'
import { SUPPORT_CATEGORIES } from '../../lib/standard-support'
import type { CourseState } from './course-state'
import { KCL_STRENGTHS } from './supportive-rows'

/**
 * A course the physician has laid out, kept so it is not lost: a draft in this browser between
 * one visit and the next (a tab closed, a reload, an accepted PWA update), and a file that
 * carries the same course to another computer or back to it for the next cycle.
 *
 * Nothing here leaves the browser. The draft is written to `localStorage` only — never sent
 * anywhere, never cached by the service worker — and the identifying fields (name, record
 * number, date of birth) are left out of it unless the physician switches «remember the name»
 * on. The exported file is the physician's own: they chose where it goes, so it carries
 * everything, the name included.
 *
 * A draft read back is validated: a course saved by an older version of the app whose shape no
 * longer fits is dropped without a word rather than half-restored.
 */

const DRAFT_KEY = 'hp.courseDraft'
const CONSENT_KEY = 'hp.rememberName'
/** Bumped only when a change cannot be expressed by the schema; an unreadable draft is dropped. */
const DRAFT_VERSION = 1

const headerSchema = z.object({
  hospitalId: z.string().nullable(),
  institution: z.string(),
  department: z.string(),
  address: z.string(),
  registryCode: z.string(),
})

const manualRowSchema = z.object({
  id: z.string(),
  what: z.string(),
  how: z.string(),
  days: z.array(z.number().int()),
  hour: z.number().int().min(0).max(23).nullable(),
  block: z.enum(['infusion', 'ward']),
  before: z.boolean().optional(),
  supportFor: z.string().optional(),
})

const rowPlanSchema = z.object({
  hours: z.array(z.number().int().min(0).max(23)).optional(),
  perDay: z.number().int().positive().optional(),
  wardMode: z.enum(['count', 'hours']).optional(),
  days: z.array(z.number().int()).optional(),
})

const solutionPlanSchema = z.object({
  on: z.boolean(),
  volumeMl: z.number().positive(),
  kcl: z.enum([...KCL_STRENGTHS, 'none']),
  mgso4: z.boolean(),
})

const infusionTherapySchema = z.object({
  on: z.boolean(),
  nacl: solutionPlanSchema,
  glucose: solutionPlanSchema,
  days: z.array(z.number().int()).nullable(),
  hour: z.number().int().min(0).max(23).nullable(),
})

const administrationModeSchema = z.union([
  z.object({ kind: z.literal('protocol') }),
  z.object({
    kind: z.literal('bolus'),
    count: z.number().int().positive(),
    intervalMin: z.number().nonnegative(),
  }),
  z.object({ kind: z.literal('short') }),
  z.object({ kind: z.literal('continuous') }),
])

const supportSchema = z.object(
  Object.fromEntries(SUPPORT_CATEGORIES.map((category) => [category, z.boolean()])) as Record<
    (typeof SUPPORT_CATEGORIES)[number],
    z.ZodBoolean
  >,
)

const numberMap = z.record(z.string(), z.number())

/** The whole course state, as it is written to storage and to an exported file. */
export const courseStateSchema = z.object({
  patient: patientFormSchema.nullable(),
  settings: z.object({
    startDate: z.string(),
    dayStart: z.string(),
    bsaVariant: z.enum(['actual', 'capped', 'entered']),
    bsaM2: z.number().positive().nullable(),
    cycleNumber: z.number().int().positive(),
  }),
  regimenId: z.string().nullable(),
  customItems: z.array(regimenItemRowSchema),
  disabledIds: z.array(z.string()),
  drugPercent: numberMap,
  doseOverrideAmount: numberMap,
  plans: z.record(z.string(), rowPlanSchema),
  variants: z.array(z.string()),
  infusionTherapy: infusionTherapySchema,
  chosenDoses: z.record(z.string(), z.string()),
  chosenModifiers: z.record(z.string(), z.array(z.string())),
  administrationModes: z.record(z.string(), administrationModeSchema),
  infusionStart: numberMap,
  header: headerSchema,
  manualRows: z.array(manualRowSchema),
  support: supportSchema,
  thromboAgent: z.enum(['apixaban', 'enoxaparin', 'aspirin']),
  antiviralAgent: z.enum(['aciclovir', 'valaciclovir']),
  gastroAgent: z.enum(['tablet', 'iv_daily', 'iv_steroid']),
  mesnaFor: z.array(z.string()),
  chosenRoutes: z.record(z.string(), routeSchema),
  sheetChoices: z.record(z.string(), z.enum(['infusion', 'ward'])),
  chosenBags: numberMap,
  chosenDurations: numberMap,
  renalBandOffIds: z.array(z.string()),
  renalBandEveryOtherDayIds: z.array(z.string()),
  renalBandLevel: z.record(z.string(), z.enum(['low', 'mid', 'high'])),
  clearanceWeight: z.enum(['actual', 'adjusted']),
})

/** What a saved course file holds; the marker and the version are what an import checks first. */
export const courseCardSchema = z.object({
  kind: z.literal('hematologist-plus.course'),
  version: z.literal(DRAFT_VERSION),
  /** When the card was written, so a physician can tell two cycles apart. */
  savedAt: z.string(),
  course: courseStateSchema,
})

export type CourseCard = z.infer<typeof courseCardSchema>

/** The identifying fields, which a draft carries only by the physician's own choice. */
function withoutIdentity(state: CourseState): CourseState {
  if (state.patient === null) return state
  return {
    ...state,
    patient: { ...state.patient, fullName: '', recordNumber: '', birthDate: '' },
  }
}

/** The course as the file and the storage hold it: no `undefined`, and nothing calculated. */
function stored(state: CourseState): z.input<typeof courseStateSchema> {
  const { phaseNote: _note, regimenId, ...rest } = state
  return { ...rest, regimenId: regimenId ?? null }
}

/** A validated course back as state; the phase note belongs to the moment, not to the course. */
function restored(course: z.output<typeof courseStateSchema>): CourseState {
  return { ...course, phaseNote: null }
}

export function rememberName(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === '1'
  } catch {
    return false
  }
}

export function setRememberName(on: boolean): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, on ? '1' : '0')
  } catch {
    // The choice still holds for this session; a draft written without storage is no draft.
  }
}

/**
 * Keeps the draft in step with the course on screen. Switching the consent off takes the name
 * out of the draft already written, so a mind changed is a name gone.
 */
export function saveCourseDraft(state: CourseState, keepName = rememberName()): void {
  try {
    const card: CourseCard = {
      kind: 'hematologist-plus.course',
      version: DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      course: courseStateSchema.parse(stored(keepName ? state : withoutIdentity(state))),
    }
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(card))
  } catch {
    // Storage may be missing or refuse (private window, blocked site data); the course on
    // screen is untouched, it simply will not survive a reload.
  }
}

export function clearCourseDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // Nothing to clear if storage cannot be reached.
  }
}

/** The draft of the last course, or null when there is none and when it no longer fits. */
export function loadCourseDraft(): CourseState | null {
  let raw: string | null = null
  try {
    raw = window.localStorage.getItem(DRAFT_KEY)
  } catch {
    return null
  }
  if (raw === null) return null
  return readCourseCard(raw)
}

/** A course card as text — a draft or an imported file; null when it is not one we can read. */
export function readCourseCard(text: string): CourseState | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  const card = courseCardSchema.safeParse(parsed)
  if (!card.success) return null
  // A card written by an older app may name a regimen this one no longer has; the calculator
  // notices that itself and opens the course without a regimen.
  return restored(card.data.course)
}

/** The bytes of a course card, for the download; the name is the physician's own file. */
export function courseCardFile(state: CourseState): { name: string; bytes: Uint8Array } {
  const card: CourseCard = {
    kind: 'hematologist-plus.course',
    version: DRAFT_VERSION,
    savedAt: new Date().toISOString(),
    course: courseStateSchema.parse(stored(state)),
  }
  const name = `course-${state.settings.startDate}.json`
  return { name, bytes: new TextEncoder().encode(JSON.stringify(card, null, 2)) }
}
