/**
 * Turning the handbook's page layout back into structure.
 *
 * The geometry is regular throughout the book, and these constants are what the
 * rest of the file keys on. They were measured, not guessed: body text sits in
 * two columns whose left edges are 51 pt and 258 pt, a hyphenated word break is
 * a lone "-" run at the column's right edge, and the running head and folio sit
 * outside the text frame.
 */
import type { TextRun } from './page-text'

export const COL_SPLIT = 252
export const COL_LEFT = [51, 258] as const
/**
 * A hyphenated word break is a lone "-" run at the right-hand end of a line.
 * The threshold is measured from the column's left edge rather than fixed,
 * because a box set inside a column is narrower and its breaks fall short of
 * the column's own right edge.
 */
export const HYPHEN_MIN_OFFSET = 140
export const HEAD_Y = 668
export const FOOT_Y = 50
/** Below this point size the type is a table, a caption, a box or a reference. */
export const BODY_SIZE = 9.6

export const inFrame = (r: TextRun): boolean => r.y < HEAD_Y && r.y > FOOT_Y

export const tidy = (s: string): string =>
  s
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:)\]])/g, '$1')
    .replace(/([([])\s+/g, '$1')
    .trim()

export interface Baseline {
  y: number
  runs: TextRun[]
}

/** Below this point size a run on its own baseline is a super- or subscript. */
const SCRIPT_SIZE = 7.5
/** How far off the line's baseline a super- or subscript can sit. */
const SCRIPT_RISE = 5

/**
 * Runs that share a baseline, each group ordered left to right, top page first.
 *
 * A superscript is set smaller and on its own raised baseline, so it would
 * otherwise become a line of its own and the "2" of "mg/m²" would be lost from
 * the dose. Such a run is folded back into the line it belongs to, keeping its
 * own y so `lineOf` can tell what it is.
 */
function rawGroups(runs: TextRun[], tol: number): Baseline[] {
  const groups: Baseline[] = []
  for (const r of runs) {
    const hit = groups.find((g) => Math.abs(g.y - r.y) <= tol)
    if (hit) hit.runs.push(r)
    else groups.push({ y: r.y, runs: [r] })
  }
  return groups
}

/**
 * The line a raised or dropped group belongs to: the nearest one it could sit
 * above or below. It also has to sit along that line horizontally, so that
 * small type elsewhere on the page — the inside of a chart, say — is not
 * pulled into a sentence.
 */
function hostOf(group: Baseline, main: Baseline[]): Baseline | null {
  let host: Baseline | null = null
  for (const m of main) {
    const rise = Math.abs(m.y - group.y)
    if (rise > SCRIPT_RISE || rise < 1) continue
    const xs = m.runs.map((r) => r.x)
    const from = Math.min(...xs) - 2
    const to = Math.max(...xs) + 40
    if (!group.runs.every((r) => r.x >= from && r.x <= to)) continue
    if (host === null || rise < Math.abs(host.y - group.y)) host = m
  }
  return host
}

export function baselines(runs: TextRun[], tol = 1.2): Baseline[] {
  const groups = rawGroups(runs, tol)

  const isScript = (g: Baseline): boolean =>
    g.runs.every((r) => r.size <= SCRIPT_SIZE || !r.text.trim())
  const main = groups.filter((g) => !isScript(g))
  const kept: Baseline[] = []
  for (const g of groups) {
    if (!isScript(g)) {
      kept.push(g)
      continue
    }
    const host = hostOf(g, main)
    if (host) host.runs.push(...g.runs)
    else kept.push(g)
  }

  for (const g of kept) g.runs.sort((a, b) => a.x - b.x)
  return kept.sort((a, b) => b.y - a.y)
}

/**
 * The body type of a page and its small type — tables, captions, boxes,
 * references. A super- or subscript is set far below the body size (the ² of
 * «mg/m²» is 6 pt), so a plain size cut would take it out of the sentence and
 * leave a dose reading «mg/m». A small run raised above or dropped below a
 * body line, and standing along it, is part of that line.
 */
export function splitBySize(framed: TextRun[]): { big: TextRun[]; small: TextRun[] } {
  const big = framed.filter((r) => r.size >= BODY_SIZE)
  const main = rawGroups(big, 1.2)
  const small: TextRun[] = []
  for (const r of framed) {
    if (r.size >= BODY_SIZE) continue
    const script = r.size <= SCRIPT_SIZE && r.text.trim() !== ''
    if (script && hostOf({ y: r.y, runs: [r] }, main)) big.push(r)
    else small.push(r)
  }
  return { big, small }
}

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '+': '⁺',
  '-': '⁻',
  '(': '⁽',
  ')': '⁾',
  n: 'ⁿ',
}
const SUBSCRIPT: Record<string, string> = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '+': '₊',
  '-': '₋',
}

/**
 * Text of one run, with a raised or dropped run written as the characters it
 * stands for. Only digits and signs are mapped: a raised letter is usually a
 * footnote marker and reads better left alone.
 */
export function runText(run: TextRun, baseline: number): string {
  const rise = run.y - baseline
  if (Math.abs(rise) < 1 || run.size > SCRIPT_SIZE) return run.text
  const table = rise > 0 ? SUPERSCRIPT : SUBSCRIPT
  const mapped = [...run.text].map((ch) => table[ch] ?? (ch.trim() ? null : ch))
  return mapped.every((ch) => ch !== null) ? mapped.join('') : run.text
}

export interface Line {
  y: number
  x: number
  size: number
  bold: boolean
  italic: boolean
  /** The line ended in a hyphenated word break, which has been taken off. */
  soft: boolean
  text: string
}

/**
 * One line of text out of a baseline. Whitespace-only runs are kept while
 * joining — they carry the gap between a heading's number and its title — but
 * they never decide the line's position or style.
 */
export function lineOf(group: Baseline, col: 0 | 1 | null): Line | null {
  const solid = group.runs.filter((r) => r.text.trim())
  if (!solid.length) return null
  const last = solid[solid.length - 1]
  const edge = col === null ? null : COL_LEFT[col] + HYPHEN_MIN_OFFSET
  const soft =
    solid.length > 1 &&
    last !== undefined &&
    last.text.trim() === '-' &&
    edge !== null &&
    last.x >= edge
  const body = soft ? group.runs.filter((r) => r !== last) : group.runs
  const kept = body.filter((r) => r.text.trim())
  const first = kept[0]
  if (first === undefined) return null
  const text = body
    .map((r) => runText(r, group.y))
    .join('')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trimEnd()
  if (!text.trim()) return null
  return {
    y: group.y,
    x: first.x,
    size: Math.max(...kept.map((r) => r.size)),
    bold: kept.some((r) => r.bold),
    italic: kept.every((r) => r.italic),
    soft,
    text,
  }
}

/** Two-column reading of a band of runs: the left column entire, then the right. */
export function columnLines(runs: TextRun[]): (Line & { col: 0 | 1 })[] {
  const out: (Line & { col: 0 | 1 })[] = []
  for (const col of [0, 1] as const) {
    const mine = runs.filter((r) => (r.x < COL_SPLIT ? 0 : 1) === col)
    for (const g of baselines(mine)) {
      const line = lineOf(g, col)
      if (line) out.push({ ...line, col })
    }
  }
  return out
}

export interface Zone {
  top: number
  bottom: number
  groups: Baseline[]
}

/** The small type of a page, cut into zones separated by vertical whitespace. */
export function smallZones(runs: TextRun[]): Zone[] {
  const groups = baselines(runs).filter((g) => g.runs.some((r) => r.text.trim()))
  const zones: Zone[] = []
  let cur: Zone | null = null
  for (const g of groups) {
    if (!cur) cur = { top: g.y, bottom: g.y, groups: [g] }
    else if (cur.bottom - g.y <= 16) {
      cur.groups.push(g)
      cur.bottom = g.y
    } else {
      zones.push(cur)
      cur = { top: g.y, bottom: g.y, groups: [g] }
    }
  }
  if (cur) zones.push(cur)
  return zones
}

const clusterX = (xs: number[]): number[] => {
  const out: number[] = []
  for (const x of [...xs].sort((a, b) => a - b)) {
    const last = out[out.length - 1]
    if (last !== undefined && x - last <= 4) continue
    out.push(x)
  }
  return out
}

/**
 * Column anchors of a table. They come from the header row: inside a cell a
 * linked citation year is a run of its own at an arbitrary x, and taking every
 * x would read each of those as a column. A leading stub column — the row
 * groupings down the left edge — has no header, so it is added separately.
 */
function columnAnchors(groups: Baseline[], headerRows: Baseline[]): number[] {
  const headXs: number[] = []
  for (const g of headerRows) for (const r of g.runs) if (r.text.trim()) headXs.push(r.x)
  let anchors = clusterX(headXs)
  const firstAnchor = anchors[0]
  if (firstAnchor === undefined) return []
  const stub: number[] = []
  for (const g of groups)
    for (const r of g.runs) if (r.text.trim() && r.x < firstAnchor - 6) stub.push(r.x)
  if (stub.length >= 2) anchors = clusterX([Math.min(...stub), ...anchors])
  return anchors
}

export interface Grid {
  columns: number
  rows: string[][]
}

/** A table zone rebuilt into rows of cells, or null when the grid is not readable. */
export function tableRows(groups: Baseline[]): Grid | null {
  const ys = groups.map((g) => g.y)
  const gaps: number[] = []
  for (let i = 1; i < ys.length; i++)
    gaps.push(Number(((ys[i - 1] ?? 0) - (ys[i] ?? 0)).toFixed(2)))
  const sorted = gaps.slice().sort((a, b) => a - b)
  const lineGap = sorted[Math.floor(sorted.length / 2)] ?? 10
  // Wrapped cell text sits exactly one line apart; a new row is set off by a
  // slightly wider gap, because the cells carry padding.
  const breaks = [0]
  for (let i = 1; i < groups.length; i++)
    if ((ys[i - 1] ?? 0) - (ys[i] ?? 0) > lineGap + 0.4) breaks.push(i)
  const headerEnd = breaks[1] ?? groups.length
  const anchors = columnAnchors(groups, groups.slice(0, headerEnd))
  if (anchors.length < 2) return null
  const colOf = (x: number): number => {
    let best = 0
    for (let i = 0; i < anchors.length; i++) if (x >= (anchors[i] ?? 0) - 3) best = i
    return best
  }

  const rows: string[][] = []
  let row: string[] = []
  for (let i = 0; i < groups.length; i++) {
    if (breaks.includes(i)) {
      row = anchors.map(() => '')
      rows.push(row)
    }
    const cells: TextRun[][] = anchors.map(() => [])
    for (const r of groups[i]?.runs ?? []) {
      if (!r.text.trim()) continue
      cells[colOf(r.x)]?.push(r)
    }
    cells.forEach((rs, c) => {
      if (!rs.length) return
      const text = rs.map((r) => runText(r, groups[i]?.y ?? 0)).join('')
      row[c] = (row[c] ? row[c] + ' ' : '') + text
    })
  }
  const clean = rows.map((r) => r.map((c) => tidy(c))).filter((r) => r.some((c) => c))
  if (clean.length < 2) return null
  return { columns: anchors.length, rows: clean }
}

/**
 * Small type that is neither a table nor a caption is usually a boxed note, but
 * the inside of a chart — axis labels, legend fragments — lands here too and
 * reads as rubble. Keep prose and box titles; drop the rest.
 */
export function asideIsProse(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean)
  if (!words.length) return false
  const real = words.filter((w) => /^[A-Za-z][A-Za-z’'-]{2,}$/.test(w)).length
  if (words.length <= 4 && real === words.length) return true // a box title such as "Key Points"
  return real >= 6 && real / words.length >= 0.5
}
