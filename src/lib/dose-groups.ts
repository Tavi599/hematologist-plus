import type { CourseItem } from './course-input'

/**
 * The blocks a prescription sheet is read in:
 *   premedicated — a drug that needs premedication, together with that premedication
 *   chemo        — the other chemotherapy and antibodies
 *   day_support  — support given on the infusion day, timed from the cytostatic
 *   ward         — support on the inpatient sheet, with no hourly placement
 */
export type DoseGroupKind = 'premedicated' | 'chemo' | 'day_support' | 'ward'

export interface DoseGroup {
  kind: DoseGroupKind
  /** Unique within one course: several drugs may each carry their own premedication. */
  key: string
  items: CourseItem[]
}

/**
 * Splits the course into the blocks above, keeping the administration order. Premedication is
 * kept with the drug it precedes, so the physician sees why it is there.
 */
export function groupCourseItems(items: CourseItem[]): DoseGroup[] {
  const groups: DoseGroup[] = []
  let premedication: CourseItem[] = []
  let chemo: DoseGroup | null = null

  const push = (kind: DoseGroupKind, key: string, list: CourseItem[]) =>
    groups.push({ kind, key, items: list })

  for (const item of items) {
    if (item.item.block === 'ward' || item.item.block === 'day_support') continue
    if (item.item.role === 'premedication') {
      premedication.push(item)
      continue
    }
    if (premedication.length > 0) {
      push('premedicated', `premedicated.${item.item.id}`, [...premedication, item])
      premedication = []
      chemo = null
      continue
    }
    if (!chemo) {
      chemo = { kind: 'chemo', key: `chemo.${item.item.id}`, items: [] }
      groups.push(chemo)
    }
    chemo.items.push(item)
  }
  // Premedication with nothing after it still has to be shown.
  if (premedication.length > 0) {
    push('premedicated', `premedicated.${premedication[0]!.item.id}`, premedication)
  }

  for (const kind of ['day_support', 'ward'] as const) {
    const list = items.filter((item) => item.item.block === kind)
    if (list.length > 0) push(kind, kind, list)
  }
  return groups
}
