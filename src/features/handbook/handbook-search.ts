/**
 * Finding a place in the handbook: by chapter title, by the title of a section
 * inside a chapter, or by an abbreviation from the book's own list.
 *
 * Ninety-four chapters and 1570 section titles are far too many to walk
 * through, and the full text of the book is not loaded until a chapter is
 * opened — so this searches what the index holds, in both languages at once.
 * A reader who remembers only "GVHD", only "кондиціонування" or only "VOD"
 * gets to the right chapter without opening the parts one by one.
 */
import type { HandbookIndex } from './handbook'

export type HandbookHitKind = 'chapter' | 'section' | 'abbreviation'

export interface HandbookHit {
  kind: HandbookHitKind
  /** Chapter to open; null for an abbreviation that names no single chapter. */
  chapter: number | null
  /** Block to scroll to inside the chapter. */
  blockId?: string
  /** What matched, as it should be shown. */
  label: string
  /** The line under the label: the chapter it is in, or the expansion. */
  context: string
}

const fold = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .replace(/[\u2019'`]/g, '')
    .trim()

/** Every word of the query has to be found, in any order. */
function matches(haystack: string, terms: string[]): boolean {
  const hay = fold(haystack)
  return terms.every((term) => hay.includes(term))
}

export const MAX_HANDBOOK_HITS = 40

export function searchHandbook(
  index: HandbookIndex,
  query: string,
  language: 'uk' | 'en',
): HandbookHit[] {
  const terms = fold(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return []

  const hits: HandbookHit[] = []
  const chapterLabel = (number: number, titleEn: string): string => {
    const uk = index.front.chapters[String(number)]
    const title = language === 'uk' && uk ? uk : titleEn
    return `${number}. ${title}`
  }

  for (const entry of index.chapters) {
    const uk = index.front.chapters[String(entry.number)] ?? ''
    const partTitle = index.parts.find((p) => p.roman === entry.part)
    const partLabel = partTitle
      ? `${partTitle.roman}. ${(language === 'uk' && index.front.parts[partTitle.roman]) || partTitle.title_en}`
      : ''

    if (
      matches(entry.title_en, terms) ||
      (uk && matches(uk, terms)) ||
      matches(String(entry.number), terms)
    ) {
      hits.push({
        kind: 'chapter',
        chapter: entry.number,
        label: chapterLabel(entry.number, entry.title_en),
        context: partLabel,
      })
    }

    for (const heading of entry.headings) {
      if (!matches(heading.en, terms)) continue
      hits.push({
        kind: 'section',
        chapter: entry.number,
        blockId: heading.id,
        label: heading.num ? `${heading.num} ${heading.en}` : heading.en,
        context: chapterLabel(entry.number, entry.title_en),
      })
      if (hits.length > MAX_HANDBOOK_HITS * 4) break
    }
  }

  for (const abbr of index.abbreviations) {
    const uk = index.front.abbreviations[abbr.abbr] ?? ''
    if (!matches(abbr.abbr, terms) && !matches(abbr.en, terms) && !(uk && matches(uk, terms)))
      continue
    hits.push({
      kind: 'abbreviation',
      chapter: null,
      label: abbr.abbr,
      context: language === 'uk' && uk ? uk : abbr.en,
    })
  }

  // An exact abbreviation, then whole chapters, then sections inside them.
  const rank = (hit: HandbookHit): number => {
    if (hit.kind === 'abbreviation') return fold(hit.label) === terms.join(' ') ? 0 : 3
    return hit.kind === 'chapter' ? 1 : 2
  }
  return hits.sort((a, b) => rank(a) - rank(b)).slice(0, MAX_HANDBOOK_HITS)
}

/** Blocks of an open chapter whose text contains the query, for in-page search. */
export function findInChapter(
  blocks: { id: string; en: string; rows_en?: string[][] }[],
  translations: Record<string, string>,
  query: string,
): Set<string> {
  const terms = fold(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return new Set()
  const found = new Set<string>()
  for (const block of blocks) {
    const haystack = [
      block.en,
      translations[block.id] ?? '',
      (block.rows_en ?? []).flat().join(' '),
    ].join(' ')
    if (matches(haystack, terms)) found.add(block.id)
  }
  return found
}
