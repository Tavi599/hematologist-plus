import type { CourseItem } from '../../lib/course-input'
import type { Drug } from '../../schemas/catalog'
import type { ROUTES } from '../../schemas/common'

type Route = (typeof ROUTES)[number]

/** Routes a drug is given by without being prepared first, unless its label says otherwise. */
const READY_ROUTES: ReadonlySet<Route> = new Set(['oral', 'topical'])

export interface PreparedDrug {
  drug: Drug
  routes: Route[]
}

/**
 * The drugs of the course grouped by catalog drug, with the routes the course gives them by.
 * A drug only swallowed or applied is left out unless its label says how to prepare it.
 */
export function preparedDrugs(
  items: CourseItem[],
  disabledIds: ReadonlySet<string>,
): PreparedDrug[] {
  const byDrug = new Map<string, PreparedDrug>()
  for (const entry of items) {
    if (disabledIds.has(entry.item.id)) continue
    const known = byDrug.get(entry.drug.id)
    if (known === undefined)
      byDrug.set(entry.drug.id, { drug: entry.drug, routes: [entry.item.route] })
    else if (!known.routes.includes(entry.item.route)) known.routes.push(entry.item.route)
  }
  return [...byDrug.values()].filter(
    ({ drug, routes }) =>
      routes.some((route) => !READY_ROUTES.has(route)) ||
      (drug.preparation ?? []).some((entry) =>
        entry.routes.some((route) => routes.includes(route)),
      ),
  )
}
