// @vitest-environment node
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import type { SyncRows } from '../../src/schemas/catalog'
import { checkCatalog } from './check-catalog'
import { diffTable, hasChanges, stableStringify } from './diff'
import { parseArgs } from './env'
import { diseaseCodeId, flattenDataSet } from './flatten'
import { contentOptions, loadDataDir, prunesArticlesBlind } from './load-data'
import { DEMO_CATALOG_FIXTURE, demoCatalogJson } from './snapshot'
import { catalogToSql } from './sql'

function loadDemo(): SyncRows {
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
      cap_amount: null,
    })
    expect(rows.disease_articles[0]).toMatchObject({
      id: 'dlbcl.uk',
      disease_id: 'dlbcl',
      language: 'uk',
    })
    expect(rows.disease_articles[0]?.body).toContain('ДЕМО')
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
      // The demo set carries an NCCN section in Ukrainian only, on purpose.
      expect.objectContaining({ table: 'disease_articles', id: 'dlbcl.nccn' }),
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
      expect.stringMatching(/^drugs\/c\.json: presentations.0.strength_amount/),
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
  const errors = (rows: SyncRows) =>
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

  it('refuses units that do not match the drug', () => {
    const rows = loadDemo()
    const bleomycin = { ...rows.drugs[0]!, id: 'bleomycin', amount_unit: 'iu' as const }
    rows.drugs.push(bleomycin)
    rows.drug_presentations.push({
      ...rows.drug_presentations[0]!,
      id: 'bleomycin.vial',
      drug_id: 'bleomycin',
      strength_amount: 15,
      strength_unit: 'mg',
    })
    rows.drug_infusion_params.push({
      ...rows.drug_infusion_params[0]!,
      id: 'bleomycin.nacl',
      drug_id: 'bleomycin',
      concentration_max_mg_ml: 4,
    })
    rows.regimen_items.push({
      ...rows.regimen_items[0]!,
      id: 'r-chop-21.bleomycin',
      drug_id: 'bleomycin',
      dose_unit: 'mg_m2',
    })

    expect(errors(rows)).toEqual([
      'drug_presentations bleomycin.vial: strength in mg, but bleomycin is measured in iu and states no equivalence between mass and activity',
      'drug_infusion_params bleomycin.nacl: mg/mL parameters cannot describe bleomycin, which is measured in iu',
      'regimen_items r-chop-21.bleomycin: dose_unit "mg_m2" does not match bleomycin, which is measured in iu and states no equivalence between mass and activity',
    ])
  })

  it('lets mass and activity cross only for a drug whose label says what it is worth', () => {
    const rows = loadDemo()
    // Filgrastim is sold as 300 mcg and as 30 million IU: the same syringe, both numbers printed.
    const filgrastim = {
      ...rows.drugs[0]!,
      id: 'filgrastim',
      amount_unit: 'mcg' as const,
      dose_units: [],
      unit_equivalence: {
        amount: 300,
        amount_unit: 'mcg' as const,
        activity: 30,
        activity_unit: 'miu' as const,
      },
    }
    rows.drugs.push(filgrastim)
    rows.regimen_items.push({
      ...rows.regimen_items[0]!,
      id: 'r-chop-21.filgrastim',
      drug_id: 'filgrastim',
      dose_unit: 'miu_flat',
    })

    expect(errors(rows)).toEqual([])
  })

  it('holds a drug to the units it is officially prescribed in', () => {
    const rows = loadDemo()
    rows.drugs.find((drug) => drug.id === 'prednisolone')!.dose_units = ['mg_m2']
    expect(errors(rows)).toEqual([
      'regimen_items r-chop-21.prednisolone: dose_unit "mg_flat" is not one of the units prednisolone is prescribed in (mg_m2)',
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

  it('accepts several doses from one document and rejects a repeated or unnamed one', () => {
    const rows = loadDemo()
    const item = rows.regimen_items.find((row) => row.id === 'r-chop-21.prednisolone')!
    const source = { name: 'ДЕМО: один протокол', checkedOn: '2026-09-19' }
    item.dose_options = [
      { dose_value: 60, dose_unit: 'mg_m2', cap_amount: null, notes: { uk: 'Старші 70' }, source },
      { dose_value: 80, dose_unit: 'mg_m2', cap_amount: null, notes: { uk: 'До 70' }, source },
    ]
    expect(checkCatalog(rows).filter((issue) => issue.severity === 'error')).toEqual([])

    item.dose_options[1]!.notes = null
    expect(checkCatalog(rows).map((issue) => issue.message)).toContain(
      'dose_options: "ДЕМО: один протокол" gives several doses, each needs a note to tell them apart',
    )

    item.dose_options = [
      { dose_value: 60, dose_unit: 'mg_m2', cap_amount: null, notes: null, source },
      { dose_value: 60, dose_unit: 'mg_m2', cap_amount: null, notes: null, source },
    ]
    expect(checkCatalog(rows).map((issue) => issue.message)).toContain(
      'dose_options: the same dose listed twice',
    )

    item.dose_options = [
      {
        dose_value: item.dose_value,
        dose_unit: item.dose_unit,
        cap_amount: null,
        notes: null,
        source,
      },
    ]
    expect(checkCatalog(rows).map((issue) => issue.message)).toContain(
      "dose_options: an alternative repeats the item's own dose",
    )
  })

  it('keeps a regimen whose drug cannot be obtained and names the drug', () => {
    const rows = loadDemo()
    rows.drugs.find((drug) => drug.id === 'rituximab')!.availability = 'unavailable'
    const issues = checkCatalog(rows)
    expect(issues.filter((issue) => issue.severity === 'error')).toEqual([])
    expect(issues.map((issue) => issue.message)).toContain('drugs not obtainable: rituximab')
  })

  it('notices a regimen no disease page leads to, and a line with nothing in it', () => {
    const rows = loadDemo()
    // The disease pages are the only way in: unlink the regimen and it becomes unreachable,
    // which is how R-CHOP came to be missing from the first line of DLBCL for weeks.
    rows.treatment_node_regimens = []
    const messages = checkCatalog(rows).map((issue) => issue.message)
    expect(messages).toContain('reachable from no treatment node')
    expect(messages).toContain('has neither regimens nor child nodes')
  })

  it('refuses to prune when the articles were never loaded', () => {
    // Articles live outside this repository; a prune run without them reads as "every article
    // was deleted" and empties the table, with nothing here to restore it from.
    const blind = contentOptions(new Map(), 'data')
    expect(prunesArticlesBlind(true, blind)).toBe(true)
    expect(prunesArticlesBlind(false, blind)).toBe(false)
    expect(prunesArticlesBlind(true, contentOptions(new Map([['content', '../x']]), 'data'))).toBe(
      false,
    )
    // A demo set carries its own articles, so there is nothing to lose.
    expect(prunesArticlesBlind(true, contentOptions(new Map(), 'data-demo'))).toBe(false)
  })

  it('reports an article the contents cannot be built from', () => {
    const rows = loadDemo()
    const article = rows.disease_articles[0]!
    article.body = `# Діагностика
${'текст '.repeat(400)}
# Діагностика
ще`
    const messages = checkCatalog(rows).map((issue) => issue.message)
    expect(messages).toContain(
      'two headings called "Діагностика": the contents leads to the first one',
    )

    article.body = 'текст '.repeat(400)
    expect(checkCatalog(rows).map((issue) => issue.message)).toContain(
      'long article with fewer than two headings: no contents is built for it',
    )
  })

  it('catches a note still saying a drug is missing after it was added', () => {
    // The note is prose, so nothing else would notice; and a physician who reads it goes and
    // prescribes the drug by hand when the course could have carried it.
    const rows = loadDemo()
    const drug = rows.drugs[0]!
    const name = (drug.name as Record<string, string>).uk ?? ''
    const regimen = rows.regimens[0]!
    regimen.description = {
      uk: `Профілактика — ${name} 480 мг тричі на тиждень, якого в довіднику немає.`,
    }

    expect(checkCatalog(rows).map((issue) => issue.message)).toContain(
      `says ${drug.id} is not in the catalog, but it is`,
    )
  })

  it('leaves alone a note saying the drug is there but the regimen is not', () => {
    const rows = loadDemo()
    const drug = rows.drugs[0]!
    const name = (drug.name as Record<string, string>).uk ?? ''
    const node = rows.treatment_nodes[0]!
    node.description = { uk: `При резистентності — ${name} (у довіднику є, схеми ще немає).` }

    expect(checkCatalog(rows).map((issue) => issue.message)).not.toContain(
      `says ${drug.id} is not in the catalog, but it is`,
    )
  })

  it('asks nothing of a group node, which carries advice rather than regimens', () => {
    const rows = loadDemo()
    const node = rows.treatment_nodes[0]!
    node.kind = 'group'
    rows.treatment_node_regimens = rows.treatment_node_regimens.filter(
      (link) => link.node_id !== node.id,
    )
    expect(
      checkCatalog(rows).filter(
        (issue) => issue.id === node.id && issue.message.startsWith('has neither'),
      ),
    ).toEqual([])
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
      'disease_articles',
    ])
    expect(sql.startsWith('-- Generated')).toBe(true)
    expect(sql).toMatch(/^begin;$[\s\S]*^commit;$/m)
    expect(sql).toContain('on conflict (id) do update set name = excluded.name,')
    expect(sql).not.toContain('delete from')
  })

  it('deletes stale rows children-first only with prune', () => {
    const sql = catalogToSql(loadDemo(), { prune: true })
    const deletes = [...sql.matchAll(/^delete from public\.(\w+)/gm)].map((match) => match[1])
    expect(deletes[0]).toBe('disease_articles')
    expect(deletes.at(-1)).toBe('classification_systems')
    expect(sql.indexOf('delete from')).toBeGreaterThan(sql.lastIndexOf('insert into'))
  })

  it('refuses data that would break the dollar quoting', () => {
    const rows = loadDemo()
    rows.hospitals[0]!.address = 'x $catalog$ y'
    expect(() => catalogToSql(rows, { prune: false })).toThrow(/contains \$catalog\$/)
  })

  it('refuses rows of one table that do not carry the same columns', () => {
    // The column list comes from the first row; a row that disagrees would silently lose a
    // column on the way into the live database, so it has to fail here instead.
    const rows = loadDemo()
    const first = rows.drugs[0]
    expect(first).toBeDefined()
    const { availability: _dropped, ...withoutColumn } = first!
    rows.drugs = [first!, withoutColumn as SyncRows['drugs'][number]]
    expect(() => catalogToSql(rows, { prune: false })).toThrow(/expected/)
  })
})
