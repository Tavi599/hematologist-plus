import type { CatalogIndex } from './catalog-index'
import type { CautionLevel, DrugCaution, PatientCondition } from '../schemas/common'

const STRENGTH: Record<CautionLevel, number> = { contraindicated: 3, dose_reduction: 2, caution: 1 }

/** What one drug of a regimen asks for under the conditions chosen. */
export interface RegimenCaution {
  drugId: string
  /** The strongest of its statements: what the badge shows. */
  level: CautionLevel
  cautions: DrugCaution[]
}

/** The regimen's own drugs: its main items, or for a described course the drugs its card names. */
function mainDrugIds(catalog: CatalogIndex, regimenId: string): string[] {
  const ids = new Set(
    (catalog.itemsByRegimen.get(regimenId) ?? [])
      .filter((item) => item.role === 'main')
      .map((item) => item.drug_id),
  )
  for (const drug of catalog.regimens.get(regimenId)?.reference?.drugs ?? []) {
    if (drug.drug_id !== undefined) ids.add(drug.drug_id)
  }
  return [...ids]
}

/**
 * How strongly the label speaks to one condition. The filter does not know how severe the
 * condition is, so a drug the label gives at a lower dose and forbids only at the severe end —
 * doxorubicin by the bilirubin — reads as a dose reduction, with the contraindication in its
 * notes; only a drug the label forbids outright reads as contraindicated.
 */
function conditionLevel(cautions: readonly DrugCaution[]): CautionLevel | null {
  if (cautions.length === 0) return null
  if (cautions.some((caution) => caution.level === 'dose_reduction')) return 'dose_reduction'
  return cautions.some((caution) => caution.level === 'contraindicated')
    ? 'contraindicated'
    : 'caution'
}

/**
 * The drugs of a regimen whose label speaks to one of the patient's conditions, strongest first.
 * Premedication and supportive drugs are left out: a filter on myeloma regimens that flagged the
 * dexamethasone premedication would flag them all and say nothing.
 */
export function regimenCautions(
  catalog: CatalogIndex,
  regimenId: string,
  conditions: readonly PatientCondition[],
): RegimenCaution[] {
  if (conditions.length === 0) return []
  const found: RegimenCaution[] = []
  for (const drugId of mainDrugIds(catalog, regimenId)) {
    const cautions = (catalog.drugs.get(drugId)?.cautions ?? []).filter((caution) =>
      conditions.includes(caution.condition),
    )
    if (cautions.length === 0) continue
    const level = conditions.reduce<CautionLevel>((strongest, condition) => {
      const own = conditionLevel(cautions.filter((caution) => caution.condition === condition))
      return own !== null && STRENGTH[own] > STRENGTH[strongest] ? own : strongest
    }, 'caution')
    found.push({ drugId, level, cautions })
  }
  return found.sort((a, b) => STRENGTH[b.level] - STRENGTH[a.level])
}

/** Is one of the regimen's drugs contraindicated under the conditions chosen? */
export function contraindicated(
  catalog: CatalogIndex,
  regimenId: string,
  conditions: readonly PatientCondition[],
): boolean {
  return regimenCautions(catalog, regimenId, conditions).some(
    (entry) => entry.level === 'contraindicated',
  )
}

/**
 * The strongest thing the labels say about each regimen under the conditions chosen, or null for
 * a regimen they say nothing about. The overview counts by it, and the hidden regimens are those
 * read as contraindicated.
 */
export function strongestLevels(
  catalog: CatalogIndex,
  regimenIds: readonly string[],
  conditions: readonly PatientCondition[],
): Map<string, CautionLevel | null> {
  return new Map(
    regimenIds.map((id) => [id, regimenCautions(catalog, id, conditions)[0]?.level ?? null]),
  )
}

/** The colour each level is shown in, strongest the warmest. */
export const LEVEL_COLOR: Record<CautionLevel, string> = {
  contraindicated: 'red',
  dose_reduction: 'orange',
  caution: 'yellow',
}
