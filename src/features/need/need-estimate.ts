import { calculateCourse, DomainInputError, type PresentationCount } from '../../domain'
import type { CatalogIndex } from '../../lib/catalog-index'
import { buildCourseItemsFrom } from '../../lib/course-input'
import type { Regimen } from '../../schemas/catalog'

/**
 * How much of one drug a course takes — the hint the physician fills the distribution form from.
 *
 * It is only a hint, and it says so on screen: the form asks for the need of the whole
 * department, which no calculation knows. What can be counted is what one course of one regimen
 * takes for a body of a given surface, and that is what this does.
 *
 * Only the drug in question is calculated, not the whole regimen: the form is filled in drug by
 * drug, and a regimen whose other drugs lack a weight or a creatinine would otherwise refuse to
 * be counted at all.
 */

/** Packs one course takes, or the measurement the calculation could not do without. */
export type NeedEstimate =
  { ok: true; packs: PresentationCount[] } | { ok: false; missingField: string }

/**
 * The calendar plays no part in counting packs, and neither does sex: sex enters only the
 * creatinine clearance, which is not calculated without a creatinine.
 */
const ANY_START_DATE = '2026-01-01'

/** Regimens of the catalog that give this drug, in the catalog's own order. */
export function regimensWithDrug(catalog: CatalogIndex, drugId: string): Regimen[] {
  const found: Regimen[] = []
  for (const [regimenId, items] of catalog.itemsByRegimen) {
    if (!items.some((item) => item.drug_id === drugId)) continue
    const regimen = catalog.regimens.get(regimenId)
    if (regimen) found.push(regimen)
  }
  return found.sort((a, b) => a.sort_order - b.sort_order || (a.id < b.id ? -1 : 1))
}

export function estimateCoursePacks(
  catalog: CatalogIndex,
  drugId: string,
  regimenId: string,
  bsaM2: number,
): NeedEstimate {
  const items = (catalog.itemsByRegimen.get(regimenId) ?? []).filter(
    (item) => item.drug_id === drugId,
  )
  const courseItems = buildCourseItemsFrom(catalog, items)
  if (courseItems.length === 0) return { ok: false, missingField: 'regimen' }
  try {
    const course = calculateCourse(
      { sex: 'male' },
      courseItems.map((item) => item.courseDrug),
      { startDateIso: ANY_START_DATE, bsaM2 },
    )
    return { ok: true, packs: course.presentationTotals }
  } catch (error) {
    if (error instanceof DomainInputError) return { ok: false, missingField: error.field }
    throw error
  }
}

/**
 * The regimen to offer first: the one that can actually be counted. A drug is prescribed in
 * several regimens, and the form is filled in for the drug, so any of them that counts will do
 * as a starting point — the physician picks another one in a click.
 */
export function suggestedRegimen(
  catalog: CatalogIndex,
  drugId: string,
  bsaM2: number,
): Regimen | null {
  const regimens = regimensWithDrug(catalog, drugId)
  const counted = regimens.find((regimen) => {
    const estimate = estimateCoursePacks(catalog, drugId, regimen.id, bsaM2)
    return estimate.ok && estimate.packs.length > 0
  })
  return counted ?? regimens[0] ?? null
}

/** Packs of one presentation out of the whole breakdown; the other strengths are only a hint. */
export function packsOf(packs: PresentationCount[], presentationId: string): number {
  return packs.find((entry) => entry.presentation.id === presentationId)?.count ?? 0
}
