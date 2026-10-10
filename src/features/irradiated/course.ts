import { regimensInTree } from '../catalog/treatment-filter'
import type { CatalogIndex } from '../../lib/catalog-index'
import type { CourseItem } from '../../lib/course-input'
import { localize } from '../../lib/localized'
import { IRRADIATION_DISEASES, IRRADIATION_DRUGS, type Text2 } from './indications'

/**
 * Why the patient of this course needs irradiated blood components, as far as the course shows
 * it: a drug of the course (a purine analogue, bendamustine, alemtuzumab, ATG) or a regimen that
 * belongs to a disease that needs them in itself (Hodgkin lymphoma). The calculator is not told
 * the history, so a fludarabine given years ago is for the physician to tick by hand.
 */
export function irradiationReasons(
  catalog: CatalogIndex,
  items: CourseItem[],
  regimenId: string | null,
): Text2[] {
  const reasons: Text2[] = []
  const drugs = new Set(
    items
      .filter((entry) => entry.item.role === 'main' && IRRADIATION_DRUGS[entry.item.drug_id])
      .map((entry) => entry.item.drug_id),
  )
  for (const drugId of drugs) {
    const drug = catalog.drugs.get(drugId)
    const why = IRRADIATION_DRUGS[drugId]!
    reasons.push({
      uk: `${drug ? localize(drug.name, 'uk') : drugId}: ${why.uk}`,
      en: `${drug ? localize(drug.name, 'en') : drugId}: ${why.en}`,
    })
  }
  if (regimenId !== null) {
    for (const [diseaseId, why] of Object.entries(IRRADIATION_DISEASES)) {
      if (regimensInTree(catalog, diseaseId).has(regimenId)) reasons.push(why)
    }
  }
  return reasons
}
