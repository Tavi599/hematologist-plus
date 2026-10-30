/**
 * Text of a page of the EBMT handbook, as positioned runs.
 *
 * Positions are kept because the layout is what carries the structure: two
 * columns of 10 pt Times for the body, 11.5 pt bold Myriad headings, and 8.5 pt
 * for tables, captions and the reference list.
 *
 * One trap in this file deserves naming: the handbook's `ToUnicode` maps say
 * that the ligature glyphs stand for control characters (U+001D…U+001F), so
 * trusting them turns "affiliations" into "afliations". The `/Differences`
 * array of the same font gives the real glyph names (`f_f_i`), so a name from
 * there always wins.
 */
import { loadPdf, refOf, streamData, type PdfObject } from './pdf'

const BS = String.fromCharCode(92)

/** Glyph names used by this book beyond the plain letters and digits. */
const GLYPH: Record<string, string> = {
  space: ' ',
  exclam: '!',
  quotedbl: '"',
  numbersign: '#',
  dollar: '$',
  percent: '%',
  ampersand: '&',
  quoteright: '’',
  quoteleft: '‘',
  parenleft: '(',
  parenright: ')',
  asterisk: '*',
  plus: '+',
  comma: ',',
  hyphen: '-',
  period: '.',
  slash: '/',
  colon: ':',
  semicolon: ';',
  less: '<',
  equal: '=',
  greater: '>',
  question: '?',
  at: '@',
  bracketleft: '[',
  backslash: BS,
  bracketright: ']',
  asciicircum: '^',
  underscore: '_',
  braceleft: '{',
  bar: '|',
  braceright: '}',
  asciitilde: '~',
  exclamdown: '¡',
  cent: '¢',
  sterling: '£',
  fraction: '⁄',
  yen: '¥',
  florin: 'ƒ',
  section: '§',
  currency: '¤',
  quotesingle: "'",
  quotedblleft: '“',
  quotedblright: '”',
  guillemotleft: '«',
  guillemotright: '»',
  guilsinglleft: '‹',
  guilsinglright: '›',
  endash: '–',
  emdash: '—',
  dagger: '†',
  daggerdbl: '‡',
  periodcentered: '·',
  paragraph: '¶',
  bullet: '•',
  quotesinglbase: '‚',
  quotedblbase: '„',
  ellipsis: '…',
  perthousand: '‰',
  questiondown: '¿',
  degree: '°',
  plusminus: '±',
  multiply: '×',
  divide: '÷',
  minus: '−',
  trademark: '™',
  registered: '®',
  copyright: '©',
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  fi: 'fi',
  fl: 'fl',
  ff: 'ff',
  ffi: 'ffi',
  ffl: 'ffl',
  nbspace: '\u00A0',
  // Mathematical signs: a dropped "≥" would change what a threshold says.
  greaterequal: '≥',
  lessequal: '≤',
  notequal: '≠',
  approxequal: '≈',
  equivalence: '≡',
  proportional: '∝',
  infinity: '∞',
  radical: '√',
  partialdiff: '∂',
  summation: '∑',
  product: '∏',
  integral: '∫',
  arrowright: '→',
  arrowleft: '←',
  arrowup: '↑',
  arrowdown: '↓',
  arrowboth: '↔',
  element: '∈',
  logicaland: '∧',
  logicalor: '∨',
  // Letters and accents that appear on their own in this book.
  dotlessi: 'ı',
  acute: '´',
  grave: '`',
  circumflex: 'ˆ',
  tilde: '˜',
  macron: '¯',
  breve: '˘',
  dotaccent: '˙',
  dieresis: '¨',
  ring: '˚',
  cedilla: '¸',
  hungarumlaut: '˝',
  ogonek: '˛',
  caron: 'ˇ',
  mu: 'µ',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  epsilon: 'ε',
  zeta: 'ζ',
  eta: 'η',
  theta: 'θ',
  iota: 'ι',
  kappa: 'κ',
  lambda: 'λ',
  nu: 'ν',
  xi: 'ξ',
  pi: 'π',
  rho: 'ρ',
  sigma: 'σ',
  tau: 'τ',
  upsilon: 'υ',
  phi: 'φ',
  chi: 'χ',
  psi: 'ψ',
  omega: 'ω',
  Delta: 'Δ',
  Omega: 'Ω',
  Sigma: 'Σ',
  onequarter: '¼',
  onehalf: '½',
  threequarters: '¾',
  onesuperior: '¹',
  twosuperior: '²',
  threesuperior: '³',
}

/** The text a PostScript glyph name stands for, or null when it is unknown. */
export function glyphToText(name: string): string | null {
  const known = GLYPH[name]
  if (known !== undefined) return known
  if (name.length === 1) return name
  const uni = /^uni((?:[0-9A-Fa-f]{4})+)$/.exec(name)
  if (uni?.[1] !== undefined) {
    let out = ''
    for (let i = 0; i + 4 <= uni[1].length; i += 4)
      out += String.fromCharCode(parseInt(uni[1].slice(i, i + 4), 16))
    return out
  }
  const u = /^u([0-9A-Fa-f]{4,6})$/.exec(name)
  if (u?.[1] !== undefined) return String.fromCodePoint(parseInt(u[1], 16))
  // A styled variant of a glyph — "d.sc" is a small-capital d — stands for the
  // same letter.
  const variant = /^(.+)\.(?:sc|oldstyle|alt|lf|tf|dnom|numr|sups|case)$/.exec(name)
  if (variant?.[1] !== undefined) return glyphToText(variant[1])
  // Ligature and composite names: f_i, f_f_l, t_i …
  if (name.includes('_')) {
    const parts = name.split('_').map((p) => glyphToText(p))
    if (parts.every((p) => p !== null)) return parts.join('')
  }
  return null
}

export interface TextRun {
  x: number
  y: number
  size: number
  font: string
  bold: boolean
  italic: boolean
  text: string
}

interface FontInfo {
  name: string
  twoByte: boolean
  uni: Map<number, string> | null
  diff: Map<number, string> | null
  bold: boolean
  italic: boolean
}

export interface Book {
  /** Object number of each page, in reading order. */
  pageCount: number
  runs: (page1Based: number) => TextRun[]
  /** Glyphs no mapping could resolve, as "font code" -> how often. */
  unresolved: Map<string, number>
}

export function openBook(file: string): Book {
  const pdf = loadPdf(file)
  const { buf, objects } = pdf
  const body = (n: number | null): string => (n === null ? '' : (objects.get(n)?.body ?? ''))

  const pages: number[] = []
  const walk = (num: number, depth = 0): void => {
    if (depth > 60) return
    const src = body(num)
    if (/\/Type\s*\/Pages/.test(src)) {
      const kids = /\/Kids\s*\[([\s\S]*?)\]/.exec(src)?.[1]
      if (kids !== undefined)
        for (const k of kids.matchAll(/(\d+)\s+\d+\s+R/g))
          if (k[1] !== undefined) walk(Number(k[1]), depth + 1)
      return
    }
    if (/\/Type\s*\/Page\b/.test(src)) pages.push(num)
  }
  const catalog = [...objects].find(([, o]) => /\/Type\s*\/Catalog/.test(o.body))
  if (!catalog) throw new Error('PDF has no catalog')
  const rootPages = refOf(catalog[1].body, 'Pages')
  if (rootPages === null) throw new Error('PDF catalog has no page tree')
  walk(rootPages)

  const fontCache = new Map<number, FontInfo>()
  const unresolved = new Map<string, number>()
  const note = (key: string) => unresolved.set(key, (unresolved.get(key) ?? 0) + 1)

  const hexToStr = (h: string): string => {
    if (h.length === 2) return String.fromCharCode(parseInt(h, 16))
    let out = ''
    for (let i = 0; i + 4 <= h.length; i += 4)
      out += String.fromCharCode(parseInt(h.slice(i, i + 4), 16))
    return out
  }

  function toUnicodeMap(src: string): Map<number, string> | null {
    const tu = refOf(src, 'ToUnicode')
    if (tu === null) return null
    const obj = objects.get(tu)
    const data = obj ? streamData(obj, buf, objects) : null
    if (!data) return null
    const map = new Map<number, string>()
    const txt = data.toString('latin1')
    for (const b of txt.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
      if (b[1] === undefined) continue
      for (const p of b[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g))
        if (p[1] !== undefined && p[2] !== undefined) map.set(parseInt(p[1], 16), hexToStr(p[2]))
    }
    for (const b of txt.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
      if (b[1] === undefined) continue
      for (const p of b[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        if (p[1] === undefined || p[2] === undefined || p[3] === undefined) continue
        const lo = parseInt(p[1], 16)
        const hi = parseInt(p[2], 16)
        const dst = parseInt(p[3], 16)
        for (let c = lo; c <= hi && c - lo < 4000; c++)
          map.set(c, String.fromCodePoint(dst + (c - lo)))
      }
      for (const p of b[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*\[([\s\S]*?)\]/g)) {
        if (p[1] === undefined || p[3] === undefined) continue
        const lo = parseInt(p[1], 16)
        let i = 0
        for (const item of p[3].matchAll(/<([0-9A-Fa-f]+)>/g)) {
          if (item[1] !== undefined) map.set(lo + i, hexToStr(item[1]))
          i++
        }
      }
    }
    return map
  }

  function differences(src: string): Map<number, string> | null {
    let encSrc: string | null = null
    const ref = refOf(src, 'Encoding')
    if (ref !== null) encSrc = body(ref)
    else encSrc = /\/Encoding\s*<<([\s\S]*?)>>/.exec(src)?.[1] ?? null
    if (encSrc === null) return null
    const list = /\/Differences\s*\[([\s\S]*?)\]/.exec(encSrc)?.[1]
    if (list === undefined) return null
    const map = new Map<number, string>()
    let code = 0
    for (const tok of list.matchAll(/(\d+)|\/([A-Za-z0-9_.]+)/g)) {
      if (tok[1] !== undefined) code = Number(tok[1])
      else if (tok[2] !== undefined) map.set(code++, tok[2])
    }
    return map
  }

  function fontInfo(fontNum: number): FontInfo {
    const cached = fontCache.get(fontNum)
    if (cached) return cached
    const src = body(fontNum)
    // Subset fonts are named "ABCDEF+TimesLTStd-Roman14"; the tag is noise here.
    const name = (/\/BaseFont\s*\/([A-Za-z0-9_.+-]+)/.exec(src)?.[1] ?? 'F' + fontNum).replace(
      /^[A-Z]{6}\+/,
      '',
    )
    const info: FontInfo = {
      name,
      twoByte: /\/Subtype\s*\/Type0/.test(src),
      uni: toUnicodeMap(src),
      diff: /\/Subtype\s*\/Type0/.test(src) ? null : differences(src),
      bold: /Bold|Semibold|Black/i.test(name),
      italic: /Italic|Oblique/i.test(name),
    }
    fontCache.set(fontNum, info)
    return info
  }

  function fontsOfPage(pageSrc: string): Map<string, number> {
    const resRef = refOf(pageSrc, 'Resources')
    const resSrc = resRef !== null ? body(resRef) : pageSrc
    const m = /\/Font\s*(?:<<([\s\S]*?)>>|(\d+)\s+\d+\s+R)/.exec(resSrc)
    let dict = ''
    if (m?.[1] !== undefined) dict = m[1]
    else if (m?.[2] !== undefined) dict = body(Number(m[2]))
    const out = new Map<string, number>()
    for (const f of dict.matchAll(/\/([A-Za-z0-9_.+-]+)\s+(\d+)\s+\d+\s+R/g))
      if (f[1] !== undefined && f[2] !== undefined) out.set(f[1], Number(f[2]))
    return out
  }

  const isJunk = (s: string): boolean => {
    const c = s.codePointAt(0) ?? 0
    return (c < 0x20 && c !== 9) || (c >= 0xe000 && c <= 0xf8ff)
  }

  function codeToText(code: number, font: FontInfo): string {
    const glyphName = font.diff?.get(code)
    if (glyphName !== undefined) {
      const text = glyphToText(glyphName)
      if (text !== null) return text
      note(font.name + ' /' + glyphName)
      return ''
    }
    const mapped = font.uni?.get(code)
    if (mapped !== undefined) {
      if (mapped && !isJunk(mapped)) return mapped
      note(font.name + ' code ' + code)
      return ''
    }
    if (font.twoByte) {
      note(font.name + ' cid ' + code)
      return ''
    }
    return String.fromCharCode(code)
  }

  const mapBytes = (bytes: number[], font: FontInfo): string => {
    let out = ''
    if (font.twoByte) {
      for (let i = 0; i + 1 < bytes.length; i += 2)
        out += codeToText(((bytes[i] ?? 0) << 8) | (bytes[i + 1] ?? 0), font)
    } else for (const b of bytes) out += codeToText(b, font)
    return out
  }

  function decodeLiteral(s: string, font: FontInfo): string {
    const bytes: number[] = []
    for (let i = 0; i < s.length; i++) {
      const ch = s[i]
      if (ch !== BS) {
        bytes.push((ch ?? '').charCodeAt(0))
        continue
      }
      const n = s[++i]
      if (n === undefined) break
      if (n === 'n') bytes.push(10)
      else if (n === 'r') bytes.push(13)
      else if (n === 't') bytes.push(9)
      else if (n === 'b') bytes.push(8)
      else if (n === 'f') bytes.push(12)
      else if (n >= '0' && n <= '7') {
        let oct = n
        while (oct.length < 3) {
          const next = s[i + 1]
          if (next === undefined || next < '0' || next > '7') break
          oct += next
          i++
        }
        bytes.push(parseInt(oct, 8))
      } else bytes.push(n.charCodeAt(0))
    }
    return mapBytes(bytes, font)
  }

  function decodeHex(h: string, font: FontInfo): string {
    const clean = h.replace(/\s+/g, '')
    const bytes: number[] = []
    for (let i = 0; i + 2 <= clean.length; i += 2) bytes.push(parseInt(clean.slice(i, i + 2), 16))
    return mapBytes(bytes, font)
  }

  function decodeArray(s: string, font: FontInfo): string {
    let out = ''
    const re =
      /\(((?:\\[\s\S]|[^\\()]|\((?:\\[\s\S]|[^\\()])*\))*)\)|<([0-9A-Fa-f\s]+)>|(-?[\d.]+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(s)) !== null) {
      if (m[1] !== undefined) out += decodeLiteral(m[1], font)
      else if (m[2] !== undefined) out += decodeHex(m[2], font)
      // A big negative kern inside a TJ array is the space between two words.
      else if (m[3] !== undefined && Number(m[3]) < -180) out += ' '
    }
    return out
  }

  const mul = (a: number[], b: number[]): number[] => [
    (a[0] ?? 0) * (b[0] ?? 0) + (a[1] ?? 0) * (b[2] ?? 0),
    (a[0] ?? 0) * (b[1] ?? 0) + (a[1] ?? 0) * (b[3] ?? 0),
    (a[2] ?? 0) * (b[0] ?? 0) + (a[3] ?? 0) * (b[2] ?? 0),
    (a[2] ?? 0) * (b[1] ?? 0) + (a[3] ?? 0) * (b[3] ?? 0),
    (a[4] ?? 0) * (b[0] ?? 0) + (a[5] ?? 0) * (b[2] ?? 0) + (b[4] ?? 0),
    (a[4] ?? 0) * (b[1] ?? 0) + (a[5] ?? 0) * (b[3] ?? 0) + (b[5] ?? 0),
  ]

  const contentOf = (pageSrc: string): PdfObject[] => {
    const single = refOf(pageSrc, 'Contents')
    const nums: number[] = []
    if (single !== null) nums.push(single)
    else {
      const arr = /\/Contents\s*\[([\s\S]*?)\]/.exec(pageSrc)?.[1]
      if (arr !== undefined)
        for (const r of arr.matchAll(/(\d+)\s+\d+\s+R/g))
          if (r[1] !== undefined) nums.push(Number(r[1]))
    }
    return nums.map((n) => objects.get(n)).filter((o): o is PdfObject => o !== undefined)
  }

  const EMPTY_FONT: FontInfo = {
    name: '?',
    twoByte: false,
    uni: null,
    diff: null,
    bold: false,
    italic: false,
  }

  function runs(page1Based: number): TextRun[] {
    const pageNum = pages[page1Based - 1]
    if (pageNum === undefined) return []
    const src = body(pageNum)
    const fonts = fontsOfPage(src)
    let ops = ''
    for (const obj of contentOf(src)) {
      const data = streamData(obj, buf, objects)
      if (data) ops += data.toString('latin1') + '\n'
    }

    const out: TextRun[] = []
    let font = EMPTY_FONT
    let size = 0
    let tm = [1, 0, 0, 1, 0, 0]
    let tlm = tm.slice()
    let leading = 0
    const re =
      /\/([A-Za-z0-9_.+-]+)\s+(-?[\d.]+)\s+Tf|(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm|(-?[\d.]+)\s+(-?[\d.]+)\s+(Td|TD)|(-?[\d.]+)\s+TL|(T\*)|(BT)|\(((?:\\[\s\S]|[^\\()]|\((?:\\[\s\S]|[^\\()])*\))*)\)\s*(?:Tj|'|")|\[((?:[^[\]]|\[[^\]]*\])*)\]\s*TJ|<([0-9A-Fa-f\s]+)>\s*Tj/g
    let m: RegExpExecArray | null
    while ((m = re.exec(ops)) !== null) {
      if (m[1] !== undefined) {
        const num = fonts.get(m[1])
        font = num === undefined ? EMPTY_FONT : fontInfo(num)
        size = Math.abs(Number(m[2]))
        continue
      }
      if (m[3] !== undefined) {
        tm = [Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]), Number(m[7]), Number(m[8])]
        tlm = tm.slice()
        continue
      }
      if (m[9] !== undefined) {
        if (m[11] === 'TD') leading = -Number(m[10])
        tlm = mul([1, 0, 0, 1, Number(m[9]), Number(m[10])], tlm)
        tm = tlm.slice()
        continue
      }
      if (m[12] !== undefined) {
        leading = Number(m[12])
        continue
      }
      if (m[13] !== undefined) {
        tlm = mul([1, 0, 0, 1, 0, -leading], tlm)
        tm = tlm.slice()
        continue
      }
      if (m[14] !== undefined) {
        tm = [1, 0, 0, 1, 0, 0]
        tlm = tm.slice()
        continue
      }
      const text =
        m[15] !== undefined
          ? decodeLiteral(m[15], font)
          : m[16] !== undefined
            ? decodeArray(m[16], font)
            : m[17] !== undefined
              ? decodeHex(m[17], font)
              : ''
      if (!text) continue
      const scale = Math.hypot(tm[0] ?? 1, tm[1] ?? 0)
      out.push({
        x: Number((tm[4] ?? 0).toFixed(1)),
        y: Number((tm[5] ?? 0).toFixed(1)),
        size: Number((size * scale).toFixed(2)),
        font: font.name,
        bold: font.bold,
        italic: font.italic,
        text,
      })
    }
    return out
  }

  return { pageCount: pages.length, runs, unresolved }
}
