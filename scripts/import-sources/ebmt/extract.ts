/**
 * Import of the EBMT Handbook (8th edition, 2024) into the site's data files.
 *
 * The book is Open Access under CC BY 4.0, which is what lets the text be
 * carried over word for word and translated: the licence permits use, sharing,
 * adaptation and reproduction with attribution and a note of what was changed.
 * `public/ebmt/book.json` records the citation, the licence and the changes
 * made, and the handbook pages in the app show them.
 *
 * Usage:
 *   npm run ebmt:extract -- "<path to the PDF>" [--out public/ebmt]
 *
 * The PDF itself is not in the repository; the generated JSON is, so the import
 * only has to be re-run when the extraction itself is improved.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'

import { openBook, type TextRun } from './page-text'
import {
  asideIsProse,
  baselines,
  COL_LEFT,
  columnLines,
  FOOT_Y,
  HEAD_Y,
  inFrame,
  runText,
  smallZones,
  splitBySize,
  tableRows,
  tidy,
  type Zone,
} from './layout'

const args = process.argv.slice(2)
const pdfPath = args.find((a) => !a.startsWith('--'))
const outDir = (() => {
  const i = args.indexOf('--out')
  return i >= 0 ? (args[i + 1] ?? 'public/ebmt') : 'public/ebmt'
})()
const onlyArg = (() => {
  const i = args.indexOf('--only')
  return i >= 0 ? (args[i + 1] ?? '') : ''
})()
const only = onlyArg ? new Set(onlyArg.split(',').map(Number)) : null

if (!pdfPath) {
  console.error('usage: npm run ebmt:extract -- "<path to the EBMT handbook PDF>"')
  process.exitCode = 1
} else if (!existsSync(pdfPath)) {
  console.error('not found: ' + pdfPath)
  process.exitCode = 1
} else {
  run(pdfPath, outDir)
}

export type BlockType = 'h2' | 'h3' | 'h4' | 'p' | 'li' | 'figure' | 'table' | 'aside'

export interface Block {
  id: string
  type: BlockType
  num?: string
  en: string
  columns?: number
  rows_en?: string[][]
  raw_en?: string
}

interface DraftBlock {
  type: BlockType
  num?: string
  text: string
  columns?: number
  rows?: string[][]
  rawText?: string
}

function run(file: string, out: string): void {
  const book = openBook(file)
  const total = book.pageCount
  const cache = new Map<number, TextRun[]>()
  const runsOf = (p: number): TextRun[] => {
    const hit = cache.get(p)
    if (hit) return hit
    const made = book.runs(p)
    cache.set(p, made)
    return made
  }

  // --- where each chapter and each part begins -----------------------------
  const chapters: { page: number; number: number }[] = []
  const parts: { page: number; roman: string; title: string; leaders: string }[] = []
  for (let p = 1; p <= total; p++) {
    const runs = runsOf(p)
    // A chapter opens with its number set in 36 pt.
    const big = runs.find((r) => r.size >= 30 && /^\d+$/.test(r.text.trim()))
    if (big) chapters.push({ page: p, number: Number(big.text.trim()) })
    const heads = runs.filter((r) => r.size >= 15)
    if (!heads.length) continue
    const joined = tidy(heads.map((r) => r.text).join(' '))
    const m = /^Part\s+([IVX]+)\s+(.*?)(?:\s*Topic Leaders?:\s*(.*))?$/.exec(joined)
    if (m?.[1] !== undefined && m[2] !== undefined)
      parts.push({ page: p, roman: m[1], title: m[2].trim(), leaders: m[3]?.trim() ?? '' })
  }
  console.log('pages: ' + total + ', chapters: ' + chapters.length + ', parts: ' + parts.length)

  const partFor = (page: number): (typeof parts)[number] | null => {
    let cur: (typeof parts)[number] | null = null
    for (const pt of parts) if (pt.page <= page) cur = pt
    return cur
  }

  const hash = (s: string): string => createHash('sha1').update(s).digest('hex').slice(0, 10)

  // --- one chapter ---------------------------------------------------------
  function buildChapter(number: number, from: number, to: number) {
    const open = runsOf(from)
    const title = tidy(
      baselines(open.filter((r) => r.size >= 15 && r.size < 30 && inFrame(r)))
        .map((g) => g.runs.map((r) => r.text).join(''))
        .join(' ')
        .replace(/^\d+\s*/, ''),
    )
    const authors = tidy(
      baselines(open.filter((r) => r.size >= 11 && r.size < 15 && r.y < 620 && r.y > 520))
        .map((g) => g.runs.map((r) => r.text).join(''))
        .join(' '),
    )
    const doi =
      /(10\.\d{4}\/[^\s)]+)/.exec(open.find((r) => /doi\.org/.test(r.text))?.text ?? '')?.[1] ??
      null
    const folio = open.find(
      (r) => (r.y >= HEAD_Y || r.y <= FOOT_Y) && r.size < 10 && /^\d+$/.test(r.text.trim()),
    )

    const blocks: DraftBlock[] = []
    const references: string[] = []
    const affiliations: string[] = []
    let licence: string | null = null
    let dropped = 0
    let inRefs = false

    let buf: DraftBlock | null = null
    let prev: {
      col: 0 | 1
      page: number
      y: number
      text: string
      soft: boolean
      bold: boolean
    } | null = null
    let pendingHeading: DraftBlock | null = null
    const flush = (): void => {
      if (!buf) return
      const text = tidy(buf.text)
      if (text.length > 1) blocks.push({ ...buf, text })
      buf = null
    }

    const addReference = (
      line: { x: number; col: 0 | 1; text: string },
      before: { soft: boolean; text: string } | null,
    ): void => {
      const colLeft = COL_LEFT[line.col]
      if (Math.abs(line.x - colLeft) < 3) references.push(line.text.trim())
      else if (references.length) {
        const join = before && (before.soft || /[-/]$/.test(before.text)) ? '' : ' '
        references[references.length - 1] += join + line.text.trim()
      }
    }

    for (let p = from; p <= to; p++) {
      const framed = runsOf(p).filter(inFrame)
      const { big, small } = splitBySize(framed)

      // Chapter 75 sets its "References" heading at a negative y, outside the
      // page frame, so the heading never reaches the body flow. Catch it on the
      // page itself: from there on, the small type is the reference list.
      if (
        runsOf(p).some(
          (r) => !inFrame(r) && r.bold && r.size >= 11 && /^references\s*$/i.test(r.text),
        )
      )
        inRefs = true

      // The opening page carries the title block and, at its foot, the authors'
      // affiliations; neither belongs to the running text.
      const isOpen = p === from
      const bodyRuns = isOpen
        ? big.filter((r) => r.size < 11.6 && !(r.size >= 11 && r.y > 520))
        : big

      for (const line of columnLines(bodyRuns)) {
        const colLeft = COL_LEFT[line.col]

        if (line.bold && line.size >= 11) {
          const m = /^((?:\d+\.)+\d+)\s+(.*)$/.exec(line.text.trim())
          const name = tidy(m?.[2] ?? line.text)
          flush()
          if (
            /^(references|further readings?|recommended references|suggested readings?|bibliography)$/i.test(
              name,
            )
          ) {
            inRefs = true
            pendingHeading = null
            prev = { ...line, page: p }
            continue
          }
          // A heading that wraps onto a second line: the second line has no
          // number of its own and sits right under the first.
          if (pendingHeading && !m && prev?.bold && Math.abs(prev.y - line.y) < 20) {
            pendingHeading.text = tidy(pendingHeading.text + ' ' + name)
          } else {
            const depth = m?.[1] !== undefined ? m[1].split('.').length : 2
            pendingHeading = {
              type: ('h' + Math.min(4, depth)) as BlockType,
              text: name,
              ...(m?.[1] !== undefined ? { num: m[1] } : {}),
            }
            blocks.push(pendingHeading)
          }
          prev = { ...line, page: p }
          continue
        }
        pendingHeading = null

        if (inRefs) {
          addReference(line, prev)
          prev = { ...line, page: p }
          continue
        }

        const bullet = /^[••]\s*|^[–-]\s/.test(line.text.trim())
        let kind: BlockType = bullet ? 'li' : 'p'
        // The book starts a paragraph with a one-em indent (12 pt). A larger
        // step is a box set inside the column — a "Key Points" summary, say —
        // whose every line would otherwise be read as a paragraph of its own.
        const offset = line.x - colLeft
        const indented = offset > 5 && offset < 20 && !bullet
        if (buf && buf.type === 'li' && !bullet && !indented) kind = 'li'
        // A paragraph runs on across a column or a page break: only an indent
        // or a heading starts a new one, never the end of a column.
        const sameFlow = prev?.col === line.col && prev?.page === p
        const gap = sameFlow && prev ? prev.y - line.y : 0
        // A bullet always starts a new item, even when the one before it was
        // also a bullet — otherwise a whole box of key points becomes one line.
        if (!buf || buf.type !== kind || indented || bullet || gap > line.size * 2.1) {
          flush()
          buf = { type: kind, text: line.text.trim() }
        } else {
          const join = prev && (prev.soft || /[-/]$/.test(prev.text)) ? '' : ' '
          buf.text += join + line.text.trim()
        }
        prev = { ...line, page: p }
      }
      flush()

      // Tables and figure captions keep their own shape even on the page where
      // the reference list starts; whatever small type is left over there is
      // the list itself.
      const consumed = new Set<TextRun>()
      const take = (zone: Zone): void => {
        for (const g of zone.groups) for (const r of g.runs) consumed.add(r)
      }
      for (const zone of smallZones(small)) {
        const block = zoneBlock(zone)
        if (/^Open Access\s+This chapter is licensed/.test(block.text)) {
          licence = block.text
          take(zone)
          continue
        }
        if (block.type === 'table' && block.rows) {
          blocks.push(block)
          take(zone)
          continue
        }
        if (block.type === 'figure') {
          blocks.push(block)
          take(zone)
          continue
        }
        if (inRefs) continue // left for the reference parser below
        take(zone)
        if (isOpen && block.type === 'aside' && zone.bottom < 200) affiliations.push(block.text)
        else if (block.type === 'aside' && !asideIsProse(block.text)) dropped++
        else if (block.text.length > 2) blocks.push(block)
      }

      if (inRefs) {
        let before: { soft: boolean; text: string } | null = null
        for (const line of columnLines(small.filter((r) => !consumed.has(r)))) {
          addReference(line, before)
          before = line
        }
      }
    }
    flush()

    const used = new Map<string, number>()
    const uniqueId = (base: string): string => {
      const seen = used.get(base) ?? 0
      used.set(base, seen + 1)
      return seen === 0 ? base : `${base}-${seen + 1}`
    }

    const part = partFor(from)
    return {
      number,
      part: part ? part.roman : null,
      page_pdf: [from, to] as [number, number],
      page_printed: folio ? Number(folio.text.trim()) : null,
      title_en: title,
      authors,
      affiliations: tidy(affiliations.join(' ')),
      doi,
      licence,
      dropped_fragments: dropped,
      blocks: blocks.map((b): Block => ({
        // The id is a hash of the text, so a re-import keeps the translation of
        // every paragraph that did not change. A chapter can hold the same text
        // twice — two "Key Points" boxes, a repeated heading — and each has to
        // be addressable on its own, so a repeat gets a counter.
        id: uniqueId(hash(b.type + '|' + (b.rows ? JSON.stringify(b.rows) : b.text))),
        type: b.type,
        ...(b.num !== undefined ? { num: b.num } : {}),
        en: b.text,
        ...(b.rows ? { columns: b.columns ?? b.rows[0]?.length ?? 0, rows_en: b.rows } : {}),
        ...(b.rawText !== undefined ? { raw_en: b.rawText } : {}),
      })),
      references: blocks.length ? references.map((r) => tidy(r)).filter((r) => r.length > 10) : [],
    }
  }

  function zoneBlock(zone: Zone): DraftBlock {
    const head = zone.groups[0]
    const first = (head?.runs ?? [])
      .map((r) => runText(r, head?.y ?? 0))
      .join('')
      .trim()
    const flat = tidy(zone.groups.map((g) => g.runs.map((r) => runText(r, g.y)).join('')).join(' '))
    if (/^(?:Fig\.|Figure)\s*\d+\.\d+/.test(first)) return { type: 'figure', text: flat }
    if (/^Table\s*\d+\.\d+/.test(first)) {
      const num = /^Table\s*(\d+\.\d+)/.exec(first)?.[1]
      const grid = zone.groups.length > 1 ? tableRows(zone.groups.slice(1)) : null
      return {
        type: 'table',
        ...(num !== undefined ? { num } : {}),
        text: tidy(first),
        ...(grid ? { columns: grid.columns, rows: grid.rows } : { rawText: flat }),
      }
    }
    return { type: 'aside', text: flat }
  }

  // --- the abbreviations list in the front matter ---------------------------
  function abbreviations(from: number, to: number): { abbr: string; en: string }[] {
    const seen = new Map<string, string>()
    for (let p = from; p <= to; p++) {
      const runs = runsOf(p).filter((r) => inFrame(r) && r.size >= 9 && r.text.trim())
      if (runs.length < 20) continue
      // The left margin alternates between recto and verso, so both the term
      // and the definition anchor are measured per page.
      const tally = new Map<number, number>()
      for (const r of runs) {
        const k = Math.round(r.x)
        tally.set(k, (tally.get(k) ?? 0) + 1)
      }
      const common = [...tally]
        .filter(([, n]) => n >= 10)
        .map(([x]) => x)
        .sort((a, b) => a - b)
      const termX = common[0]
      if (termX === undefined) continue
      const defX = common.find((x) => x > termX + 25)
      if (defX === undefined) continue

      let last: string | null = null
      for (const g of baselines(runs)) {
        const term = g.runs.filter((r) => r.x < defX - 6)
        const def = g.runs.filter((r) => r.x >= defX - 6)
        const abbr = tidy(term.map((r) => runText(r, g.y)).join(''))
        const en = tidy(def.map((r) => runText(r, g.y)).join(''))
        if (abbr && en) {
          if (!seen.has(abbr)) seen.set(abbr, en)
          last = abbr
        } else if (!abbr && en && last !== null) {
          seen.set(last, tidy((seen.get(last) ?? '') + ' ' + en))
        }
      }
    }
    return [...seen]
      .map(([abbr, en]) => ({ abbr, en }))
      .sort((a, b) => a.abbr.localeCompare(b.abbr, 'en'))
  }

  // --- write it out --------------------------------------------------------
  mkdirSync(out, { recursive: true })
  const write = (name: string, value: unknown): void =>
    writeFileSync(out + '/' + name, JSON.stringify(value, null, 1) + '\n')

  const index: unknown[] = []
  let chars = 0
  let tablesWithGrid = 0
  let tablesTotal = 0
  for (let i = 0; i < chapters.length; i++) {
    const start = chapters[i]
    if (start === undefined) continue
    let to = (chapters[i + 1]?.page ?? total + 1) - 1
    // A part divider page sits between chapters and belongs to neither.
    for (const pt of parts) if (pt.page > start.page && pt.page <= to) to = pt.page - 1
    if (only && !only.has(start.number)) continue
    const ch = buildChapter(start.number, start.page, to)
    const name = 'ch' + String(ch.number).padStart(2, '0')
    write(name + '.json', ch)
    const headings = ch.blocks
      .filter((b) => b.type === 'h2' || b.type === 'h3')
      .map((b) => ({ id: b.id, ...(b.num !== undefined ? { num: b.num } : {}), en: b.en }))
    for (const b of ch.blocks) {
      chars += b.en.length
      if (b.type === 'table') {
        tablesTotal++
        if (b.rows_en) tablesWithGrid++
      }
    }
    index.push({
      number: ch.number,
      part: ch.part,
      title_en: ch.title_en,
      authors: ch.authors,
      page_printed: ch.page_printed,
      blocks: ch.blocks.length,
      references: ch.references.length,
      headings,
    })
    process.stdout.write(
      '  ch' +
        String(ch.number).padStart(2) +
        ' ' +
        ch.blocks.length +
        ' blocks, ' +
        ch.references.length +
        ' refs, ' +
        headings.length +
        ' headings\n',
    )
  }

  const abbr = abbreviations(33, 40)
  write('abbreviations.json', abbr)
  write(
    'parts.json',
    parts.map((p) => ({ roman: p.roman, title_en: p.title, leaders: p.leaders })),
  )
  write('index.json', index)
  write('book.json', bookRecord())

  console.log(
    'written to ' +
      out +
      ': ' +
      index.length +
      ' chapters, ' +
      chars +
      ' characters of English, ' +
      tablesWithGrid +
      '/' +
      tablesTotal +
      ' tables as grids, ' +
      abbr.length +
      ' abbreviations',
  )
  const stray = [...book.unresolved].sort((a, b) => b[1] - a[1]).slice(0, 10)
  if (stray.length) {
    console.log('glyphs no mapping resolved (dropped from the text):')
    for (const [key, n] of stray) console.log('  ' + n + '\t' + key)
  }
}

/** Citation, licence and the record of what this import changed. */
function bookRecord() {
  return {
    title: 'The EBMT Handbook: Hematopoietic Cell Transplantation and Cellular Therapies',
    edition: '8th edition, 2024',
    editors: 'Anna Sureda, Selim Corbacioglu, Raffaella Greco, Nicolaus Kröger, Enric Carreras',
    publisher: 'Springer, Cham',
    isbn: '978-3-031-44079-3',
    isbn_ebook: '978-3-031-44080-9',
    doi: '10.1007/978-3-031-44080-9',
    url: 'https://doi.org/10.1007/978-3-031-44080-9',
    copyright: '© The Editor(s) (if applicable) and The Author(s) 2019, 2024',
    licence: 'CC BY 4.0',
    licence_url: 'https://creativecommons.org/licenses/by/4.0/',
    changes_uk: [
      'Текст розділів перенесено з PDF у структуровані блоки (абзаци, заголовки, списки, таблиці); нумерацію сторінок паперового видання збережено для посилань.',
      'Додано переклад українською, виконаний абзац за абзацом; оригінал англійською збережено поряд із кожним абзацом.',
      'Малюнки й схеми не перенесено — лише їхні підписи; для самих зображень треба дивитися оригінал.',
      'Зміст самого тексту не змінювали: ні доз, ні рекомендацій, ні висновків.',
    ],
    changes_en: [
      'The chapters were carried over from the PDF into structured blocks (paragraphs, headings, lists, tables); the printed page numbers are kept for citation.',
      'A Ukrainian translation was added paragraph by paragraph, with the English original kept alongside each paragraph.',
      'Figures and diagrams were not carried over, only their captions; the images themselves are in the original.',
      'Nothing in the text itself was altered: no doses, no recommendations, no conclusions.',
    ],
  }
}

/** Reads a generated chapter file, for the validator. */
export function readChapter(dir: string, number: number): unknown {
  return JSON.parse(readFileSync(dir + '/ch' + String(number).padStart(2, '0') + '.json', 'utf8'))
}
