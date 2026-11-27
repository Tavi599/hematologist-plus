import { z } from 'zod'

import { headerSchema, manualRowSchema } from './course-draft'

/**
 * A free prescription sheet as this device keeps it: lines the physician wrote, the patient's
 * name and the dates — no regimen, no measurements, nothing calculated.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export const freeSheetStateSchema = z.object({
  fullName: z.string(),
  recordNumber: z.string(),
  // Empty while the field is cleared or half typed: kept as the physician left it.
  startDate: z.union([z.literal(''), z.string().regex(DATE_PATTERN)]),
  dayStart: z.union([z.literal(''), z.string().regex(TIME_PATTERN)]),
  header: headerSchema,
  rows: z.array(manualRowSchema),
})

export type FreeSheetState = z.infer<typeof freeSheetStateSchema>

export const freeSheetDraftSchema = z.object({
  app: z.literal('hematologist-plus'),
  kind: z.literal('free-sheet'),
  version: z.literal(1),
  /** When it was written, ISO: a draft older than a week is let go of. */
  savedAt: z.string(),
  state: freeSheetStateSchema,
})

export type FreeSheetDraft = z.infer<typeof freeSheetDraftSchema>
