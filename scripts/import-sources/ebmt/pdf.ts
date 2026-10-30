/**
 * Just enough of the PDF format to read the EBMT handbook: indirect objects,
 * object streams (the handbook is PDF 1.6, so most objects are compressed) and
 * the stream data behind a dictionary.
 *
 * There is no PDF library in this project's dependencies and none is wanted for
 * a one-off import, so this reads the file structure directly.
 */
import { readFileSync } from 'node:fs'
import zlib from 'node:zlib'

export interface PdfObject {
  /** The object's source text, latin1-decoded; binary stream data is read from the buffer. */
  body: string
  /** Byte offset of the object in the file, or -1 for an object inside an object stream. */
  offset: number
}

export interface Pdf {
  buf: Buffer
  objects: Map<number, PdfObject>
}

export function loadPdf(file: string): Pdf {
  const buf = readFileSync(file)
  const lat = buf.toString('latin1')
  const objects = new Map<number, PdfObject>()

  const re = /(?:^|[\r\n\s>\]])(\d+)\s+(\d+)\s+obj\b/g
  const starts: { num: number; at: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(lat)) !== null) {
    const numText = m[1]
    if (numText === undefined) continue
    starts.push({ num: Number(numText), at: m.index + m[0].indexOf(numText) })
  }
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i]
    if (s === undefined) continue
    const next = starts[i + 1]
    const end = next ? next.at : lat.length
    if (!objects.has(s.num)) objects.set(s.num, { body: lat.slice(s.at, end), offset: s.at })
  }

  // Objects packed into object streams have to be unpacked before anything can
  // be looked up by number.
  for (const obj of [...objects.values()]) {
    if (!/\/Type\s*\/ObjStm/.test(obj.body)) continue
    const data = streamData(obj, buf, objects)
    if (!data) continue
    const n = Number(/\/N\s+(\d+)/.exec(obj.body)?.[1] ?? NaN)
    const first = Number(/\/First\s+(\d+)/.exec(obj.body)?.[1] ?? NaN)
    if (!Number.isFinite(n) || !Number.isFinite(first)) continue
    const head = data.toString('latin1', 0, first).trim().split(/\s+/).map(Number)
    for (let i = 0; i < n; i++) {
      const num = head[i * 2]
      const off = head[i * 2 + 1]
      if (num === undefined || off === undefined) continue
      const nextOff = i + 1 < n ? head[i * 2 + 3] : data.length - first
      if (nextOff === undefined) continue
      if (objects.has(num)) continue
      objects.set(num, { body: data.toString('latin1', first + off, first + nextOff), offset: -1 })
    }
  }

  return { buf, objects }
}

/** The reference `/<key> N 0 R` in a dictionary, as an object number. */
export function refOf(src: string, key: string): number | null {
  const m = new RegExp('/' + key + '\\s+(\\d+)\\s+\\d+\\s+R').exec(src)
  return m?.[1] !== undefined ? Number(m[1]) : null
}

function inflate(raw: Buffer): Buffer | null {
  for (const fn of [zlib.inflateSync, zlib.inflateRawSync]) {
    try {
      return fn(raw)
    } catch {
      /* try the next encoding */
    }
  }
  try {
    // A stream whose declared length is short still yields its leading bytes.
    return zlib.inflateSync(raw, { finishFlush: zlib.constants.Z_SYNC_FLUSH })
  } catch {
    return null
  }
}

/** Decoded contents of the stream belonging to an object, or null if it has none. */
export function streamData(
  obj: PdfObject,
  buf: Buffer,
  objects: Map<number, PdfObject>,
): Buffer | null {
  const sm = /stream\r?\n/.exec(obj.body)
  if (!sm || obj.offset < 0) return null
  const start = obj.offset + sm.index + sm[0].length

  let len: number | null = null
  const direct = /\/Length\s+(\d+)(?!\s+\d+\s+R)/.exec(obj.body)
  if (direct?.[1] !== undefined) len = Number(direct[1])
  else {
    const indirect = refOf(obj.body, 'Length')
    const ref = indirect !== null ? objects.get(indirect) : undefined
    const value = ref ? (/obj\s+(\d+)/.exec(ref.body) ?? /^\s*(\d+)/.exec(ref.body)) : null
    if (value?.[1] !== undefined) len = Number(value[1])
  }

  let raw: Buffer
  if (len !== null) raw = buf.subarray(start, start + len)
  else {
    const endIdx = buf.indexOf(Buffer.from('endstream'), start)
    raw = buf.subarray(start, endIdx < 0 ? buf.length : endIdx)
  }

  if (!/\/FlateDecode/.test(obj.body)) return raw
  const out = inflate(raw)
  return out ? applyPredictor(out, obj.body) : null
}

/** Undo the PNG row predictor an xref or object stream may be encoded with. */
function applyPredictor(data: Buffer, body: string): Buffer {
  const parms = /\/DecodeParms\s*<<([^>]*)>>/.exec(body)?.[1]
  if (parms === undefined) return data
  const pred = Number(/\/Predictor\s+(\d+)/.exec(parms)?.[1] ?? 0)
  if (pred < 10) return data
  const cols = Number(/\/Columns\s+(\d+)/.exec(parms)?.[1] ?? 1)
  const colors = Number(/\/Colors\s+(\d+)/.exec(parms)?.[1] ?? 1)
  const bpc = Number(/\/BitsPerComponent\s+(\d+)/.exec(parms)?.[1] ?? 8)
  const bpp = Math.ceil((colors * bpc) / 8)
  const rowLen = Math.ceil((cols * colors * bpc) / 8)
  const rows: Buffer[] = []
  let prev = Buffer.alloc(rowLen)
  for (let p = 0; p + 1 + rowLen <= data.length; p += 1 + rowLen) {
    const filter = data[p] ?? 0
    const row = Buffer.from(data.subarray(p + 1, p + 1 + rowLen))
    for (let i = 0; i < rowLen; i++) {
      const cur = row[i] ?? 0
      const a = i >= bpp ? (row[i - bpp] ?? 0) : 0
      const b = prev[i] ?? 0
      const c = i >= bpp ? (prev[i - bpp] ?? 0) : 0
      if (filter === 1) row[i] = (cur + a) & 0xff
      else if (filter === 2) row[i] = (cur + b) & 0xff
      else if (filter === 3) row[i] = (cur + ((a + b) >> 1)) & 0xff
      else if (filter === 4) {
        const guess = a + b - c
        const pa = Math.abs(guess - a)
        const pb = Math.abs(guess - b)
        const pc = Math.abs(guess - c)
        row[i] = (cur + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff
      }
    }
    rows.push(row)
    prev = row
  }
  return Buffer.concat(rows)
}
