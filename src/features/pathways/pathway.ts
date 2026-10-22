import type { CatalogIndex } from '../../lib/catalog-index'
import type { TreatmentNode, TreatmentNodeRegimen } from '../../schemas/catalog'
import {
  RECOMMENDATION_PREFERENCES,
  type PathwayColumn,
  type PathwayStep,
  type RecommendationPreference,
} from '../../schemas/common'

/**
 * A guideline pathway laid out as its pages and rows.
 *
 * The pathway root holds pages (induction, consolidation, …); a page holds rows (a risk group, a
 * situation). A row is any node with something to show — regimens or steps — and a node with only
 * children is a heading over the rows beneath it, carried in the row's trail. A page that has
 * regimens or steps of its own is a row too: the steps that apply to the whole page.
 */
export interface PathwayRow {
  node: TreatmentNode
  /** Headings between the page and the row, outermost first. */
  trail: TreatmentNode[]
  /** The row is the page itself: what applies to every row of it. */
  isPage: boolean
}

export interface PathwayPage {
  node: TreatmentNode
  rows: PathwayRow[]
}

function hasContent(catalog: CatalogIndex, node: TreatmentNode): boolean {
  return node.steps.length > 0 || (catalog.regimenLinksByNode.get(node.id) ?? []).length > 0
}

export function pathwayPages(catalog: CatalogIndex, root: TreatmentNode): PathwayPage[] {
  return (catalog.childNodes.get(root.id) ?? []).map((page) => {
    const rows: PathwayRow[] = []
    if (hasContent(catalog, page)) rows.push({ node: page, trail: [], isPage: true })
    const walk = (node: TreatmentNode, trail: TreatmentNode[]) => {
      for (const child of catalog.childNodes.get(node.id) ?? []) {
        if (hasContent(catalog, child)) rows.push({ node: child, trail, isPage: false })
        walk(child, [...trail, child])
      }
    }
    walk(page, [])
    return { node: page, rows }
  })
}

/** The page of the pathway a node sits on, or null when the node is not under this root. */
export function pageOf(catalog: CatalogIndex, rootId: string, nodeId: string): string | null {
  let current = catalog.treatmentNodes.get(nodeId)
  while (current) {
    if (current.parent_id === rootId) return current.id
    current = current.parent_id === null ? undefined : catalog.treatmentNodes.get(current.parent_id)
  }
  return null
}

export interface RankedGroup {
  preference: RecommendationPreference | null
  links: TreatmentNodeRegimen[]
  steps: PathwayStep[]
}

/**
 * The treatment column in the guideline's order: preferred, other recommended, useful in certain
 * circumstances, then whatever carries no rank. Empty groups are left out.
 */
export function rankedTreatment(
  links: readonly TreatmentNodeRegimen[],
  steps: readonly PathwayStep[],
): RankedGroup[] {
  const treatmentSteps = stepsIn(steps, 'treatment')
  return [...RECOMMENDATION_PREFERENCES, null]
    .map((preference) => ({
      preference,
      links: links.filter((link) => link.preference === preference),
      steps: treatmentSteps.filter((step) => step.preference === preference),
    }))
    .filter((group) => group.links.length > 0 || group.steps.length > 0)
}

export function stepsIn(steps: readonly PathwayStep[], column: PathwayColumn): PathwayStep[] {
  return steps.filter((step) => step.column === column)
}

/** Anchor of a row on the page, for arrows that land on it. */
export const rowAnchor = (nodeId: string) => `pathway-${nodeId.replace(/[^a-z0-9-]/gi, '-')}`
