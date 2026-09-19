import { amountUnitOf, sameFamily, type DoseUnit } from '../domain'
import type { Drug } from '../schemas/catalog'
import { DOSE_UNITS } from '../schemas/common'

/**
 * Dose units a drug may be prescribed in. A drug states the units it is officially used in;
 * when it states none, every unit of its own kind is allowed — never one from the other kind,
 * because milligrams and units of activity do not convert into each other.
 */
export function allowedDoseUnits(drug: Drug | undefined): DoseUnit[] {
  if (!drug) return [...DOSE_UNITS]
  if (drug.dose_units.length > 0) return drug.dose_units
  return DOSE_UNITS.filter((unit) =>
    unit === 'auc' ? drug.amount_unit === 'mg' : sameFamily(amountUnitOf(unit), drug.amount_unit),
  )
}
