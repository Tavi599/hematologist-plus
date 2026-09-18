import { z } from 'zod'

import {
  doseOptionsSchema,
  doseUnitSchema,
  drugAvailabilitySchema,
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
 */

export const hospitalRowSchema = z.strictObject({
  id: idSchema,
  institution_name: nonEmptyTextSchema,
  department_name: nonEmptyTextSchema,
  head_of_department: z.string().nullable(),
  doctors: z.array(nonEmptyTextSchema),
  address: z.string().nullable(),
  is_default: z.boolean(),
  sort_order: sortOrderSchema,
})

export const drugRowSchema = z.strictObject({
  id: idSchema,
  name: localizedTextSchema,
  trade_names: z.array(nonEmptyTextSchema),
  atc_code: z
    .string()
    .regex(/^[A-Z][0-9]{2}[A-Z]{2}[0-9]{2}$/, 'ATC code like L01XC02')
    .nullable(),
  max_single_dose_mg: positiveNumberSchema.nullable(),
  review_rules: reviewRulesSchema.nullable(),
  notes: localizedTextSchema.nullable(),
  sort_order: sortOrderSchema,
  sources: sourcesSchema,
  availability: drugAvailabilitySchema,
})

export const drugPresentationRowSchema = z.strictObject({
  id: idSchema,
  drug_id: idSchema,
  form: presentationFormSchema,
  strength_mg: positiveNumberSchema,
  volume_ml: positiveNumberSchema.nullable(),
  label: localizedTextSchema.nullable(),
  sort_order: sortOrderSchema,
})

export const drugInfusionParamsRowSchema = z
  .strictObject({
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
  })
  .refine(
    (row) =>
      row.concentration_min_mg_ml === null ||
      row.concentration_max_mg_ml === null ||
      row.concentration_min_mg_ml <= row.concentration_max_mg_ml,
    { message: 'concentration_min_mg_ml must not exceed concentration_max_mg_ml' },
  )

export const regimenRowSchema = z.strictObject({
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

export const regimenItemRowSchema = z.strictObject({
  id: idSchema,
  regimen_id: idSchema,
  drug_id: idSchema,
  role: itemRoleSchema,
  route: routeSchema,
  /** Dose per administration. */
  dose_value: positiveNumberSchema,
  dose_unit: doseUnitSchema,
  cap_mg: positiveNumberSchema.nullable(),
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
})

export const classificationSystemRowSchema = z.strictObject({
  id: idSchema,
  name: localizedTextSchema,
  version: z.string().nullable(),
  url: z.url().nullable(),
  sort_order: sortOrderSchema,
})

export const diseaseRowSchema = z.strictObject({
  id: idSchema,
  name: localizedTextSchema,
  summary: localizedTextSchema.nullable(),
  /** Markdown article per language. */
  article: localizedTextSchema.nullable(),
  sort_order: sortOrderSchema,
})

export const diseaseCodeRowSchema = z.strictObject({
  id: idSchema,
  disease_id: idSchema,
  system_id: idSchema,
  code: nonEmptyTextSchema,
  is_primary: z.boolean(),
  sort_order: sortOrderSchema,
})

export const treatmentNodeRowSchema = z.strictObject({
  id: idSchema,
  disease_id: idSchema,
  parent_id: idSchema.nullable(),
  kind: treatmentNodeKindSchema,
  title: localizedTextSchema,
  description: localizedTextSchema.nullable(),
  sort_order: sortOrderSchema,
})

export const treatmentNodeRegimenRowSchema = z.strictObject({
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

export type CatalogRow<T extends CatalogTable> = z.infer<(typeof catalogRowSchemas)[T]>

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
export const CATALOG_SCHEMA_VERSION = '3'

export function emptyCatalog(): CatalogRows {
  return Object.fromEntries(CATALOG_TABLES.map((table) => [table, []])) as unknown as CatalogRows
}
