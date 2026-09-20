import { z } from 'zod'

/** Stable text identifier used as primary key in every catalog table. */
export const ID_PATTERN = /^[a-z0-9][a-z0-9_.-]*$/
export const idSchema = z.string().regex(ID_PATTERN, 'lowercase letters, digits, "_", "." or "-"')

/** Local key inside a data file; combined with the parent id into a full id. */
export const KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/
export const keySchema = z.string().regex(KEY_PATTERN, 'lowercase letters, digits, "_" or "-"')

export const nonEmptyTextSchema = z.string().trim().min(1)
export const positiveNumberSchema = z.number().positive()
export const nonNegativeIntSchema = z.number().int().nonnegative()
export const sortOrderSchema = z.number().int()

/**
 * Localized text as stored in jsonb: {"uk": "...", "en": "..."}.
 * Either language may be missing, but at least one must contain text.
 * Keep keys in sync with SUPPORTED_LANGUAGES (checked by a type test).
 */
export const localizedTextSchema = z
  .strictObject({
    uk: z.string().nullable().optional(),
    en: z.string().nullable().optional(),
  })
  .refine(
    (value) => Object.values(value).some((text) => typeof text === 'string' && text.trim() !== ''),
    { message: 'at least one language must contain text' },
  )

export const SOLVENTS = ['sodium_chloride_0_9', 'glucose_5', 'water_for_injection'] as const
export const solventSchema = z.enum(SOLVENTS)

export const PRESENTATION_FORMS = [
  'vial',
  'ampoule',
  'tablet',
  'capsule',
  'syringe',
  'other',
] as const
export const presentationFormSchema = z.enum(PRESENTATION_FORMS)

export const ROUTES = [
  'iv_infusion',
  'iv_bolus',
  'subcutaneous',
  'intramuscular',
  'oral',
  'intrathecal',
] as const
export const routeSchema = z.enum(ROUTES)

export const ITEM_ROLES = ['main', 'premedication', 'supportive'] as const
export const itemRoleSchema = z.enum(ITEM_ROLES)

/**
 * The unit a drug is measured in. Milligrams for most, but bleomycin and interferon are dosed
 * in international units and filgrastim in micrograms. Mass (mg, mcg) and biological activity
 * (iu, miu) are never converted into each other: the factor is drug-specific, not arithmetic.
 */
export const AMOUNT_UNITS = ['mg', 'mcg', 'iu', 'miu'] as const
export const amountUnitSchema = z.enum(AMOUNT_UNITS)

/**
 * How a regimen expresses a dose: the amount unit plus the basis (per m², per kg, flat).
 * `auc` is the Calvert formula, which is defined in milligrams only.
 */
export const DOSE_UNITS = [
  'mg_m2',
  'mg_kg',
  'mg_flat',
  'mcg_m2',
  'mcg_kg',
  'mcg_flat',
  'iu_m2',
  'iu_kg',
  'iu_flat',
  'miu_m2',
  'miu_kg',
  'miu_flat',
  'auc',
] as const
export const doseUnitSchema = z.enum(DOSE_UNITS)

/**
 * How the drug can actually be obtained. A regimen is never left out of the catalog because one
 * of its drugs is missing — the drug is marked instead, and regimens can be filtered by this.
 *   department  — in the department's own procurement list
 *   registered  — registered in Ukraine, obtainable, but not on the department's list
 *   unavailable — not registered in Ukraine or otherwise not obtainable
 */
export const DRUG_AVAILABILITY = ['department', 'registered', 'unavailable'] as const
export const drugAvailabilitySchema = z.enum(DRUG_AVAILABILITY)

export const TREATMENT_NODE_KINDS = ['treatment', 'line', 'stage', 'group'] as const
export const treatmentNodeKindSchema = z.enum(TREATMENT_NODE_KINDS)

/**
 * Where a clinical value comes from. Every dose, cap and dilution parameter that is not
 * the hospital’s own must name its protocol and the date it was checked.
 */
export const sourceSchema = z.strictObject({
  name: nonEmptyTextSchema,
  url: z.url().optional(),
  /** Document version or revision date as printed in the source. */
  version: z.string().optional(),
  checkedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
})

export const sourcesSchema = z.array(sourceSchema)

export type Source = z.infer<typeof sourceSchema>

/**
 * The same dose as another protocol writes it. A regimen item keeps its own dose as the default
 * and lists the alternatives here, so the physician chooses the protocol instead of retyping mg.
 */
export const doseOptionSchema = z.strictObject({
  dose_value: positiveNumberSchema,
  dose_unit: doseUnitSchema,
  cap_amount: positiveNumberSchema.nullable().default(null),
  notes: localizedTextSchema.nullable().default(null),
  /** Where this dose comes from; `name` is what the physician picks in the list. */
  source: sourceSchema,
})

export const doseOptionsSchema = z.array(doseOptionSchema)

/**
 * Where a physician reads more about a disease. The app only links out: guideline text is
 * copyrighted and is never copied into the catalog.
 */
export const REFERENCE_KINDS = ['nccn', 'uptodate', 'eviq', 'nssg', 'other'] as const
export const referenceKindSchema = z.enum(REFERENCE_KINDS)

export const diseaseReferenceSchema = z.strictObject({
  kind: referenceKindSchema,
  url: z.url(),
  /** Shown instead of the name of the source, for a link that needs saying what it is. */
  label: localizedTextSchema.nullable().default(null),
  /** Edition the article was written against, as the source itself numbers it, e.g. '2.2026'. */
  version: z.string().nullable().default(null),
  /** The day that edition was issued — what the reader checks before trusting the article. */
  updated: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
    .nullable()
    .default(null),
})

export const diseaseReferencesSchema = z.array(diseaseReferenceSchema)

/**
 * Where a row of the course is timed and printed.
 *   infusion    — the hourly chain of the infusion sheet; shifting one row moves the rest
 *   day_support — the infusion sheet, timed from the day's first chained drug (ondansetron
 *                 30 min before the cytostatic and then every 8 hours)
 *   ward        — the inpatient sheet: a count per day, never placed in the hourly grid,
 *                 so tablets keep their time when an infusion is shifted
 */
export const SCHEDULE_BLOCKS = ['infusion', 'day_support', 'ward'] as const
export const scheduleBlockSchema = z.enum(SCHEDULE_BLOCKS)

/**
 * A rate that is raised in steps instead of running at one speed, in mL/h: rituximab and the
 * other antibodies. `first` is the patient's first infusion of that drug, `next` every later one.
 */
export const rateStepsSchema = z.strictObject({
  start_ml_h: positiveNumberSchema,
  step_ml_h: positiveNumberSchema,
  every_min: positiveNumberSchema.int(),
  max_ml_h: positiveNumberSchema,
})

export const rateRampSchema = z.strictObject({
  first: rateStepsSchema,
  /** Null when later infusions are given exactly like the first one. */
  next: rateStepsSchema.nullable().default(null),
})

/** Drug-specific organ-function checks; same shape as ReviewRules in src/domain/warnings.ts. */
export const reviewRulesSchema = z.strictObject({
  renal: z.union([z.boolean(), z.strictObject({ belowMlMin: positiveNumberSchema })]).optional(),
  hepatic: z.union([z.boolean(), z.strictObject({ aboveUmolL: positiveNumberSchema })]).optional(),
  elderly: z
    .union([z.boolean(), z.strictObject({ fromAgeYears: positiveNumberSchema })])
    .optional(),
})
