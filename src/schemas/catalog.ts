import { z } from 'zod'

import {
  amountUnitSchema,
  rateRampSchema,
  scheduleBlockSchema,
  doseOptionsSchema,
  doseUnitSchema,
  drugAvailabilitySchema,
  diseaseReferencesSchema,
  idSchema,
  itemRoleSchema,
  localizedTextSchema,
  nonEmptyTextSchema,
  nonNegativeIntSchema,
  positiveNumberSchema,
  presentationFormSchema,
  reviewRulesSchema,
  routeSchema,
  sourcesSchema,
  solventSchema,
  sortOrderSchema,
  treatmentNodeKindSchema,
} from './common'
import { printFormsRowSchema } from './print-forms'

/**
 * Row schemas of the catalog tables, exactly as returned by Supabase.
 * Keys must match the columns in supabase/migrations (checked by catalog.test.ts).
 *
 * Deliberately NOT strict: the database is shared with app versions that are already
 * installed. A migration that adds a column must not make every older client reject
 * every row — unknown columns are dropped instead.
 */

export const hospitalRowSchema = z.object({
  id: idSchema,
  institution_name: nonEmptyTextSchema,
  department_name: nonEmptyTextSchema,
  head_of_department: z.string().nullable(),
  doctors: z.array(nonEmptyTextSchema),
  address: z.string().nullable(),
  is_default: z.boolean(),
  sort_order: sortOrderSchema,
  /** Defaulted so this build can read a database where the migration has not run yet. */
  registry_code: z.string().nullable().default(null),
})

export const drugRowSchema = z.object({
  id: idSchema,
  name: localizedTextSchema,
  trade_names: z.array(nonEmptyTextSchema),
  atc_code: z
    .string()
    .regex(/^[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$/, 'ATC code like L01XC02')
    .nullable(),
  review_rules: reviewRulesSchema.nullable(),
  notes: localizedTextSchema.nullable(),
  sort_order: sortOrderSchema,
  sources: sourcesSchema,
  availability: drugAvailabilitySchema,
  /** Unit the pack strengths and caps of this drug are in. */
  amount_unit: amountUnitSchema,
  /** Dose units this drug is officially prescribed in; empty means unrestricted. */
  dose_units: z.array(doseUnitSchema),
  /** Maximum absolute dose per administration, in `amount_unit`. */
  max_single_dose_amount: positiveNumberSchema.nullable(),
})

export const drugPresentationRowSchema = z.object({
  id: idSchema,
  drug_id: idSchema,
  form: presentationFormSchema,
  volume_ml: positiveNumberSchema.nullable(),
  label: localizedTextSchema.nullable(),
  sort_order: sortOrderSchema,
  strength_amount: positiveNumberSchema,
  strength_unit: amountUnitSchema,
})

export const drugInfusionParamsRowSchema = z
  .object({
    id: idSchema,
    drug_id: idSchema,
    solvent: solventSchema,
    concentration_min_mg_ml: positiveNumberSchema.nullable(),
    concentration_max_mg_ml: positiveNumberSchema.nullable(),
    stock_concentration_mg_ml: positiveNumberSchema.nullable(),
    bag_volumes_ml: z.array(positiveNumberSchema),
    duration_min: nonNegativeIntSchema.nullable(),
    is_default: z.boolean(),
    notes: localizedTextSchema.nullable(),
    sort_order: sortOrderSchema,
    sources: sourcesSchema,
    rate_ramp: rateRampSchema.nullable(),
  })
  .refine(
    (row) =>
      row.concentration_min_mg_ml === null ||
      row.concentration_max_mg_ml === null ||
      row.concentration_min_mg_ml <= row.concentration_max_mg_ml,
    { message: 'concentration_min_mg_ml must not exceed concentration_max_mg_ml' },
  )

export const regimenRowSchema = z.object({
  id: idSchema,
  short_name: nonEmptyTextSchema,
  name: localizedTextSchema,
  description: localizedTextSchema.nullable(),
  cycle_length_days: positiveNumberSchema.int().nullable(),
  default_cycles: positiveNumberSchema.int().nullable(),
  print_forms: printFormsRowSchema,
  sort_order: sortOrderSchema,
  sources: sourcesSchema,
})

export const regimenItemRowSchema = z.object({
  id: idSchema,
  regimen_id: idSchema,
  drug_id: idSchema,
  role: itemRoleSchema,
  route: routeSchema,
  /** Dose per administration. */
  dose_value: positiveNumberSchema,
  dose_unit: doseUnitSchema,
  days: z.array(nonNegativeIntSchema).min(1),
  administrations_per_day: positiveNumberSchema.int(),
  infusion_params_id: idSchema.nullable(),
  duration_min: nonNegativeIntSchema.nullable(),
  fallback_solvent: solventSchema.nullable(),
  fallback_volume_ml: positiveNumberSchema.nullable(),
  gap_before_min: nonNegativeIntSchema.nullable(),
  notes: localizedTextSchema.nullable(),
  sort_order: sortOrderSchema,
  dose_options: doseOptionsSchema,
  /** Maximum absolute dose per administration, in the dose's amount unit. */
  cap_amount: positiveNumberSchema.nullable(),
  /** Which sheet the row belongs to and how its time is set. */
  block: scheduleBlockSchema,
  /** Minutes between administrations within a day (q8h = 480). */
  interval_min: positiveNumberSchema.int().nullable(),
  /** day_support: minutes from the start of the day's first chained drug; negative is before it. */
  anchor_offset_min: z.number().int().nullable(),
})

export const classificationSystemRowSchema = z.object({
  id: idSchema,
  name: localizedTextSchema,
  version: z.string().nullable(),
  url: z.url().nullable(),
  sort_order: sortOrderSchema,
})

export const diseaseRowSchema = z.object({
  id: idSchema,
  name: localizedTextSchema,
  summary: localizedTextSchema.nullable(),
  sort_order: sortOrderSchema,
  /** Defaulted so a client that already knows the column can still read a database without it. */
  references_json: diseaseReferencesSchema.default([]),
})

/**
 * Article text of a disease. Read only with a signed-in session (see the RLS policy), so it is
 * never part of the public catalog and never persisted next to it.
 */
export const diseaseArticleRowSchema = z.object({
  id: idSchema,
  disease_id: idSchema,
  language: z.enum(['uk', 'en']),
  body: nonEmptyTextSchema,
  sort_order: sortOrderSchema,
})

/**
 * Tables the app itself writes to: the proposals a colleague sends and the list of who may
 * review them. They are never synced from data/ and never cached offline.
 */
export const APP_TABLES = ['admins', 'proposals'] as const
export type AppTable = (typeof APP_TABLES)[number]

/** Tables that require a session; they are not part of the catalog and are not cached offline. */
export const PRIVATE_TABLES = ['disease_articles'] as const
export type PrivateTable = (typeof PRIVATE_TABLES)[number]
export type DiseaseArticle = z.infer<typeof diseaseArticleRowSchema>

export const diseaseCodeRowSchema = z.object({
  id: idSchema,
  disease_id: idSchema,
  system_id: idSchema,
  code: nonEmptyTextSchema,
  is_primary: z.boolean(),
  sort_order: sortOrderSchema,
})

export const treatmentNodeRowSchema = z.object({
  id: idSchema,
  disease_id: idSchema,
  parent_id: idSchema.nullable(),
  kind: treatmentNodeKindSchema,
  title: localizedTextSchema,
  description: localizedTextSchema.nullable(),
  sort_order: sortOrderSchema,
})

export const treatmentNodeRegimenRowSchema = z.object({
  id: idSchema,
  node_id: idSchema,
  regimen_id: idSchema,
  notes: localizedTextSchema.nullable(),
  sort_order: sortOrderSchema,
})

/** Tables in dependency order: parents before children (upsert order; delete in reverse). */
export const CATALOG_TABLES = [
  'classification_systems',
  'hospitals',
  'drugs',
  'drug_presentations',
  'drug_infusion_params',
  'regimens',
  'regimen_items',
  'diseases',
  'disease_codes',
  'treatment_nodes',
  'treatment_node_regimens',
] as const

export type CatalogTable = (typeof CATALOG_TABLES)[number]

export const catalogRowSchemas = {
  classification_systems: classificationSystemRowSchema,
  hospitals: hospitalRowSchema,
  drugs: drugRowSchema,
  drug_presentations: drugPresentationRowSchema,
  drug_infusion_params: drugInfusionParamsRowSchema,
  regimens: regimenRowSchema,
  regimen_items: regimenItemRowSchema,
  diseases: diseaseRowSchema,
  disease_codes: diseaseCodeRowSchema,
  treatment_nodes: treatmentNodeRowSchema,
  treatment_node_regimens: treatmentNodeRegimenRowSchema,
} as const satisfies Record<CatalogTable, z.ZodObject>

/** Catalog plus the tables that need a session; what the content pipeline writes. */
export const SYNC_TABLES = [...CATALOG_TABLES, ...PRIVATE_TABLES] as const
export type SyncTable = (typeof SYNC_TABLES)[number]

export const syncRowSchemas = {
  ...catalogRowSchemas,
  disease_articles: diseaseArticleRowSchema,
} as const satisfies Record<SyncTable, z.ZodObject>

export type CatalogRow<T extends CatalogTable> = z.infer<(typeof catalogRowSchemas)[T]>
export type SyncRow<T extends SyncTable> = z.infer<(typeof syncRowSchemas)[T]>

/** Every table the pipeline fills: the public catalog and the private article text. */
export type SyncRows = { [T in SyncTable]: SyncRow<T>[] }

/** The whole reference catalog: every table as an array of rows. */
export type CatalogRows = { [T in CatalogTable]: CatalogRow<T>[] }

export type Hospital = CatalogRow<'hospitals'>
export type Drug = CatalogRow<'drugs'>
export type DrugPresentation = CatalogRow<'drug_presentations'>
export type DrugInfusionParams = CatalogRow<'drug_infusion_params'>
export type Regimen = CatalogRow<'regimens'>
export type RegimenItem = CatalogRow<'regimen_items'>
export type ClassificationSystem = CatalogRow<'classification_systems'>
export type Disease = CatalogRow<'diseases'>
export type DiseaseCode = CatalogRow<'disease_codes'>
export type TreatmentNode = CatalogRow<'treatment_nodes'>
export type TreatmentNodeRegimen = CatalogRow<'treatment_node_regimens'>

/**
 * Bump when the catalog shape changes incompatibly: invalidates offline caches.
 * Keep in step with new migrations that change columns.
 */
export const CATALOG_SCHEMA_VERSION = '6'

export function emptySyncRows(): SyncRows {
  return { ...emptyCatalog(), disease_articles: [] }
}

export function emptyCatalog(): CatalogRows {
  return Object.fromEntries(CATALOG_TABLES.map((table) => [table, []])) as unknown as CatalogRows
}
