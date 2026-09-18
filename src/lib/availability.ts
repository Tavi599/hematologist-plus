import type { Drug, RegimenItem } from '../schemas/catalog'
import type { CatalogIndex } from './catalog-index'

/** Worst first: a regimen is as obtainable as its least obtainable drug. */
const ORDER: Drug['availability'][] = ['unavailable', 'registered', 'department']

/**
 * A regimen stays in the catalog even when some of its drugs cannot be obtained; this says how
 * obtainable it is, so the list can be filtered instead of hiding the regimen.
 */
export function regimenAvailability(
  catalog: CatalogIndex,
  regimenId: string,
): Drug['availability'] {
  const items = catalog.itemsByRegimen.get(regimenId) ?? []
  return worstAvailability(items, (item) => catalog.drugs.get(item.drug_id))
}

/** The drugs of a regimen that cannot be obtained, in administration order. */
export function unavailableDrugs(catalog: CatalogIndex, regimenId: string): Drug[] {
  return (catalog.itemsByRegimen.get(regimenId) ?? []).flatMap((item) => {
    const drug = catalog.drugs.get(item.drug_id)
    return drug && drug.availability === 'unavailable' ? [drug] : []
  })
}

function worstAvailability(
  items: RegimenItem[],
  drugOf: (item: RegimenItem) => Drug | undefined,
): Drug['availability'] {
  let worst = ORDER.length - 1
  for (const item of items) {
    const drug = drugOf(item)
    // A drug missing from the catalog is not something the department can obtain either.
    const rank = drug ? ORDER.indexOf(drug.availability) : 0
    if (rank < worst) worst = rank
  }
  return ORDER[worst]!
}
