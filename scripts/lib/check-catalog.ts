import { CATALOG_TABLES, catalogRowSchemas, type CatalogRows } from '../../src/schemas/catalog'

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
export function checkCatalog(rows: CatalogRows): CatalogIssue[] {
  const issues: CatalogIssue[] = []
  const error = (table: string, id: string, message: string) =>
    issues.push({ severity: 'error', table, id, message })
  const warning = (table: string, id: string, message: string) =>
    issues.push({ severity: 'warning', table, id, message })

  for (const table of CATALOG_TABLES) {
    const seen = new Set<string>()
    for (const row of rows[table]) {
      const result = catalogRowSchemas[table].safeParse(row)
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

  for (const regimen of rows.regimens) {
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
