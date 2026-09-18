import type { Source } from '../schemas/common'
import type { CatalogIndex } from './catalog-index'
import { localize, type LocalizedText } from './localized'
import type { Language } from './i18n'

/** What a source is used for: one drug, one dilution, one regimen or one alternative dose. */
export interface SourceUse {
  kind: 'drug' | 'infusion' | 'regimen' | 'dose'
  id: string
  label: string
}

/** One official document plus everything in the catalog that rests on it. */
export interface SourceEntry {
  source: Source
  uses: SourceUse[]
}

/** Key of a document: the same name and version is the same document. */
function keyOf(source: Source): string {
  return `${source.name}|${source.version ?? ''}`
}

/**
 * Every source named anywhere in the catalog, with what it is used for — the list of official
 * designs and protocols the calculation rests on, so a dose can be traced back to its document.
 */
export function collectSources(catalog: CatalogIndex, language: Language): SourceEntry[] {
  const entries = new Map<string, SourceEntry>()
  const add = (source: Source, use: SourceUse) => {
    const key = keyOf(source)
    const entry = entries.get(key)
    if (entry) {
      // Keep the first url/version seen; a later mention may be shorter.
      entry.uses.push(use)
      return
    }
    entries.set(key, { source, uses: [use] })
  }
  const name = (text: LocalizedText) => localize(text, language)

  for (const drug of catalog.drugs.values()) {
    for (const source of drug.sources) {
      add(source, { kind: 'drug', id: drug.id, label: name(drug.name) })
    }
  }
  for (const params of catalog.infusionParamsByDrug.values()) {
    for (const entry of params) {
      const drug = catalog.drugs.get(entry.drug_id)
      for (const source of entry.sources) {
        add(source, {
          kind: 'infusion',
          id: entry.id,
          label: drug ? name(drug.name) : entry.drug_id,
        })
      }
    }
  }
  for (const regimen of catalog.regimens.values()) {
    for (const source of regimen.sources) {
      add(source, { kind: 'regimen', id: regimen.id, label: regimen.short_name })
    }
    for (const item of catalog.itemsByRegimen.get(regimen.id) ?? []) {
      for (const option of item.dose_options) {
        add(option.source, { kind: 'dose', id: item.id, label: regimen.short_name })
      }
    }
  }

  return [...entries.values()].sort((a, b) => a.source.name.localeCompare(b.source.name))
}

/** The sources behind one item of a course: its regimen, its drug and its dilution. */
export function itemSources(
  catalog: CatalogIndex,
  regimenId: string,
  drugId: string,
  infusionParamsId: string | null,
): Source[] {
  const seen = new Set<string>()
  const all = [
    ...(catalog.regimens.get(regimenId)?.sources ?? []),
    ...(catalog.drugs.get(drugId)?.sources ?? []),
    ...((catalog.infusionParamsByDrug.get(drugId) ?? []).find(
      (params) => params.id === infusionParamsId,
    )?.sources ?? []),
  ]
  return all.filter((source) => {
    const key = keyOf(source)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
