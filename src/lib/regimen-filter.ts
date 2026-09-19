import type { Regimen } from '../schemas/catalog'
import { regimenAvailability } from './availability'
import type { CatalogIndex } from './catalog-index'

export interface RegimenFilter {
  /** Show only the regimens that treat this disease; null shows every regimen. */
  diseaseId: string | null
  /** Hide the regimens that contain a drug the department cannot obtain. */
  onlyObtainable: boolean
}

export const NO_REGIMEN_FILTER: RegimenFilter = { diseaseId: null, onlyObtainable: false }

/** Diseases each regimen is listed under in the treatment trees. */
export function diseasesByRegimen(catalog: CatalogIndex): Map<string, Set<string>> {
  const diseases = new Map<string, Set<string>>()
  for (const node of catalog.rows.treatment_nodes) {
    for (const link of catalog.regimenLinksByNode.get(node.id) ?? []) {
      const known = diseases.get(link.regimen_id)
      if (known) known.add(node.disease_id)
      else diseases.set(link.regimen_id, new Set([node.disease_id]))
    }
  }
  return diseases
}

/**
 * The regimens to offer in the calculator, in catalog order. A regimen with a drug that
 * cannot be obtained is still offered unless the physician asks to hide it — the dose table
 * marks the drug, and a course is often given without one supportive line.
 */
export function filterRegimens(catalog: CatalogIndex, filter: RegimenFilter): Regimen[] {
  const diseases = filter.diseaseId === null ? null : diseasesByRegimen(catalog)
  return [...catalog.regimens.values()]
    .filter((regimen) => {
      if (diseases !== null && !diseases.get(regimen.id)?.has(filter.diseaseId!)) return false
      return !filter.onlyObtainable || regimenAvailability(catalog, regimen.id) !== 'unavailable'
    })
    .sort((a, b) => a.sort_order - b.sort_order || a.short_name.localeCompare(b.short_name))
}
