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

/**
 * What kind of document a source is. The source list keeps no separate field for it: a document
 * names itself, and the department's data names each kind the same way every time — a protocol as
 * "NSSG Oxford Haematology, L.38 Ibrutinib", a label as "SmPC …" or "FDA label: …", a trial as
 * "ClinicalTrials.gov NCT…". The page groups by this so the hundreds of rows can be read.
 */
export const SOURCE_KINDS = [
  'nssg',
  'eviq',
  'nccn',
  'uptodate',
  'guideline',
  'label',
  'register',
  'trial',
  'publication',
  'indexing',
  'department',
  'other',
] as const

export type SourceKind = (typeof SOURCE_KINDS)[number]

/**
 * Note on `\b`: it is ASCII-only in JavaScript, so a Cyrillic prefix must be matched with the
 * space that follows it instead of a word boundary.
 */
const KIND_PATTERNS: [SourceKind, RegExp][] = [
  ['nccn', /\bNCCN\b/i],
  ['nssg', /^NSSG\b/i],
  ['eviq', /^eviQ/i],
  ['uptodate', /^UpToDate/i],
  [
    'department',
    /^(Перелік препаратів відділення|Дизайн відділення|Схеми відділення|Вказівка лікаря відділення|Практика відділення|Відділення)/,
  ],
  ['register', /^Державний реєстр/],
  ['label', /^(SmPC |FDA label|EMA[ ,/:]|MHRA|Коротка характеристика препарату|Інструкція )/],
  ['trial', /^ClinicalTrials\.gov/i],
  ['indexing', /^(Каталог NLM|Запис статті в PubMed|Oxford Centre for Evidence)/],
  // A citation: authors, then the journal and the year. Checked before the guideline names
  // because a guideline published in a journal is read as the publication it is.
  [
    'publication',
    /(^|[\s.])(та ін\.|et al\.?)\s|\b(19|20)\d{2};\d|\bPMID \d|\bphase [\dIVi]+ (trial|study)/i,
  ],
  [
    'guideline',
    /\b(IDSA|ESMO|ASCO|ASH|EHA|ECIL|AGIHO|BSH|BCSH|WHO|NHS)\b|\bguidance\b|\bguidelines?\b/i,
  ],
]

/** The kind of a document, read from the way the source names itself. */
export function sourceKind(source: Source): SourceKind {
  const found = KIND_PATTERNS.find(([, pattern]) => pattern.test(source.name))
  return found?.[0] ?? 'other'
}

/** One kind of document: its sources and how long ago the group was last checked. */
export interface SourceGroup {
  kind: SourceKind
  entries: SourceEntry[]
  /** The oldest check date in the group, so a group nobody has revisited stands out. */
  oldestCheckedOn: string
}

/** The entries by kind, in the order of `SOURCE_KINDS`; a kind without entries is left out. */
export function groupSources(entries: SourceEntry[]): SourceGroup[] {
  const byKind = new Map<SourceKind, SourceEntry[]>()
  for (const entry of entries) {
    const kind = sourceKind(entry.source)
    const known = byKind.get(kind)
    if (known) known.push(entry)
    else byKind.set(kind, [entry])
  }
  return SOURCE_KINDS.flatMap((kind) => {
    const found = byKind.get(kind)
    if (found === undefined || found.length === 0) return []
    const oldest = found.reduce(
      (date, entry) => (entry.source.checkedOn < date ? entry.source.checkedOn : date),
      found[0]!.source.checkedOn,
    )
    return [{ kind, entries: found, oldestCheckedOn: oldest }]
  })
}

/** Lowercase and collapse the spaces: what both the haystack and the query go through. */
function normalizeQuery(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

/** One entry with everything it can be found by, prepared once for a filter that runs per keystroke. */
export interface SearchableSource {
  entry: SourceEntry
  /** Document name, version and every drug or regimen that rests on it, lowercased. */
  haystack: string
}

/** The entries prepared for the search field of the sources page. */
export function indexSources(entries: SourceEntry[]): SearchableSource[] {
  return entries.map((entry) => ({
    entry,
    haystack: normalizeQuery(
      [entry.source.name, entry.source.version ?? '', ...entry.uses.map((use) => use.label)].join(
        ' ',
      ),
    ),
  }))
}

/** The entries a query matches — by document name, by version, or by what rests on them. */
export function filterSources(index: SearchableSource[], query: string): SourceEntry[] {
  const needle = normalizeQuery(query)
  if (needle === '') return index.map((item) => item.entry)
  return index.flatMap((item) => (item.haystack.includes(needle) ? [item.entry] : []))
}
