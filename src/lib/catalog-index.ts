import type {
  CatalogRows,
  ClassificationSystem,
  Disease,
  DiseaseCode,
  Drug,
  DrugInfusionParams,
  DrugPresentation,
  Hospital,
  Regimen,
  RegimenItem,
  TreatmentNode,
  TreatmentNodeRegimen,
} from '../schemas/catalog'

/** Id of WHO ICD-10 in classification_systems; the default classification for diseases. */
export const ICD10_SYSTEM_ID = 'icd-10'

/** Lookup maps over the catalog; child lists are sorted by sort_order. */
export interface CatalogIndex {
  rows: CatalogRows
  hospitals: Hospital[]
  defaultHospital: Hospital | null
  drugs: Map<string, Drug>
  presentationsByDrug: Map<string, DrugPresentation[]>
  infusionParamsByDrug: Map<string, DrugInfusionParams[]>
  regimens: Map<string, Regimen>
  itemsByRegimen: Map<string, RegimenItem[]>
  classificationSystems: Map<string, ClassificationSystem>
  diseases: Map<string, Disease>
  codesByDisease: Map<string, DiseaseCode[]>
  /** Top-level treatment nodes per disease (parent_id null). */
  rootNodesByDisease: Map<string, TreatmentNode[]>
  childNodes: Map<string, TreatmentNode[]>
  regimenLinksByNode: Map<string, TreatmentNodeRegimen[]>
}

function bySortOrder<T extends { sort_order: number; id: string }>(a: T, b: T): number {
  return a.sort_order - b.sort_order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

function groupSorted<T extends { sort_order: number; id: string }>(
  rows: T[],
  key: (row: T) => string | null,
): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    if (k === null) continue
    const list = groups.get(k)
    if (list) list.push(row)
    else groups.set(k, [row])
  }
  for (const list of groups.values()) list.sort(bySortOrder)
  return groups
}

const byId = <T extends { id: string }>(rows: T[]) => new Map(rows.map((row) => [row.id, row]))

export function indexCatalog(rows: CatalogRows): CatalogIndex {
  const hospitals = [...rows.hospitals].sort(bySortOrder)
  return {
    rows,
    hospitals,
    defaultHospital: hospitals.find((hospital) => hospital.is_default) ?? hospitals[0] ?? null,
    drugs: byId(rows.drugs),
    presentationsByDrug: groupSorted(rows.drug_presentations, (row) => row.drug_id),
    infusionParamsByDrug: groupSorted(rows.drug_infusion_params, (row) => row.drug_id),
    regimens: byId(rows.regimens),
    itemsByRegimen: groupSorted(rows.regimen_items, (row) => row.regimen_id),
    classificationSystems: byId(rows.classification_systems),
    diseases: byId(rows.diseases),
    codesByDisease: groupSorted(rows.disease_codes, (row) => row.disease_id),
    rootNodesByDisease: groupSorted(
      rows.treatment_nodes.filter((node) => node.parent_id === null),
      (node) => node.disease_id,
    ),
    childNodes: groupSorted(rows.treatment_nodes, (node) => node.parent_id),
    regimenLinksByNode: groupSorted(rows.treatment_node_regimens, (row) => row.node_id),
  }
}

/** Primary code of a disease in a classification (first code if none is marked primary). */
export function primaryCode(
  index: CatalogIndex,
  diseaseId: string,
  systemId: string,
): DiseaseCode | null {
  const codes = (index.codesByDisease.get(diseaseId) ?? []).filter(
    (code) => code.system_id === systemId,
  )
  return codes.find((code) => code.is_primary) ?? codes[0] ?? null
}
