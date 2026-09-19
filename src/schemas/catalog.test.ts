import { describe, expect, expectTypeOf, it } from 'vitest'

import type { DoseUnit } from '../domain/types'
import type { ReviewRules } from '../domain/warnings'
import type { Language } from '../lib/i18n'
import type { LocalizedText } from '../lib/localized'
import {
  CATALOG_TABLES,
  catalogRowSchemas,
  diseaseArticleRowSchema,
  drugInfusionParamsRowSchema,
  PRIVATE_TABLES,
} from './catalog'
import { AMOUNT_UNITS, DOSE_UNITS, localizedTextSchema, reviewRulesSchema } from './common'
import { printFormsRowSchema } from './print-forms'

const migrations = import.meta.glob<string>('/supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const sql = Object.keys(migrations)
  .sort()
  .map((path) => migrations[path])
  .join('\n')

function tableColumns(): Map<string, string[]> {
  const tables = new Map<string, string[]>()
  for (const match of sql.matchAll(/create table public\.(\w+) \(\n([\s\S]*?)\n\);/g)) {
    const columns = [
      ...match[2]!.matchAll(/^ {2}([a-z_]+) (?:text|jsonb|numeric|integer|smallint|boolean)\b/gm),
    ].map((column) => column[1]!)
    tables.set(match[1]!, columns)
  }
  // Later migrations add columns to the tables created above.
  for (const match of sql.matchAll(
    /alter table public\.(\w+)\s+add column ([a-z_]+) (?:text|jsonb|numeric|integer|smallint|boolean)\b/g,
  )) {
    tables.get(match[1]!)?.push(match[2]!)
  }
  // ... and later migrations drop columns again.
  for (const match of sql.matchAll(/alter table public\.(\w+) drop column ([a-z_]+);/g)) {
    const columns = tables.get(match[1]!)
    if (columns) {
      tables.set(
        match[1]!,
        columns.filter((column) => column !== match[2]),
      )
    }
  }
  return tables
}

describe('database schema', () => {
  const tables = tableColumns()

  it('defines exactly the catalog tables and the private ones', () => {
    expect([...tables.keys()].sort()).toEqual([...CATALOG_TABLES, ...PRIVATE_TABLES].sort())
  })

  it.each(PRIVATE_TABLES)('%s is readable only with a session', (table) => {
    expect(sql).toContain(`alter table public.${table} enable row level security;`)
    // A policy for anon, or a grant to anon, would put article text on the public site.
    expect(sql).toMatch(
      new RegExp(`create policy "[^"]+" on public\\.${table} for select to authenticated`),
    )
    expect(sql).not.toMatch(new RegExp(`create policy "[^"]+" on public\\.${table}[^;]*anon`))
    expect(sql).not.toMatch(new RegExp(`grant [^;]*on public\\.${table}[^;]*to [^;]*anon`))
    expect(sql).toContain(`grant select on public.${table} to authenticated;`)
  })

  it('lets the database store every unit the code knows', () => {
    // A unit added here but not in the check constraint would be refused on write, and one
    // stored by a newer client would be refused on read. Both lists must stay identical.
    const doseUnits =
      sql.match(/regimen_items_dose_unit_check check \(dose_unit in \(([\s\S]*?)\)\);/)?.[1] ?? ''
    expect([...doseUnits.matchAll(/'([a-z0-9_]+)'/g)].map((m) => m[1]).sort()).toEqual(
      [...DOSE_UNITS].sort(),
    )
    for (const column of ['amount_unit', 'strength_unit']) {
      const units = sql.match(new RegExp(`check \\(${column} in \\(([^)]*)\\)`))?.[1] ?? ''
      expect([...units.matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort()).toEqual(
        [...AMOUNT_UNITS].sort(),
      )
    }
  })

  it('keeps article columns out of the public tables', () => {
    expect(diseaseArticleRowSchema.shape.body).toBeDefined()
    expect(Object.keys(catalogRowSchemas.diseases.shape)).not.toContain('article')
  })

  it.each(CATALOG_TABLES)('%s columns match the Zod row schema', (table) => {
    expect(tables.get(table)).toEqual(Object.keys(catalogRowSchemas[table].shape))
  })

  it.each(CATALOG_TABLES)('%s accepts a column added by a later migration', (table) => {
    // An installed app must keep reading the database after a migration adds a column,
    // otherwise every client breaks until the user accepts the update.
    const row = Object.fromEntries(
      Object.entries(catalogRowSchemas[table].shape).map(([key]) => [key, undefined]),
    )
    const parsed = catalogRowSchemas[table].safeParse({ ...row, column_from_the_future: 'x' })
    expect(parsed.error?.issues.some((issue) => issue.path[0] === 'column_from_the_future')).toBe(
      false,
    )
  })

  it.each(CATALOG_TABLES)(
    '%s has RLS, a read policy and no write grants for API roles',
    (table) => {
      expect(sql).toContain(`alter table public.${table} enable row level security;`)
      expect(sql).toMatch(
        new RegExp(`create policy "[^"]+" on public\\.${table} for select to anon, authenticated`),
      )
      expect(sql).not.toMatch(
        new RegExp(`create policy "[^"]+" on public\\.${table} for (?!select)`),
      )
      expect(sql).not.toMatch(/grant (?:all|[^;]*\b(?:insert|update|delete)\b)[^;]*to anon/)
    },
  )
})

describe('shared schemas', () => {
  it('keep types in step with the domain and i18n', () => {
    expectTypeOf<(typeof DOSE_UNITS)[number]>().toEqualTypeOf<DoseUnit>()
    expectTypeOf<
      keyof NonNullable<ReturnType<typeof localizedTextSchema.parse>>
    >().toEqualTypeOf<Language>()
    expectTypeOf<ReturnType<typeof localizedTextSchema.parse>>().toExtend<LocalizedText>()
    expectTypeOf<ReturnType<typeof reviewRulesSchema.parse>>().toExtend<ReviewRules>()
  })

  it('accepts localized text with at least one language', () => {
    expect(localizedTextSchema.safeParse({ uk: 'Текст' }).success).toBe(true)
    expect(localizedTextSchema.safeParse({ en: 'Text', uk: null }).success).toBe(true)
    expect(localizedTextSchema.safeParse({ uk: '  ', en: null }).success).toBe(false)
    expect(localizedTextSchema.safeParse({}).success).toBe(false)
    expect(localizedTextSchema.safeParse({ uk: 'Текст', de: 'Text' }).success).toBe(false)
  })

  it('rejects inverted concentration limits', () => {
    const row = {
      id: 'drug.nacl',
      drug_id: 'drug',
      solvent: 'sodium_chloride_0_9',
      concentration_min_mg_ml: 4,
      concentration_max_mg_ml: 1,
      stock_concentration_mg_ml: null,
      bag_volumes_ml: [250],
      duration_min: null,
      is_default: true,
      notes: null,
      sort_order: 0,
      sources: [{ name: 'SmPC', checkedOn: '2026-09-18' }],
    }
    expect(drugInfusionParamsRowSchema.safeParse(row).success).toBe(false)
    expect(
      drugInfusionParamsRowSchema.safeParse({ ...row, concentration_min_mg_ml: 1 }).success,
    ).toBe(true)
  })

  it('validates print form lists', () => {
    const form = { id: 'infusion', kind: 'infusion_sheet', title: 'Лист', itemIds: ['r.a'] }
    const parsed = printFormsRowSchema.parse({ version: 1, forms: [form] })
    expect(parsed.forms[0]?.template).toEqual({})
    expect(printFormsRowSchema.safeParse({ version: 1, forms: [form, form] }).success).toBe(false)
    expect(printFormsRowSchema.safeParse({ version: 2, forms: [] }).success).toBe(false)
    expect(
      printFormsRowSchema.safeParse({ version: 1, forms: [{ ...form, itemIds: [] }] }).success,
    ).toBe(false)
  })
})
