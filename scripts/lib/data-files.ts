import { z } from 'zod'

import {
  amountUnitSchema,
  rateRampSchema,
  scheduleBlockSchema,
  diseaseReferencesSchema,
  doseOptionsSchema,
  doseUnitSchema,
  drugAvailabilitySchema,
  idSchema,
  itemRoleSchema,
  keySchema,
  localizedTextSchema,
  nonEmptyTextSchema,
  nonNegativeIntSchema,
  positiveNumberSchema,
  presentationFormSchema,
  reviewRulesSchema,
  routeSchema,
  solventSchema,
  sortOrderSchema,
  sourcesSchema,
  treatmentNodeKindSchema,
  unitEquivalenceSchema,
} from '../../src/schemas/common'
import { EMPTY_PRINT_FORMS, printFormsFileSchema } from '../../src/schemas/print-forms'

/**
 * Authoring format of data/ (see docs/data-format.md).
 * Children use local `key`s; flatten.ts turns them into full ids and table rows.
 * Optional fields get explicit defaults so every row is complete.
 */

const optionalText = z.string().nullable().default(null)
const optionalLocalized = localizedTextSchema.nullable().default(null)
const optionalPositive = positiveNumberSchema.nullable().default(null)
const optionalNonNegativeInt = nonNegativeIntSchema.nullable().default(null)
const optionalPositiveInt = positiveNumberSchema.int().nullable().default(null)
const sortOrder = sortOrderSchema.default(0)

export const hospitalsFileSchema = z.array(
  z.strictObject({
    $comment: z.string().optional(),
    id: idSchema,
    institution_name: nonEmptyTextSchema,
    department_name: nonEmptyTextSchema,
    head_of_department: optionalText,
    doctors: z.array(nonEmptyTextSchema).default([]),
    address: optionalText,
    is_default: z.boolean().default(false),
    sort_order: sortOrder,
    /** Код за ЄДРПОУ, printed in the header of the blanks. */
    registry_code: optionalText,
  }),
)

export const classificationSystemsFileSchema = z.array(
  z.strictObject({
    id: idSchema,
    name: localizedTextSchema,
    version: optionalText,
    url: z.url().nullable().default(null),
    sort_order: sortOrder,
  }),
)

export const drugFileSchema = z.strictObject({
  $comment: z.string().optional(),
  id: idSchema,
  name: localizedTextSchema,
  trade_names: z.array(nonEmptyTextSchema).default([]),
  atc_code: z
    .string()
    .regex(/^[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$/, 'ATC code like L01XC02')
    .nullable()
    .default(null),
  /** Unit this drug is measured in: its pack strengths, caps and doses. */
  amount_unit: amountUnitSchema.default('mg'),
  /** Dose units the drug is officially prescribed in; empty means every unit of its kind. */
  dose_units: z.array(doseUnitSchema).default([]),
  max_single_dose_amount: optionalPositive,
  /** Only for a drug sold and prescribed both by mass and by activity, e.g. filgrastim. */
  unit_equivalence: unitEquivalenceSchema.nullable().default(null),
  review_rules: reviewRulesSchema.nullable().default(null),
  notes: optionalLocalized,
  sort_order: sortOrder,
  sources: sourcesSchema.default([]),
  availability: drugAvailabilitySchema.default('registered'),
  presentations: z
    .array(
      z.strictObject({
        key: keySchema,
        form: presentationFormSchema,
        strength_amount: positiveNumberSchema,
        /** Defaults to the drug's amount_unit; set it only for a pack labelled differently. */
        strength_unit: amountUnitSchema.optional(),
        volume_ml: optionalPositive,
        label: optionalLocalized,
      }),
    )
    .default([]),
  infusion_params: z
    .array(
      z.strictObject({
        key: keySchema,
        solvent: solventSchema,
        concentration_min_mg_ml: optionalPositive,
        concentration_max_mg_ml: optionalPositive,
        stock_concentration_mg_ml: optionalPositive,
        /** Rate raised in steps (mL/h) instead of one speed; see rateRampSchema. */
        rate_ramp: rateRampSchema.nullable().default(null),
        bag_volumes_ml: z.array(positiveNumberSchema).default([]),
        duration_min: optionalNonNegativeInt,
        is_default: z.boolean().default(false),
        notes: optionalLocalized,
        sources: sourcesSchema.default([]),
      }),
    )
    .default([]),
})

export const regimenFileSchema = z.strictObject({
  $comment: z.string().optional(),
  id: idSchema,
  short_name: nonEmptyTextSchema,
  name: localizedTextSchema,
  description: optionalLocalized,
  cycle_length_days: positiveNumberSchema.int().nullable().default(null),
  default_cycles: positiveNumberSchema.int().nullable().default(null),
  sort_order: sortOrder,
  sources: sourcesSchema.default([]),
  /** Administration order = array order. */
  items: z
    .array(
      z.strictObject({
        key: keySchema,
        drug_id: idSchema,
        role: itemRoleSchema.default('main'),
        route: routeSchema,
        dose_value: positiveNumberSchema,
        dose_unit: doseUnitSchema,
        cap_amount: optionalPositive,
        /** Sheet and timing; derived from role and route when omitted (see flatten.ts). */
        block: scheduleBlockSchema.optional(),
        /** Minutes between the repeats within a day (q8h = 480). */
        interval_min: optionalPositiveInt,
        /** day_support: minutes from the day's first chained drug; negative is before it. */
        anchor_offset_min: z.number().int().nullable().default(null),
        days: z.array(nonNegativeIntSchema).min(1),
        administrations_per_day: positiveNumberSchema.int().default(1),
        /** Key of one of the drug's infusion_params; the drug default is used when omitted. */
        infusion_params_key: keySchema.nullable().default(null),
        duration_min: optionalNonNegativeInt,
        fallback_solvent: solventSchema.nullable().default(null),
        fallback_volume_ml: optionalPositive,
        gap_before_min: optionalNonNegativeInt,
        notes: optionalLocalized,
        /** Same dose as written by other protocols; the physician picks one in the calculator. */
        dose_options: doseOptionsSchema.default([]),
      }),
    )
    .min(1),
  print_forms: printFormsFileSchema.default(EMPTY_PRINT_FORMS),
})

interface TreatmentNodeFile {
  key: string
  kind: z.infer<typeof treatmentNodeKindSchema>
  title: z.infer<typeof localizedTextSchema>
  description: z.infer<typeof localizedTextSchema> | null
  regimens: { regimen_id: string; notes: z.infer<typeof localizedTextSchema> | null }[]
  children: TreatmentNodeFile[]
}

const treatmentNodeFileSchema: z.ZodType<TreatmentNodeFile, unknown> = z.lazy(() =>
  z.strictObject({
    key: keySchema,
    kind: treatmentNodeKindSchema,
    title: localizedTextSchema,
    description: optionalLocalized,
    regimens: z
      .array(z.strictObject({ regimen_id: idSchema, notes: optionalLocalized }))
      .default([]),
    children: z.array(treatmentNodeFileSchema).default([]),
  }),
)

export const diseaseFileSchema = z.strictObject({
  $comment: z.string().optional(),
  id: idSchema,
  name: localizedTextSchema,
  summary: optionalLocalized,
  sort_order: sortOrder,
  codes: z
    .array(
      z.strictObject({
        system_id: idSchema,
        code: nonEmptyTextSchema,
        is_primary: z.boolean().default(false),
      }),
    )
    .default([]),
  /** Guideline pages the physician opens next; the app only links out, never copies them. */
  references: diseaseReferencesSchema.default([]),
  treatment: z.array(treatmentNodeFileSchema).default([]),
})

export type HospitalsFile = z.infer<typeof hospitalsFileSchema>
export type ClassificationSystemsFile = z.infer<typeof classificationSystemsFileSchema>
export type DrugFile = z.infer<typeof drugFileSchema>
export type RegimenFile = z.infer<typeof regimenFileSchema>
export type DiseaseFile = z.infer<typeof diseaseFileSchema> & {
  /** Markdown from article.<lang>.md next to disease.json. */
  article: z.infer<typeof localizedTextSchema> | null
}
export type { TreatmentNodeFile }

/** Everything read from a data directory, before flattening into table rows. */
export interface DataSet {
  hospitals: HospitalsFile
  classificationSystems: ClassificationSystemsFile
  drugs: DrugFile[]
  regimens: RegimenFile[]
  diseases: DiseaseFile[]
}
