import { routes } from '../../app/routes'
import { ICD10_SYSTEM_ID, type CatalogIndex } from '../../lib/catalog-index'
import type { Language } from '../../lib/i18n'
import { localize, type LocalizedText } from '../../lib/localized'

/**
 * One index over the whole catalog, searched from the header: the name of a regimen, a drug in a
 * regimen, the name of a disease and its ICD-10 code at once.
 *
 * The department's catalog holds some five hundred regimens over twenty diseases, and the
 * physician who knows the course by its name ("R-CHOP") or by one of its drugs ("даратумумаб")
 * should not have to guess which disease page it hangs under. Nothing is fetched: the index is
 * built from the catalog already in memory, so it answers offline like the rest of the app.
 */

export type SearchKind = 'regimen' | 'disease' | 'drug'

export interface SearchEntry {
  /** Unique within the index: a drug appears once per disease it is used in. */
  key: string
  kind: SearchKind
  title: string
  subtitle: string
  /** Where a click goes, ready for the router. */
  to: string
  /** The title, lowercased — what a match is ranked by. */
  name: string
  /** Everything searched, lowercased: names in both languages, trade names, codes. */
  haystack: string
}

/** Lowercase and collapse the spaces: what both the index and the query go through. */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** Every language of a localized field, for a physician who types the English name in Ukrainian UI. */
function allLanguages(field: LocalizedText | null | undefined): string[] {
  if (field === null || field === undefined) return []
  return [field.uk, field.en].filter((text): text is string => typeof text === 'string')
}

/** The drugs of a regimen: its items, or for a described course the drugs its card names. */
function regimenDrugIds(catalog: CatalogIndex, regimenId: string): string[] {
  const ids = new Set((catalog.itemsByRegimen.get(regimenId) ?? []).map((item) => item.drug_id))
  for (const drug of catalog.regimens.get(regimenId)?.reference?.drugs ?? []) {
    if (drug.drug_id !== undefined) ids.add(drug.drug_id)
  }
  return [...ids]
}

/** Diseases each regimen is listed under, in the order the diseases are shown. */
function diseasesByRegimen(catalog: CatalogIndex): Map<string, string[]> {
  const found = new Map<string, string[]>()
  for (const node of catalog.rows.treatment_nodes) {
    for (const link of catalog.regimenLinksByNode.get(node.id) ?? []) {
      const known = found.get(link.regimen_id)
      if (known === undefined) found.set(link.regimen_id, [node.disease_id])
      else if (!known.includes(node.disease_id)) known.push(node.disease_id)
    }
  }
  return found
}

export function buildSearchIndex(catalog: CatalogIndex, language: Language): SearchEntry[] {
  const entries: SearchEntry[] = []
  const diseaseName = (id: string) => {
    const disease = catalog.diseases.get(id)
    return disease === undefined ? id : localize(disease.name, language)
  }
  const diseasesOf = diseasesByRegimen(catalog)

  for (const disease of catalog.diseases.values()) {
    const codes = (catalog.codesByDisease.get(disease.id) ?? []).filter(
      (code) => code.system_id === ICD10_SYSTEM_ID,
    )
    const title = localize(disease.name, language)
    entries.push({
      key: `disease:${disease.id}`,
      kind: 'disease',
      title,
      subtitle: codes.map((code) => code.code).join(', '),
      to: routes.disease(disease.id),
      name: normalize(title),
      haystack: normalize(
        [
          ...allLanguages(disease.name),
          ...allLanguages(disease.summary),
          ...codes.map((code) => code.code),
        ].join(' | '),
      ),
    })
  }

  for (const regimen of catalog.regimens.values()) {
    const diseaseIds = diseasesOf.get(regimen.id) ?? []
    const drugNames = regimenDrugIds(catalog, regimen.id).flatMap((drugId) => {
      const drug = catalog.drugs.get(drugId)
      return drug === undefined ? [] : [...allLanguages(drug.name), ...drug.trade_names]
    })
    // A described course has no schedule to calculate, so its result opens the disease page the
    // card is on instead of a calculator that would refuse it.
    const described = regimen.reference !== null && regimen.reference !== undefined
    const to =
      described && diseaseIds[0] !== undefined
        ? routes.disease(diseaseIds[0])
        : `${routes.calculator}?regimen=${encodeURIComponent(regimen.id)}`
    entries.push({
      key: `regimen:${regimen.id}`,
      kind: 'regimen',
      title: regimen.short_name,
      subtitle: [localize(regimen.name, language), ...diseaseIds.map(diseaseName)]
        .filter((text) => text !== '')
        .join(' · '),
      to,
      name: normalize(regimen.short_name),
      haystack: normalize(
        [
          regimen.short_name,
          ...allLanguages(regimen.name),
          ...drugNames,
          ...diseaseIds.map(diseaseName),
        ].join(' | '),
      ),
    })
  }

  // A drug is a way into the disease it treats: the result opens that disease with the drug
  // filter of the treatment tree already on, so only the regimens built on it are left.
  const diseasesByDrug = new Map<string, Set<string>>()
  for (const [regimenId, diseaseIds] of diseasesOf) {
    for (const drugId of regimenDrugIds(catalog, regimenId)) {
      const known = diseasesByDrug.get(drugId)
      if (known === undefined) diseasesByDrug.set(drugId, new Set(diseaseIds))
      else for (const diseaseId of diseaseIds) known.add(diseaseId)
    }
  }
  for (const [drugId, diseaseIds] of diseasesByDrug) {
    const drug = catalog.drugs.get(drugId)
    if (drug === undefined) continue
    const title = localize(drug.name, language)
    for (const diseaseId of diseaseIds) {
      entries.push({
        key: `drug:${drugId}:${diseaseId}`,
        kind: 'drug',
        title,
        subtitle: diseaseName(diseaseId),
        to: `${routes.disease(diseaseId)}?drug=${encodeURIComponent(drugId)}`,
        name: normalize(title),
        haystack: normalize(
          [...allLanguages(drug.name), ...drug.trade_names, diseaseName(diseaseId)].join(' | '),
        ),
      })
    }
  }

  return entries
}

/**
 * The entries a query matches, best first: the name it begins with, then the name that holds it,
 * then everything else the entry is searched by. Within one rank the shorter name wins — "ABVD"
 * before "ABVD, редукована" — and the order is stable for equal names.
 */
export function searchCatalog(
  index: readonly SearchEntry[],
  query: string,
  limitPerKind = 8,
): Record<SearchKind, { shown: SearchEntry[]; total: number }> {
  const q = normalize(query)
  const empty = (): Record<SearchKind, { shown: SearchEntry[]; total: number }> => ({
    regimen: { shown: [], total: 0 },
    disease: { shown: [], total: 0 },
    drug: { shown: [], total: 0 },
  })
  if (q.length < 2) return empty()

  const ranked: { entry: SearchEntry; rank: number }[] = []
  for (const entry of index) {
    const rank = entry.name.startsWith(q)
      ? 0
      : entry.name.includes(q)
        ? 1
        : entry.haystack.includes(q)
          ? 2
          : null
    if (rank !== null) ranked.push({ entry, rank })
  }
  ranked.sort(
    (a, b) =>
      a.rank - b.rank ||
      a.entry.name.length - b.entry.name.length ||
      a.entry.name.localeCompare(b.entry.name),
  )

  const result = empty()
  for (const { entry } of ranked) {
    const group = result[entry.kind]
    group.total += 1
    if (group.shown.length < limitPerKind) group.shown.push(entry)
  }
  return result
}
