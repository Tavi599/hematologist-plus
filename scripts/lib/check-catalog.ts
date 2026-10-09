import { amountUnitOf, isMassUnit, sameFamily } from '../../src/domain'
import { SYNC_TABLES, syncRowSchemas, type SyncRows } from '../../src/schemas/catalog'
import { articleHeadings } from '../../src/pages/DiseaseDetailPage/headings'
import type { DoseUnit } from '../../src/domain'

export interface CatalogIssue {
  severity: 'error' | 'warning'
  table: string
  id: string
  message: string
}

/**
 * Validates rows against the row schemas and checks what the database would reject
 * (references, uniqueness) plus gaps that block a full calculation (warnings).
 */
export function checkCatalog(rows: SyncRows): CatalogIssue[] {
  const issues: CatalogIssue[] = []
  const error = (table: string, id: string, message: string) =>
    issues.push({ severity: 'error', table, id, message })
  const warning = (table: string, id: string, message: string) =>
    issues.push({ severity: 'warning', table, id, message })

  for (const table of SYNC_TABLES) {
    const seen = new Set<string>()
    for (const row of rows[table]) {
      const result = syncRowSchemas[table].safeParse(row)
      if (!result.success) {
        for (const issue of result.error.issues) {
          error(table, row.id, `${issue.path.join('.') || '(row)'}: ${issue.message}`)
        }
      }
      if (seen.has(row.id)) error(table, row.id, 'duplicate id')
      seen.add(row.id)
    }
  }

  const ids = <T extends { id: string }>(list: T[]) => new Map(list.map((row) => [row.id, row]))
  const drugs = ids(rows.drugs)
  const infusionParams = ids(rows.drug_infusion_params)
  const regimens = ids(rows.regimens)
  const items = ids(rows.regimen_items)
  const systems = ids(rows.classification_systems)
  const diseases = ids(rows.diseases)
  const nodes = ids(rows.treatment_nodes)

  const missing = (table: string, id: string, column: string, target: string, value: string) =>
    error(table, id, `${column} "${value}" does not exist in ${target}`)

  const defaultHospitals = rows.hospitals.filter((hospital) => hospital.is_default)
  if (defaultHospitals.length > 1) {
    error('hospitals', defaultHospitals.map((h) => h.id).join(', '), 'only one default hospital')
  }

  for (const row of rows.drug_presentations) {
    if (!drugs.has(row.drug_id))
      missing('drug_presentations', row.id, 'drug_id', 'drugs', row.drug_id)
  }

  const defaultParamsByDrug = new Map<string, number>()
  for (const row of rows.drug_infusion_params) {
    if (!drugs.has(row.drug_id)) {
      missing('drug_infusion_params', row.id, 'drug_id', 'drugs', row.drug_id)
    }
    if (row.is_default) {
      defaultParamsByDrug.set(row.drug_id, (defaultParamsByDrug.get(row.drug_id) ?? 0) + 1)
    }
  }
  for (const [drugId, count] of defaultParamsByDrug) {
    if (count > 1) error('drug_infusion_params', drugId, 'only one default per drug')
  }

  const presentationCount = countBy(rows.drug_presentations, (row) => row.drug_id)
  for (const drug of rows.drugs) {
    if (!presentationCount.has(drug.id)) {
      warning('drugs', drug.id, 'no presentations: vial/tablet counts cannot be calculated')
    }
  }

  // Units must line up: a pack in IU cannot fill a dose in mg, and mg/mL dilution limits
  // say nothing about a drug measured in units of biological activity.
  for (const row of rows.drug_presentations) {
    const drug = drugs.get(row.drug_id)
    if (drug && !sameFamily(row.strength_unit, drug.amount_unit) && !drug.unit_equivalence) {
      error(
        'drug_presentations',
        row.id,
        `strength in ${row.strength_unit}, but ${drug.id} is measured in ${drug.amount_unit} and states no equivalence between mass and activity`,
      )
    }
  }
  for (const row of rows.drug_infusion_params) {
    const drug = drugs.get(row.drug_id)
    const usesMgPerMl =
      row.concentration_min_mg_ml !== null ||
      row.concentration_max_mg_ml !== null ||
      row.stock_concentration_mg_ml !== null
    if (drug && usesMgPerMl && !isMassUnit(drug.amount_unit)) {
      error(
        'drug_infusion_params',
        row.id,
        `mg/mL parameters cannot describe ${drug.id}, which is measured in ${drug.amount_unit}`,
      )
    }
  }
  const checkDoseUnit = (itemId: string, field: string, unit: DoseUnit, drugId: string) => {
    const drug = drugs.get(drugId)
    if (!drug) return
    if (drug.dose_units.length > 0 && !drug.dose_units.includes(unit)) {
      error(
        'regimen_items',
        itemId,
        `${field} "${unit}" is not one of the units ${drug.id} is prescribed in (${drug.dose_units.join(', ')})`,
      )
      return
    }
    if (unit === 'auc') {
      if (drug.amount_unit !== 'mg') {
        error('regimen_items', itemId, `${field}: the Calvert formula is milligrams only`)
      }
      return
    }
    if (!sameFamily(amountUnitOf(unit), drug.amount_unit) && !drug.unit_equivalence) {
      error(
        'regimen_items',
        itemId,
        `${field} "${unit}" does not match ${drug.id}, which is measured in ${drug.amount_unit} and states no equivalence between mass and activity`,
      )
    }
  }
  for (const item of rows.regimen_items) {
    checkDoseUnit(item.id, 'dose_unit', item.dose_unit, item.drug_id)
    item.dose_options.forEach((option, index) => {
      checkDoseUnit(item.id, `dose_options.${index}.dose_unit`, option.dose_unit, item.drug_id)
    })
  }

  for (const item of rows.regimen_items) {
    if (!regimens.has(item.regimen_id)) {
      missing('regimen_items', item.id, 'regimen_id', 'regimens', item.regimen_id)
    }
    if (!drugs.has(item.drug_id)) {
      missing('regimen_items', item.id, 'drug_id', 'drugs', item.drug_id)
    }
    if (item.infusion_params_id !== null) {
      const params = infusionParams.get(item.infusion_params_id)
      if (!params) {
        missing(
          'regimen_items',
          item.id,
          'infusion_params_id',
          'drug_infusion_params',
          item.infusion_params_id,
        )
      } else if (params.drug_id !== item.drug_id) {
        error('regimen_items', item.id, `infusion params belong to drug "${params.drug_id}"`)
      }
    }
    if (item.route === 'iv_infusion') {
      const drugParams = rows.drug_infusion_params.filter((p) => p.drug_id === item.drug_id)
      const hasParams =
        item.infusion_params_id !== null ||
        drugParams.some((p) => p.is_default) ||
        drugParams.length === 1
      if (!hasParams && drugParams.length > 1) {
        warning('regimen_items', item.id, 'drug has several infusion params but none is default')
      } else if (!hasParams && item.fallback_volume_ml === null) {
        warning(
          'regimen_items',
          item.id,
          'no infusion params and no fallback_volume_ml: solvent volume cannot be calculated',
        )
      }
    }
  }

  for (const item of rows.regimen_items) {
    // One document often writes several doses for one drug — a phase of the disease, a platelet
    // count, another indication. What must not repeat is the dose itself: the physician picks an
    // alternative by its value, and two equal values would be the same line twice.
    const doses = item.dose_options.map((option) => `${option.dose_value} ${option.dose_unit}`)
    if (new Set(doses).size !== doses.length) {
      error('regimen_items', item.id, 'dose_options: the same dose listed twice')
    }
    if (doses.includes(`${item.dose_value} ${item.dose_unit}`)) {
      error('regimen_items', item.id, "dose_options: an alternative repeats the item's own dose")
    }
    // Modifiers are ticked, not picked, so each needs an identity of its own. Their doses may
    // coincide — two circumstances can lead to the same milligrams — but the keys may not.
    const modifierKeys = item.dose_modifiers.map((modifier) => modifier.key)
    if (new Set(modifierKeys).size !== modifierKeys.length) {
      error('regimen_items', item.id, 'dose_modifiers: two modifiers share a key')
    }
    // Two doses from one document are told apart by their note; without it the picker shows the
    // name of that document twice.
    const byName = new Map<string, number>()
    for (const option of item.dose_options) {
      byName.set(option.source.name, (byName.get(option.source.name) ?? 0) + 1)
    }
    for (const option of item.dose_options) {
      if ((byName.get(option.source.name) ?? 0) > 1 && option.notes === null) {
        error(
          'regimen_items',
          item.id,
          `dose_options: "${option.source.name}" gives several doses, each needs a note to tell them apart`,
        )
      }
    }
  }

  // A regimen is kept even when a drug cannot be obtained; the report says which ones.
  const drugById = new Map(rows.drugs.map((drug) => [drug.id, drug]))
  const blockedByRegimen = new Map<string, string[]>()
  for (const item of rows.regimen_items) {
    if (drugById.get(item.drug_id)?.availability !== 'unavailable') continue
    blockedByRegimen.set(item.regimen_id, [
      ...(blockedByRegimen.get(item.regimen_id) ?? []),
      item.drug_id,
    ])
  }
  for (const [regimenId, drugIds] of blockedByRegimen) {
    warning('regimens', regimenId, `drugs not obtainable: ${[...new Set(drugIds)].join(', ')}`)
  }

  // The trial section is a shortlist of what can actually be given here: a study regimen with a
  // drug that cannot be obtained in Ukraine does not belong in it, however good the study.
  const nodeById = new Map(rows.treatment_nodes.map((node) => [node.id, node]))
  const inTrialSection = (nodeId: string): boolean => {
    // A broken tree can loop; the cycle is reported below, here it only must not hang.
    const seen = new Set<string>()
    for (let node = nodeById.get(nodeId); node && !seen.has(node.id);) {
      if (node.kind === 'trial') return true
      seen.add(node.id)
      node = nodeById.get(node.parent_id ?? '')
    }
    return false
  }
  for (const link of rows.treatment_node_regimens) {
    const blocked = blockedByRegimen.get(link.regimen_id)
    if (blocked && inTrialSection(link.node_id)) {
      error(
        'treatment_node_regimens',
        link.id,
        `trial section lists "${link.regimen_id}" with drugs not obtainable: ${[...new Set(blocked)].join(', ')}`,
      )
    }
  }

  // The disease pages are the only way into a regimen, so one that hangs off no node is
  // invisible: it exists, it validates, and no physician can reach it. The same the other way
  // round — an empty line in the tree reads as "nothing is used here", which is never true.
  const linkedRegimens = new Set(rows.treatment_node_regimens.map((link) => link.regimen_id))
  for (const regimen of rows.regimens) {
    if (!linkedRegimens.has(regimen.id)) {
      warning('regimens', regimen.id, 'reachable from no treatment node')
    }
  }
  const nodesWithRegimens = new Set(rows.treatment_node_regimens.map((link) => link.node_id))
  const parentNodes = new Set(
    rows.treatment_nodes.map((node) => node.parent_id).filter((id) => id !== null),
  )
  for (const node of rows.treatment_nodes) {
    // A `group` is a heading or a block of advice — monitoring targets, what every patient gets —
    // and carries its content in its description, so it owes no regimen. Every other kind names a
    // line or a stage of treatment, and an empty one reads as "nothing is used here".
    if (node.kind === 'group') continue
    if (!nodesWithRegimens.has(node.id) && !parentNodes.has(node.id)) {
      warning('treatment_nodes', node.id, 'has neither regimens nor child nodes')
    }
  }

  // A note that says a drug is not in the catalog is advice to go and prescribe it elsewhere.
  // Once the drug is added, that sentence quietly becomes a lie, and nothing else would catch it:
  // the note is prose, and prose validates. So: a sentence claiming something is missing must not
  // name a drug the catalog has.
  const ABSENT_CLAIM =
    /(у|в) довіднику[^.;]{0,40}(нема|відсутн)|(нема|відсутн)[^.;]{0,30}(у|в) довіднику|not in the catalog|is not in the catalog/i
  const drugNames = rows.drugs.flatMap((drug) =>
    Object.values(drug.name as Record<string, string>)
      .filter((name) => name.length >= 5)
      .map((name) => ({ id: drug.id, name: name.toLowerCase() })),
  )
  // Two things are said in the same breath and must not be mistaken for the claim: that the drug
  // is there but has no regimen yet, and that a form of it is missing — eye drops of a steroid the
  // catalog carries as an injection.
  const NOT_THE_CLAIM = /довіднику є|довідник\w* відділення є|in the catalog\w*,? but|крапл|drops/i
  for (const { table, id, text } of localizedTexts(rows)) {
    for (const sentence of text.split(/(?<=[.;])\s+/)) {
      if (!ABSENT_CLAIM.test(sentence) || NOT_THE_CLAIM.test(sentence)) continue
      const lower = sentence.toLowerCase()
      for (const drug of drugNames) {
        if (lower.includes(drug.name)) {
          warning(table, id, `says ${drug.id} is not in the catalog, but it is`)
        }
      }
    }
  }

  // Article text lives outside this repository, so nothing else looks at it. These checks run
  // wherever it is loaded — a local run with --content, and the demo set in CI.
  const LONG_ENOUGH_TO_NEED_CONTENTS = 2000
  const articleLanguages = new Map<string, string[]>()
  for (const article of rows.disease_articles) {
    const key = `${article.disease_id}.${article.section}`
    articleLanguages.set(key, [...(articleLanguages.get(key) ?? []), article.language])

    const headings = articleHeadings(article.body)
    if (article.body.length >= LONG_ENOUGH_TO_NEED_CONTENTS && headings.length < 2) {
      warning(
        'disease_articles',
        article.id,
        'long article with fewer than two headings: no contents is built for it',
      )
    }
    const seenIds = new Set<string>()
    for (const heading of headings) {
      if (seenIds.has(heading.id)) {
        warning(
          'disease_articles',
          article.id,
          `two headings called "${heading.text}": the contents leads to the first one`,
        )
      }
      seenIds.add(heading.id)
    }
  }
  for (const [key, languages] of articleLanguages) {
    if (languages.length === 1) {
      warning('disease_articles', key, `written in ${languages[0]} only`)
    }
  }

  for (const regimen of rows.regimens) {
    if (regimen.reference !== null && regimen.reference !== undefined) {
      if (regimen.sources.length === 0) {
        error('regimens', regimen.id, 'a described course must cite its source')
      }
      if (rows.regimen_items.some((item) => item.regimen_id === regimen.id)) {
        error('regimens', regimen.id, 'a described course carries no items')
      }
      for (const drug of regimen.reference.drugs) {
        if (drug.drug_id !== undefined && !drugById.has(drug.drug_id)) {
          error('regimens', regimen.id, `reference drug "${drug.drug_id}" is not in the catalog`)
        }
      }
    }
    const forms = regimen.print_forms?.forms ?? []
    for (const form of forms) {
      for (const itemId of form.itemIds) {
        const item = items.get(itemId)
        if (!item || item.regimen_id !== regimen.id) {
          error(
            'regimens',
            regimen.id,
            `print form "${form.id}" references unknown item "${itemId}"`,
          )
        }
      }
    }
    // A regimen that comes from a study has to name the study and say how good it is: it is
    // given off-label, and the physician decides on exactly these two things.
    if (regimen.evidence !== null && regimen.evidence !== undefined) {
      if (regimen.sources.length === 0) {
        error('regimens', regimen.id, 'a regimen from a study must cite its source')
      }
      if (regimen.evidence.appraisal.length === 0) {
        warning('regimens', regimen.id, 'no appraisal of the publication behind this regimen')
      }
      for (const entry of regimen.evidence.appraisal) {
        if (entry.sources.length === 0) {
          warning(
            'regimens',
            regimen.id,
            `appraisal of "${entry.publication}" does not say where its indicators were read`,
          )
        }
      }
      if (regimen.evidence.settings.length === 0) {
        warning('regimens', regimen.id, 'no clinical setting: a search by situation misses it')
      }
      // A refuted combination is a warning, not a course: the calculator must never offer it.
      if (regimen.evidence.verdict === 'avoid' && (regimen.reference ?? null) === null) {
        error('regimens', regimen.id, 'a regimen to avoid must be a reference card, not a course')
      }
    }
  }

  const naturalCodeKeys = new Set<string>()
  for (const code of rows.disease_codes) {
    if (!diseases.has(code.disease_id)) {
      missing('disease_codes', code.id, 'disease_id', 'diseases', code.disease_id)
    }
    if (!systems.has(code.system_id)) {
      missing('disease_codes', code.id, 'system_id', 'classification_systems', code.system_id)
    }
    const key = `${code.disease_id}|${code.system_id}|${code.code}`
    if (naturalCodeKeys.has(key)) error('disease_codes', code.id, 'duplicate code for disease')
    naturalCodeKeys.add(key)
  }

  for (const node of rows.treatment_nodes) {
    if (!diseases.has(node.disease_id)) {
      missing('treatment_nodes', node.id, 'disease_id', 'diseases', node.disease_id)
    }
    if (node.parent_id !== null) {
      const parent = nodes.get(node.parent_id)
      if (!parent) {
        missing('treatment_nodes', node.id, 'parent_id', 'treatment_nodes', node.parent_id)
      } else if (parent.disease_id !== node.disease_id) {
        error('treatment_nodes', node.id, 'parent belongs to another disease')
      }
    }
    if (hasCycle(node.id, nodes)) error('treatment_nodes', node.id, 'parent chain forms a cycle')
  }

  const linkKeys = new Set<string>()
  for (const link of rows.treatment_node_regimens) {
    if (!nodes.has(link.node_id)) {
      missing('treatment_node_regimens', link.id, 'node_id', 'treatment_nodes', link.node_id)
    }
    if (!regimens.has(link.regimen_id)) {
      missing('treatment_node_regimens', link.id, 'regimen_id', 'regimens', link.regimen_id)
    }
    const key = `${link.node_id}|${link.regimen_id}`
    if (linkKeys.has(key)) error('treatment_node_regimens', link.id, 'regimen linked twice')
    linkKeys.add(key)
  }

  return issues
}

function countBy<T>(list: T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const item of list) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1)
  return counts
}

function hasCycle(startId: string, nodes: Map<string, { parent_id: string | null }>): boolean {
  const visited = new Set<string>()
  let current: string | null = startId
  while (current !== null) {
    if (visited.has(current)) return true
    visited.add(current)
    current = nodes.get(current)?.parent_id ?? null
  }
  return false
}

/**
 * Every piece of prose the catalog carries, with the row it belongs to: notes, descriptions and
 * summaries, in every language they are written in. Used to check prose against the data it
 * describes, which nothing else does.
 */
function* localizedTexts(rows: SyncRows): Generator<{ table: string; id: string; text: string }> {
  const fields: [string, { id: string; [key: string]: unknown }[], string[]][] = [
    ['drugs', rows.drugs, ['notes']],
    ['regimens', rows.regimens, ['description']],
    ['regimen_items', rows.regimen_items, ['notes']],
    ['treatment_nodes', rows.treatment_nodes, ['description']],
    ['diseases', rows.diseases, ['summary']],
  ]
  for (const [table, list, keys] of fields) {
    for (const row of list) {
      for (const key of keys) {
        const value = row[key]
        if (value === null || typeof value !== 'object') continue
        for (const text of Object.values(value as Record<string, string>)) {
          if (typeof text === 'string' && text !== '') yield { table, id: row.id, text }
        }
      }
    }
  }
}
