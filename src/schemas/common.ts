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

export const DOSE_UNITS = ['mg_m2', 'mg_kg', 'mg_flat', 'auc'] as const
export const doseUnitSchema = z.enum(DOSE_UNITS)

export const TREATMENT_NODE_KINDS = ['treatment', 'line', 'stage', 'group'] as const
export const treatmentNodeKindSchema = z.enum(TREATMENT_NODE_KINDS)

/** Drug-specific organ-function checks; same shape as ReviewRules in src/domain/warnings.ts. */
export const reviewRulesSchema = z.strictObject({
  renal: z.union([z.boolean(), z.strictObject({ belowMlMin: positiveNumberSchema })]).optional(),
  hepatic: z.union([z.boolean(), z.strictObject({ aboveUmolL: positiveNumberSchema })]).optional(),
  elderly: z
    .union([z.boolean(), z.strictObject({ fromAgeYears: positiveNumberSchema })])
    .optional(),
})
