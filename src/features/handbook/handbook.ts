/**
 * The EBMT Handbook as the app reads it.
 *
 * The book is Open Access under CC BY 4.0, which is what lets its text be
 * carried over word for word and translated. It is a reference work of some
 * 1.6 million characters, so it is not in the database: `scripts/import-sources/
 * ebmt/extract.ts` turns the PDF into static JSON under `public/ebmt/`, the
 * site fetches a chapter only when it is opened, and the service worker keeps
 * the chapters that were read.
 *
 * English and Ukrainian live in separate files on purpose. `chNN.json` is
 * generated and must stay disposable; `chNN.uk.json` is written by hand and
 * must survive a re-import. They are joined by a block id that is a hash of the
 * English text, so re-running the import keeps every translation whose
 * paragraph did not change, and silently orphans the ones whose did —
 * `npm run ebmt:validate` is what reports those.
 */
import { z } from 'zod'

export const BLOCK_TYPES = ['h2', 'h3', 'h4', 'p', 'li', 'figure', 'table', 'aside'] as const
export type BlockType = (typeof BLOCK_TYPES)[number]

/** A paragraph, heading, list item, caption or table of a chapter. */
export const handbookBlockSchema = z.object({
  id: z.string(),
  // An unknown type must not fail the load: a later import may add one, and an
  // installed copy of the app has to survive it.
  type: z.enum(BLOCK_TYPES).catch('p'),
  num: z.string().optional(),
  en: z.string(),
  columns: z.number().optional(),
  rows_en: z.array(z.array(z.string())).optional(),
  raw_en: z.string().optional(),
})
export type HandbookBlock = z.infer<typeof handbookBlockSchema>

export const handbookChapterSchema = z.object({
  number: z.number(),
  part: z.string().nullable(),
  page_printed: z.number().nullable(),
  title_en: z.string(),
  authors: z.string(),
  affiliations: z.string().default(''),
  doi: z.string().nullable(),
  blocks: z.array(handbookBlockSchema),
  references: z.array(z.string()),
})
export type HandbookChapter = z.infer<typeof handbookChapterSchema>

/** Hand-written Ukrainian for one chapter, keyed by block id. */
export const handbookTranslationSchema = z.object({
  title: z.string().optional(),
  blocks: z.record(z.string(), z.string()).default({}),
  rows: z.record(z.string(), z.array(z.array(z.string()))).default({}),
  references: z.record(z.string(), z.string()).default({}),
})
export type HandbookTranslation = z.infer<typeof handbookTranslationSchema>

export const handbookHeadingSchema = z.object({
  id: z.string(),
  num: z.string().optional(),
  en: z.string(),
})

export const handbookIndexEntrySchema = z.object({
  number: z.number(),
  part: z.string().nullable(),
  title_en: z.string(),
  authors: z.string(),
  page_printed: z.number().nullable(),
  blocks: z.number(),
  references: z.number(),
  headings: z.array(handbookHeadingSchema),
})
export type HandbookIndexEntry = z.infer<typeof handbookIndexEntrySchema>

export const handbookPartSchema = z.object({
  roman: z.string(),
  title_en: z.string(),
  leaders: z.string(),
})
export type HandbookPart = z.infer<typeof handbookPartSchema>

export const handbookBookSchema = z.object({
  title: z.string(),
  edition: z.string(),
  editors: z.string(),
  publisher: z.string(),
  isbn: z.string(),
  doi: z.string(),
  url: z.string(),
  copyright: z.string(),
  licence: z.string(),
  licence_url: z.string(),
  changes_uk: z.array(z.string()),
  changes_en: z.array(z.string()),
})
export type HandbookBook = z.infer<typeof handbookBookSchema>

export const handbookAbbreviationSchema = z.object({ abbr: z.string(), en: z.string() })
export type HandbookAbbreviation = z.infer<typeof handbookAbbreviationSchema>

/** Ukrainian for the parts, the chapter titles and the abbreviations. */
export const handbookFrontTranslationSchema = z.object({
  parts: z.record(z.string(), z.string()).default({}),
  chapters: z.record(z.string(), z.string()).default({}),
  abbreviations: z.record(z.string(), z.string()).default({}),
})
export type HandbookFrontTranslation = z.infer<typeof handbookFrontTranslationSchema>

export interface HandbookIndex {
  book: HandbookBook
  parts: HandbookPart[]
  chapters: HandbookIndexEntry[]
  abbreviations: HandbookAbbreviation[]
  front: HandbookFrontTranslation
}

/** Where the generated files are served from; the site may sit under a sub-path. */
export const handbookUrl = (name: string): string =>
  `${import.meta.env.BASE_URL.replace(/\/$/, '')}/ebmt/${name}`

async function fetchJson(name: string, optional = false): Promise<unknown> {
  const response = await fetch(handbookUrl(name))
  if (!response.ok) {
    if (optional) return null
    throw new Error(`${name}: HTTP ${response.status}`)
  }
  // A missing .uk.json is answered by index.html on GitHub Pages, not a 404.
  const type = response.headers.get('content-type') ?? ''
  if (optional && !type.includes('json')) return null
  try {
    return (await response.json()) as unknown
  } catch (error) {
    if (optional) return null
    throw error
  }
}

export async function fetchHandbookIndex(): Promise<HandbookIndex> {
  const [book, parts, chapters, abbreviations, front] = await Promise.all([
    fetchJson('book.json'),
    fetchJson('parts.json'),
    fetchJson('index.json'),
    fetchJson('abbreviations.json'),
    fetchJson('front.uk.json', true),
  ])
  return {
    book: handbookBookSchema.parse(book),
    parts: z.array(handbookPartSchema).parse(parts),
    chapters: z.array(handbookIndexEntrySchema).parse(chapters),
    abbreviations: z.array(handbookAbbreviationSchema).parse(abbreviations),
    front: handbookFrontTranslationSchema.parse(front ?? {}),
  }
}

export interface LoadedChapter {
  chapter: HandbookChapter
  translation: HandbookTranslation
}

export async function fetchHandbookChapter(number: number): Promise<LoadedChapter> {
  const name = `ch${String(number).padStart(2, '0')}`
  const [chapter, translation] = await Promise.all([
    fetchJson(`${name}.json`),
    fetchJson(`${name}.uk.json`, true),
  ])
  return {
    chapter: handbookChapterSchema.parse(chapter),
    translation: handbookTranslationSchema.parse(translation ?? {}),
  }
}

/** How much of a chapter is translated, as a share of its blocks. */
export function translatedShare(loaded: LoadedChapter): number {
  const translatable = loaded.chapter.blocks
  if (!translatable.length) return 0
  const done = translatable.filter((b) => loaded.translation.blocks[b.id]?.trim()).length
  return done / translatable.length
}

export const chapterTitle = (loaded: LoadedChapter): { uk: string | null; en: string } => ({
  uk: loaded.translation.title?.trim() || null,
  en: loaded.chapter.title_en,
})
