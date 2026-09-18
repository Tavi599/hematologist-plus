// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { CatalogRows } from '../../src/schemas/catalog'
import { checkCatalog } from './check-catalog'
import { diffTable, hasChanges, stableStringify } from './diff'
import { parseArgs } from './env'
import { diseaseCodeId, flattenDataSet } from './flatten'
import { loadDataDir } from './load-data'
import { DEMO_CATALOG_FIXTURE, demoCatalogJson } from './snapshot'
import { catalogToSql } from './sql'

function loadDemo(): CatalogRows {
  const { data, issues } = loadDataDir('data-demo')
  expect(issues).toEqual([])
  return flattenDataSet(data)
}

describe('demo data set', () => {
  it('loads, flattens and passes all checks', () => {
    const rows = loadDemo()
    expect(checkCatalog(rows).filter((issue) => issue.severity === 'error')).toEqual([])
    expect(rows.drugs).toHaveLength(5)
    expect(rows.regimen_items.map((item) => item.id)).toEqual([
      'r-chop-21.rituximab',
      'r-chop-21.cyclophosphamide',
      'r-chop-21.doxorubicin',
      'r-chop-21.vincristine',
      'r-chop-21.prednisolone',
    ])
    expect(rows.regimen_items.map((item) => item.sort_order)).toEqual([0, 1, 2, 3, 4])
  })

  it('maps local keys to full ids and fills defaults', () => {
    const rows = loadDemo()
    const regimen = rows.regimens[0]!
    expect(regimen.print_forms.forms[1]?.itemIds).toEqual(['r-chop-21.prednisolone'])
    expect(rows.drug_infusion_params[0]).toMatchObject({
      id: 'rituximab.nacl',
      drug_id: 'rituximab',
      duration_min: null,
      notes: null,
    })
    expect(rows.regimen_items[0]).toMatchObject({
      role: 'main',
      administrations_per_day: 1,
      infusion_params_id: null,
      cap_mg: null,
    })
    expect(rows.diseases[0]?.article?.uk).toContain('ДЕМО')
    expect(rows.disease_codes[0]?.id).toBe('dlbcl.icd-10.c83.3')
    expect(rows.treatment_node_regimens[0]).toMatchObject({
      id: 'dlbcl.first-line.r-chop-21',
      node_id: 'dlbcl.first-line',
    })
  })

  it('matches the fixture used by site tests (UPDATE_FIXTURES=1 rewrites it)', () => {
    if (process.env.UPDATE_FIXTURES) writeFileSync(DEMO_CATALOG_FIXTURE, demoCatalogJson())
    expect(JSON.parse(readFileSync(DEMO_CATALOG_FIXTURE, 'utf8'))).toEqual(
      JSON.parse(demoCatalogJson()),
    )
  })

  it('reports the missing infusion data for cyclophosphamide as a warning', () => {
    const warnings = checkCatalog(loadDemo()).filter((issue) => issue.severity === 'warning')
    expect(warnings).toEqual([
      expect.objectContaining({ table: 'regimen_items', id: 'r-chop-21.cyclophosphamide' }),
    ])
  })
})

describe('loadDataDir', () => {
  let dir: string | undefined
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  function write(path: string, content: unknown) {
    const file = join(dir!, path)
    mkdirSync(join(file, '..'), { recursive: true })
    writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content))
  }

  it('collects every file problem in one run', () => {
    dir = mkdtempSync(join(tmpdir(), 'hp-data-'))
    write('hospitals.json', '{ not json')
    write('drugs/a.json', { id: 'b', name: { uk: 'Б' } })
    write('drugs/c.json', { id: 'c', name: { uk: 'C' }, presentations: [{ key: 'x' }] })
    write('regimens/r.json', {
      id: 'r',
      short_name: 'R',
      name: { en: 'R' },
      items: [
        { key: 'a', drug_id: 'b', route: 'oral', dose_value: 1, dose_unit: 'mg_flat', days: [1] },
        { key: 'a', drug_id: 'b', route: 'oral', dose_value: 1, dose_unit: 'mg_flat', days: [2] },
      ],
      print_forms: {
        version: 1,
        forms: [{ id: 'f', kind: 'multi_day_sheet', title: 'Лист', itemIds: ['zzz'] }],
      },
    })
    mkdirSync(join(dir, 'diseases', 'empty'), { recursive: true })

    const messages = loadDataDir(dir).issues.map((issue) => `${issue.file}: ${issue.message}`)
    expect(messages).toEqual([
      expect.stringMatching(/^hospitals\.json: invalid JSON/),
      'drugs/a.json: id "b" must match the name "a"',
      expect.stringMatching(/^drugs\/c\.json: presentations\.0\.form/),
      expect.stringMatching(/^drugs\/c\.json: presentations\.0\.strength_mg/),
      'regimens/r.json: duplicate item key "a"',
      'regimens/r.json: print form "f": unknown item "zzz"',
      'diseases/empty: missing disease.json',
    ])
  })

  it('treats missing files as empty data', () => {
    dir = mkdtempSync(join(tmpdir(), 'hp-data-'))
    const { data, issues } = loadDataDir(dir)
    expect(issues).toEqual([])
    expect(data).toEqual({
      hospitals: [],
      classificationSystems: [],
      drugs: [],
      regimens: [],
      diseases: [],
    })
  })
})

describe('checkCatalog', () => {
  const errors = (rows: CatalogRows) =>
    checkCatalog(rows)
      .filter((issue) => issue.severity === 'error')
      .map((issue) => `${issue.table} ${issue.id}: ${issue.message}`)

  it('detects broken references, duplicates and cycles', () => {
    const rows = loadDemo()
    const [rituximab, cyclophosphamide] = rows.regimen_items
    rows.regimen_items.push({ ...rituximab!, id: 'r-chop-21.bad', drug_id: 'missing' })
    cyclophosphamide!.infusion_params_id = 'rituximab.nacl'
    rows.drug_presentations.push({ ...rows.drug_presentations[0]! })
    rows.hospitals.push({ ...rows.hospitals[0]!, id: 'second' })
    rows.drug_infusion_params.push({ ...rows.drug_infusion_params[0]!, id: 'rituximab.other' })
    rows.regimens[0]!.print_forms.forms[0]!.itemIds.push('other.item')
    rows.disease_codes.push({ ...rows.disease_codes[0]!, id: 'dup', system_id: 'icd-o-3' })
    rows.disease_codes.push({ ...rows.disease_codes[0]!, id: 'dup2' })
    rows.treatment_nodes.push(
      { ...rows.treatment_nodes[0]!, id: 'x', parent_id: 'y' },
      { ...rows.treatment_nodes[0]!, id: 'y', parent_id: 'x' },
      { ...rows.treatment_nodes[0]!, id: 'z', parent_id: 'x', disease_id: 'other' },
      { ...rows.treatment_nodes[0]!, id: 'w', parent_id: 'nope' },
    )
    rows.treatment_node_regimens.push(
      { ...rows.treatment_node_regimens[0]!, id: 'dup-link' },
      { ...rows.treatment_node_regimens[0]!, id: 'bad-link', node_id: 'n', regimen_id: 'r' },
    )
    rows.drug_infusion_params.push({
      ...rows.drug_infusion_params[0]!,
      id: 'ghost.nacl',
      drug_id: 'ghost',
      is_default: false,
    })

    expect(errors(rows)).toEqual([
      'drug_presentations cyclophosphamide.vial-200: duplicate id',
      'hospitals demo-hospital, second: only one default hospital',
      'drug_infusion_params ghost.nacl: drug_id "ghost" does not exist in drugs',
      'drug_infusion_params rituximab: only one default per drug',
      'regimen_items r-chop-21.cyclophosphamide: infusion params belong to drug "rituximab"',
      'regimen_items r-chop-21.bad: drug_id "missing" does not exist in drugs',
      'regimens r-chop-21: print form "infusion" references unknown item "other.item"',
      'disease_codes dup: system_id "icd-o-3" does not exist in classification_systems',
      'disease_codes dup2: duplicate code for disease',
      'treatment_nodes x: parent chain forms a cycle',
      'treatment_nodes y: parent chain forms a cycle',
      'treatment_nodes z: disease_id "other" does not exist in diseases',
      'treatment_nodes z: parent belongs to another disease',
      'treatment_nodes z: parent chain forms a cycle',
      'treatment_nodes w: parent_id "nope" does not exist in treatment_nodes',
      'treatment_node_regimens dup-link: regimen linked twice',
      'treatment_node_regimens bad-link: node_id "n" does not exist in treatment_nodes',
      'treatment_node_regimens bad-link: regimen_id "r" does not exist in regimens',
    ])
  })

  it('reports schema violations per column', () => {
    const rows = loadDemo()
    rows.regimen_items[0]!.dose_value = -1
    ;(rows.drugs[0] as { atc_code: string }).atc_code = 'bad'
    expect(errors(rows)).toEqual([
      'drugs cyclophosphamide: atc_code: ATC code like L01XC02',
      'regimen_items r-chop-21.rituximab: dose_value: Too small: expected number to be >0',
    ])
  })

  it('warns about drugs without presentations and ambiguous infusion params', () => {
    const rows = loadDemo()
    rows.drug_presentations = rows.drug_presentations.filter((p) => p.drug_id !== 'prednisolone')
    rows.drug_infusion_params[0]!.is_default = false
    rows.drug_infusion_params.push({ ...rows.drug_infusion_params[0]!, id: 'rituximab.glucose' })
    const warnings = checkCatalog(rows)
      .filter((issue) => issue.severity === 'warning')
      .map((issue) => issue.message)
    expect(warnings).toContain('no presentations: vial/tablet counts cannot be calculated')
    expect(warnings).toContain('drug has several infusion params but none is default')
  })

  it('keeps a regimen whose drug cannot be obtained and names the drug', () => {
    const rows = loadDemo()
    rows.drugs.find((drug) => drug.id === 'rituximab')!.availability = 'unavailable'
    const issues = checkCatalog(rows)
    expect(issues.filter((issue) => issue.severity === 'error')).toEqual([])
    expect(issues.map((issue) => issue.message)).toContain('drugs not obtainable: rituximab')
  })
})

describe('diff', () => {
  it('ignores key order and extra database columns', () => {
    expect(stableStringify({ b: 1, a: { d: [1, { f: 2, e: 1 }], c: undefined } })).toBe(
      '{"a":{"d":[1,{"e":1,"f":2}]},"b":1}',
    )
    const diff = diffTable(
      'drugs',
      [
        { id: 'same', name: { uk: 'А', en: 'A' } },
        { id: 'changed', max_single_dose_mg: 2 },
        { id: 'new', max_single_dose_mg: null },
      ],
      [
        { id: 'same', name: { en: 'A', uk: 'А' }, created_at: 'ignored' },
        { id: 'changed', max_single_dose_mg: 3 },
        { id: 'stale', max_single_dose_mg: null },
      ],
    )
    expect(diff.inserts.map((row) => row.id)).toEqual(['new'])
    expect(diff.updates.map((row) => row.id)).toEqual(['changed'])
    expect(diff.deletes).toEqual(['stale'])
    expect(hasChanges([{ ...diff, inserts: [], updates: [] }], false)).toBe(false)
    expect(hasChanges([{ ...diff, inserts: [], updates: [] }], true)).toBe(true)
  })
})

describe('helpers', () => {
  it('normalizes disease code ids', () => {
    expect(diseaseCodeId('mm', 'icd-o-3', ' 9732/3 ')).toBe('mm.icd-o-3.9732-3')
  })

  it('parses CLI arguments', () => {
    const { flags, options } = parseArgs(['--apply', '--dir', 'data-demo', '--x=1', 'stray'])
    expect([...flags]).toEqual(['apply'])
    expect(Object.fromEntries(options)).toEqual({ dir: 'data-demo', x: '1' })
  })
})

describe('catalogToSql', () => {
  it('upserts parents before children in one transaction', () => {
    const sql = catalogToSql(loadDemo(), { prune: false })
    const tables = [...sql.matchAll(/^insert into public\.(\w+)/gm)].map((match) => match[1])
    expect(tables).toEqual([
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
    ])
    expect(sql.startsWith('-- Generated')).toBe(true)
    expect(sql).toMatch(/^begin;$[\s\S]*^commit;$/m)
    expect(sql).toContain('on conflict (id) do update set name = excluded.name,')
    expect(sql).not.toContain('delete from')
  })

  it('deletes stale rows children-first only with prune', () => {
    const sql = catalogToSql(loadDemo(), { prune: true })
    const deletes = [...sql.matchAll(/^delete from public\.(\w+)/gm)].map((match) => match[1])
    expect(deletes[0]).toBe('treatment_node_regimens')
    expect(deletes.at(-1)).toBe('classification_systems')
    expect(sql.indexOf('delete from')).toBeGreaterThan(sql.lastIndexOf('insert into'))
  })

  it('refuses data that would break the dollar quoting', () => {
    const rows = loadDemo()
    rows.hospitals[0]!.address = 'x $catalog$ y'
    expect(() => catalogToSql(rows, { prune: false })).toThrow(/contains \$catalog\$/)
  })
})
