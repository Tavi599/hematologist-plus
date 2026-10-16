import { z } from 'zod'

import type { CourseState } from '../features/calculator/course-state'
import { STANDARD_INFUSION_RATE_ML_H } from '../features/calculator/supportive-rows'
import { SUPPORT_CATEGORIES } from '../lib/standard-support'
import { regimenItemRowSchema } from './catalog'
import { CREATININE_UNITS, type PatientFormValues } from './patient'
import { routeSchema } from './common'

/**
 * The course as it is written down: into this device's storage as a draft, and into a file as a
 * «course card» the physician carries to another device or back to the next cycle.
 *
 * Everything read back in is validated here before it reaches the calculator. A draft of another
 * version, or a file that is not a course card, is dropped whole rather than half-applied: half
 * a course would put a number in front of a physician that nobody set.
 */

/** Bumped whenever the shape of a course changes in a way an older draft cannot be read as. */
export const COURSE_CARD_VERSION = 1

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/** A number input holds a number, or the empty string while it is not filled in. */
const formNumber = z.union([z.literal(''), z.null(), z.number(), z.string()])

/** The patient form as it is typed; the measurements themselves are checked when they are used. */
const patientFormValuesSchema: z.ZodType<PatientFormValues> = z.object({
  fullName: z.string(),
  recordNumber: z.string(),
  birthDate: z.string(),
  ageYears: formNumber,
  sex: z.enum(['male', 'female']).nullable(),
  heightCm: formNumber,
  weightKg: formNumber,
  serumCreatinine: formNumber,
  creatinineUnit: z.enum(CREATININE_UNITS),
  bilirubinUmolL: formNumber,
})

const rowPlanSchema = z.object({
  hours: z.array(z.number().int().min(0).max(23)).optional(),
  perDay: z.number().int().positive().optional(),
  wardMode: z.enum(['count', 'hours']).optional(),
  days: z.array(z.number().int().nonnegative()).optional(),
})

const manualRowSchema = z.object({
  id: z.string(),
  what: z.string(),
  how: z.string(),
  days: z.array(z.number().int().nonnegative()),
  hour: z.number().int().min(0).max(23).nullable(),
  block: z.enum(['infusion', 'ward']),
  before: z.boolean().optional(),
  supportFor: z.string().optional(),
})

const solutionPlanSchema = z.object({
  on: z.boolean(),
  volumeMl: z.number().positive(),
  kcl: z.enum(['4', '7.5', 'none']),
  mgso4: z.boolean(),
})

const infusionTherapySchema = z.object({
  on: z.boolean(),
  nacl: solutionPlanSchema,
  glucose: solutionPlanSchema,
  days: z.array(z.number().int().nonnegative()).nullable(),
  hour: z.number().int().min(0).max(23).nullable(),
  // A course kept before the rate was set here runs at the department's standard one.
  rateMlH: z.number().positive().max(2000).nullable().default(STANDARD_INFUSION_RATE_ML_H),
})

const administrationModeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('protocol') }),
  z.object({
    kind: z.literal('bolus'),
    count: z.number().int().positive(),
    intervalMin: z.number().int().positive(),
  }),
  z.object({ kind: z.literal('short') }),
  z.object({ kind: z.literal('continuous') }),
])

const headerSchema = z.object({
  hospitalId: z.string().nullable(),
  institution: z.string(),
  department: z.string(),
  address: z.string(),
  registryCode: z.string(),
})

/** Keeps the schema and `CourseState` the same shape: a missing field fails to typecheck. */
export const courseStateSchema: z.ZodType<CourseState> = z.object({
  patientForm: patientFormValuesSchema,
  courseSettings: z.object({
    startDate: z.string().regex(DATE_PATTERN),
    dayStart: z.string().regex(TIME_PATTERN),
    bsaVariant: z.enum(['actual', 'capped', 'entered']),
    bsaM2: z.number().positive().nullable(),
    cycleNumber: z.number().int().positive(),
  }),
  customItems: z.array(regimenItemRowSchema),
  disabledIds: z.array(z.string()),
  drugPercent: z.record(z.string(), z.number()),
  doseOverrideAmount: z.record(z.string(), z.number()),
  plans: z.record(z.string(), rowPlanSchema),
  variants: z.array(z.string()),
  infusionTherapy: infusionTherapySchema,
  chosenDoses: z.record(z.string(), z.string()),
  chosenModifiers: z.record(z.string(), z.array(z.string())),
  administrationModes: z.record(z.string(), administrationModeSchema),
  infusionStart: z.record(z.string(), z.number().int().positive()),
  header: headerSchema,
  manualRows: z.array(manualRowSchema),
  support: z.record(z.enum(SUPPORT_CATEGORIES), z.boolean()),
  thromboAgent: z.enum(['apixaban', 'enoxaparin', 'aspirin']),
  antiviralAgent: z.enum(['aciclovir', 'valaciclovir']),
  gastroAgent: z.enum(['tablet', 'iv_daily', 'iv_steroid']),
  mesnaFor: z.array(z.string()),
  chosenRoutes: z.record(z.string(), routeSchema),
  sheetChoices: z.record(z.string(), z.enum(['infusion', 'ward'])),
  chosenBags: z.record(z.string(), z.number().positive()),
  chosenDurations: z.record(z.string(), z.number().int().positive()),
  renalBandOffIds: z.array(z.string()),
  renalBandEveryOtherDayIds: z.array(z.string()),
  renalBandLevel: z.record(z.string(), z.enum(['low', 'mid', 'high'])),
  clearanceWeight: z.enum(['actual', 'adjusted']),
})

/**
 * A whole course, as the draft in this browser and the file on disk both hold it. `app` and
 * `kind` are there so a file picked by mistake is told apart from a course card at once.
 */
export const courseCardSchema = z.object({
  app: z.literal('hematologist-plus'),
  kind: z.literal('course-card'),
  version: z.literal(COURSE_CARD_VERSION),
  /** When it was written, ISO; shown to the physician, never used for a calculation. */
  savedAt: z.string(),
  /** The regimen the course was calculated on; null for a sheet written out by hand. */
  regimenId: z.string().nullable(),
  state: courseStateSchema,
})

export type CourseCard = z.infer<typeof courseCardSchema>
