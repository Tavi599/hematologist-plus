import { z } from 'zod'

import { keySchema, idSchema, nonEmptyTextSchema } from './common'

export const PRINT_FORM_KINDS = [
  /** Tablets and daily injections: one sheet, one column per course day. */
  'multi_day_sheet',
  /** Injections and infusions: a separate one-day sheet per infusion day. */
  'infusion_sheet',
] as const

/**
 * One printable form of a regimen.
 * `template` holds the layout (blocks, bindings, repeated rows/columns). Its detailed schema is
 * defined in stage 5 from the hospital's real blanks; until then it is an opaque object.
 */
function printFormSchema(itemRefSchema: z.ZodString) {
  return z.strictObject({
    id: keySchema,
    kind: z.enum(PRINT_FORM_KINDS),
    /** Printed title; forms are Ukrainian only. */
    title: nonEmptyTextSchema,
    itemIds: z.array(itemRefSchema).min(1),
    template: z.record(z.string(), z.unknown()).default({}),
  })
}

function printFormsSchema(itemRefSchema: z.ZodString) {
  return z
    .strictObject({
      version: z.literal(1),
      forms: z.array(printFormSchema(itemRefSchema)),
    })
    .superRefine((value, ctx) => {
      const seen = new Set<string>()
      value.forms.forEach((form, index) => {
        if (seen.has(form.id)) {
          ctx.addIssue({
            code: 'custom',
            path: ['forms', index, 'id'],
            message: `duplicate form id "${form.id}"`,
          })
        }
        seen.add(form.id)
      })
    })
}

/** As stored in `regimens.print_forms`: item references are full regimen item ids. */
export const printFormsRowSchema = printFormsSchema(idSchema)

/** As written in data/regimens/*.json: item references are local item keys. */
export const printFormsFileSchema = printFormsSchema(keySchema)

export type PrintFormKind = (typeof PRINT_FORM_KINDS)[number]
export type PrintForms = z.infer<typeof printFormsRowSchema>
export type PrintForm = PrintForms['forms'][number]

export const EMPTY_PRINT_FORMS: PrintForms = { version: 1, forms: [] }
