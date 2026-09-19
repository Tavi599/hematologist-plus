import type { SyncRows, TreatmentNode, TreatmentNodeRegimen } from '../../src/schemas/catalog'
import type { DataSet, TreatmentNodeFile } from './data-files'

/** Full id of a child entity: `<parent id>.<local key>`. */
export function childId(parentId: string, key: string): string {
  return `${parentId}.${key}`
}

/** Id of a disease code row; the code is normalized to the id alphabet (C83.3 → c83.3). */
export function diseaseCodeId(diseaseId: string, systemId: string, code: string): string {
  const normalized = code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, '-')
  return `${diseaseId}.${systemId}.${normalized}`
}

/** Converts the authoring format into rows of every table. Pure; no validation. */
/**
 * Where a row goes when the file does not say. Anything swallowed goes to the inpatient sheet,
 * prednisolone of a CHOP included: tablets are given on the ward round and must not move when
 * an infusion is shifted. The exception is premedication, which is taken before the drip and
 * belongs to it. Supportive injections hang off the infusion of the day; the chemotherapy and
 * its premedication form the hourly chain.
 */
function defaultBlock(role: string, route: string): 'infusion' | 'day_support' | 'ward' {
  // A premedication tablet is swallowed half an hour before the drip and has to move with it.
  if (role === 'premedication') return 'infusion'
  if (route === 'oral') return 'ward'
  return role === 'supportive' ? 'day_support' : 'infusion'
}

export function flattenDataSet(data: DataSet): SyncRows {
  const rows: SyncRows = {
    classification_systems: data.classificationSystems.map((system) => ({ ...system })),
    hospitals: data.hospitals.map(({ $comment: _comment, ...hospital }) => hospital),
    drugs: [],
    drug_presentations: [],
    drug_infusion_params: [],
    regimens: [],
    regimen_items: [],
    diseases: [],
    disease_codes: [],
    treatment_nodes: [],
    treatment_node_regimens: [],
    disease_articles: [],
  }

  for (const drug of data.drugs) {
    const { presentations, infusion_params, $comment: _comment, ...drugRow } = drug
    rows.drugs.push(drugRow)
    presentations.forEach(({ key, strength_unit, ...presentation }, index) => {
      rows.drug_presentations.push({
        id: childId(drug.id, key),
        drug_id: drug.id,
        ...presentation,
        // A pack is labelled in the drug's own unit unless the file says otherwise.
        strength_unit: strength_unit ?? drug.amount_unit,
        sort_order: index,
      })
    })
    infusion_params.forEach(({ key, ...params }, index) => {
      rows.drug_infusion_params.push({
        id: childId(drug.id, key),
        drug_id: drug.id,
        ...params,
        sort_order: index,
      })
    })
  }

  for (const regimen of data.regimens) {
    const { items, print_forms, $comment: _comment, ...regimenRow } = regimen
    rows.regimens.push({
      ...regimenRow,
      print_forms: {
        version: print_forms.version,
        forms: print_forms.forms.map((form) => ({
          ...form,
          itemIds: form.itemIds.map((key) => childId(regimen.id, key)),
        })),
      },
    })
    items.forEach(({ key, infusion_params_key, block, ...item }, index) => {
      rows.regimen_items.push({
        id: childId(regimen.id, key),
        regimen_id: regimen.id,
        ...item,
        infusion_params_id:
          infusion_params_key === null ? null : childId(item.drug_id, infusion_params_key),
        block: block ?? defaultBlock(item.role, item.route),
        sort_order: index,
      })
    })
  }

  for (const disease of data.diseases) {
    const { codes, treatment, article, references, $comment: _comment, ...diseaseRow } = disease
    // The column is named references_json: "references" is reserved in Postgres.
    rows.diseases.push({ ...diseaseRow, references_json: references })
    // Article text lives in its own table: the public catalog must not carry it.
    for (const [language, body] of Object.entries(article ?? {})) {
      if (typeof body !== 'string' || body.trim() === '') continue
      rows.disease_articles.push({
        id: childId(disease.id, language),
        disease_id: disease.id,
        language: language as 'uk' | 'en',
        body,
        sort_order: language === 'uk' ? 0 : 1,
      })
    }
    codes.forEach((code, index) => {
      rows.disease_codes.push({
        id: diseaseCodeId(disease.id, code.system_id, code.code),
        disease_id: disease.id,
        ...code,
        sort_order: index,
      })
    })
    flattenTreatment(
      disease.id,
      null,
      treatment,
      rows.treatment_nodes,
      rows.treatment_node_regimens,
    )
  }

  return rows
}

function flattenTreatment(
  diseaseId: string,
  parentId: string | null,
  nodes: TreatmentNodeFile[],
  nodeRows: TreatmentNode[],
  linkRows: TreatmentNodeRegimen[],
): void {
  nodes.forEach((node, index) => {
    const id = childId(diseaseId, node.key)
    // Parents are pushed before their children so one upsert batch satisfies the self reference.
    nodeRows.push({
      id,
      disease_id: diseaseId,
      parent_id: parentId,
      kind: node.kind,
      title: node.title,
      description: node.description,
      sort_order: index,
    })
    node.regimens.forEach((link, linkIndex) => {
      linkRows.push({
        id: childId(id, link.regimen_id),
        node_id: id,
        regimen_id: link.regimen_id,
        notes: link.notes,
        sort_order: linkIndex,
      })
    })
    flattenTreatment(diseaseId, id, node.children, nodeRows, linkRows)
  })
}
