import type { CatalogIndex } from '../../lib/catalog-index'
import type { Drug, TreatmentNode, TreatmentNodeRegimen } from '../../schemas/catalog'

/**
 * Narrowing a disease's treatment tree down to the regimens that use given drugs.
 *
 * Myeloma alone offers forty-odd regimens across its lines, and the trial section keeps growing.
 * Reading that list to find the ones built on the drug in front of you is slower than it should
 * be, so the physician names the drugs and the rest of the tree goes away.
 *
 * A regimen has to carry **every** drug named, not merely one of them: naming a second drug is
 * how the list is narrowed, and a filter that widened it would be useless for that.
 */

export interface FilteredNode {
  node: TreatmentNode
  links: TreatmentNodeRegimen[]
  children: FilteredNode[]
}

/** The drugs of a regimen: its items, or for a described course the drugs its card names. */
function regimenDrugIds(catalog: CatalogIndex, regimenId: string): Set<string> {
  const ids = new Set((catalog.itemsByRegimen.get(regimenId) ?? []).map((item) => item.drug_id))
  for (const drug of catalog.regimens.get(regimenId)?.reference?.drugs ?? []) {
    if (drug.drug_id !== undefined) ids.add(drug.drug_id)
  }
  return ids
}

export function regimenHasDrugs(
  catalog: CatalogIndex,
  regimenId: string,
  drugIds: readonly string[],
): boolean {
  if (drugIds.length === 0) return true
  const named = regimenDrugIds(catalog, regimenId)
  return drugIds.every((drugId) => named.has(drugId))
}

/**
 * The drugs the disease's own regimens use, in alphabetical order of the reader's language — the
 * only drugs worth offering, since every other one would empty the tree.
 */
export function drugsInTree(
  catalog: CatalogIndex,
  diseaseId: string,
  label: (drug: Drug) => string,
): { drug: Drug; label: string }[] {
  const found = new Map<string, Drug>()
  for (const regimenId of regimensInTree(catalog, diseaseId)) {
    for (const drugId of regimenDrugIds(catalog, regimenId)) {
      const drug = catalog.drugs.get(drugId)
      if (drug) found.set(drug.id, drug)
    }
  }
  return [...found.values()]
    .map((drug) => ({ drug, label: label(drug) }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

/**
 * The tree with everything that leads to no matching regimen taken out. A node survives on its own
 * regimens or on a surviving child: a line whose every regimen was filtered away is not a heading
 * worth printing. With nothing selected the tree comes back whole.
 */
export function filterTree(
  catalog: CatalogIndex,
  diseaseId: string,
  drugIds: readonly string[],
): FilteredNode[] {
  const roots = catalog.rootNodesByDisease.get(diseaseId) ?? []
  return roots.flatMap((node) => keep(catalog, node, drugIds))
}

/** How many regimens the tree is showing — what the filter's own caption counts. */
export function countRegimens(nodes: readonly FilteredNode[]): number {
  return nodes.reduce((total, node) => total + node.links.length + countRegimens(node.children), 0)
}

function keep(
  catalog: CatalogIndex,
  node: TreatmentNode,
  drugIds: readonly string[],
): FilteredNode[] {
  const links = (catalog.regimenLinksByNode.get(node.id) ?? []).filter((link) =>
    regimenHasDrugs(catalog, link.regimen_id, drugIds),
  )
  const children = (catalog.childNodes.get(node.id) ?? []).flatMap((child) =>
    keep(catalog, child, drugIds),
  )
  // Unfiltered, a node with neither regimens nor children is still a heading with advice under it
  // and belongs on the page; filtered, it answers nothing that was asked.
  if (drugIds.length > 0 && links.length === 0 && children.length === 0) return []
  return [{ node, links, children }]
}

function regimensInTree(catalog: CatalogIndex, diseaseId: string): Set<string> {
  const found = new Set<string>()
  const walk = (node: TreatmentNode): void => {
    for (const link of catalog.regimenLinksByNode.get(node.id) ?? []) found.add(link.regimen_id)
    for (const child of catalog.childNodes.get(node.id) ?? []) walk(child)
  }
  for (const root of catalog.rootNodesByDisease.get(diseaseId) ?? []) walk(root)
  return found
}
