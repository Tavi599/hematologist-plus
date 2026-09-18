import { readFileSync } from 'node:fs'
import { inflateRawSync } from 'node:zlib'

/**
 * Minimal .xlsx reader: enough to read the cells of the source lists we are given,
 * without pulling in a spreadsheet dependency. Formulas are read as their cached value.
 */

export type CellValue = string | number | boolean | null

export interface Sheet {
  name: string
  /** Rows as arrays of cells, indexed by column (A = 0); trailing empty cells are dropped. */
  rows: CellValue[][]
}

export function readWorkbook(file: string): Sheet[] {
  const entries = readZip(readFileSync(file))
  const text = (path: string) => {
    const data = entries.get(path)
    return data ? data.toString('utf8') : null
  }

  const sharedStrings = parseSharedStrings(text('xl/sharedStrings.xml') ?? '')
  const workbook = text('xl/workbook.xml') ?? ''
  const rels = parseRelationships(text('xl/_rels/workbook.xml.rels') ?? '')

  const sheets: Sheet[] = []
  for (const match of workbook.matchAll(/<sheet[^>]*\/>/g)) {
    const tag = match[0]
    const name = decodeXml(attribute(tag, 'name') ?? '')
    const relationId = attribute(tag, 'r:id')
    const target = relationId ? rels.get(relationId) : undefined
    const path = target ? `xl/${target.replace(/^\/?xl\//, '')}` : null
    const xml = path ? text(path) : null
    if (xml === null) continue
    sheets.push({ name, rows: parseSheet(xml, sharedStrings) })
  }
  return sheets
}

function attribute(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name.replace(':', '\\:')}="([^"]*)"`))
  return match?.[1] ?? null
}

function parseRelationships(xml: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const match of xml.matchAll(/<Relationship[^>]*\/>/g)) {
    const id = attribute(match[0], 'Id')
    const target = attribute(match[0], 'Target')
    if (id && target) map.set(id, target)
  }
  return map
}

function parseSharedStrings(xml: string): string[] {
  return [...xml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) =>
    decodeXml([...match[1]!.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]!).join('')),
  )
}

/** Column letters to a zero-based index: A → 0, AB → 27. */
export function columnIndex(reference: string): number {
  const letters = reference.match(/^[A-Z]+/)?.[0] ?? 'A'
  let index = 0
  for (const letter of letters) index = index * 26 + (letter.charCodeAt(0) - 64)
  return index - 1
}

function parseSheet(xml: string, sharedStrings: string[]): CellValue[][] {
  const rows: CellValue[][] = []
  for (const rowMatch of xml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: CellValue[] = []
    // The self-closing form must be matched first, or an empty cell swallows the next one.
    for (const cellMatch of rowMatch[2]!.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attributes = cellMatch[1] ?? ''
      const body = cellMatch[2] ?? ''
      const reference = attribute(attributes, 'r')
      const type = attribute(attributes, 't')
      const index = reference ? columnIndex(reference) : cells.length
      cells[index] = parseCell(type, body, sharedStrings)
    }
    rows[Number(rowMatch[1]) - 1] = trimTrailing(cells)
  }
  // Rows the file skips entirely stay empty rather than undefined.
  for (let i = 0; i < rows.length; i++) rows[i] ??= []
  return rows
}

function parseCell(type: string | null, body: string, sharedStrings: string[]): CellValue {
  const inline = body.match(/<is>([\s\S]*?)<\/is>/)
  if (inline) {
    return decodeXml(
      [...inline[1]!.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((m) => m[1]!).join(''),
    )
  }
  const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1]
  if (raw === undefined) return null
  switch (type) {
    case 's':
      return sharedStrings[Number(raw)] ?? null
    case 'b':
      return raw === '1'
    case 'str':
    case 'inlineStr':
    case 'e':
      return decodeXml(raw)
    default: {
      const value = Number(raw)
      return Number.isNaN(value) ? decodeXml(raw) : value
    }
  }
}

function trimTrailing(cells: CellValue[]): CellValue[] {
  const copy = [...cells]
  for (let i = 0; i < copy.length; i++) copy[i] ??= null
  while (copy.length > 0 && copy[copy.length - 1] === null) copy.pop()
  return copy
}

function decodeXml(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, '&')
}

/** Reads a ZIP archive from memory: the central directory, then each entry's data. */
function readZip(buffer: Buffer): Map<string, Buffer> {
  const endOffset = findEndOfCentralDirectory(buffer)
  const entryCount = buffer.readUInt16LE(endOffset + 10)
  let offset = buffer.readUInt32LE(endOffset + 16)

  const entries = new Map<string, Buffer>()
  for (let i = 0; i < entryCount; i++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50)
      throw new Error('xlsx: broken central directory')
    const method = buffer.readUInt16LE(offset + 10)
    const compressedSize = buffer.readUInt32LE(offset + 20)
    const nameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const localOffset = buffer.readUInt32LE(offset + 42)
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength)

    const localNameLength = buffer.readUInt16LE(localOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const data = buffer.subarray(dataStart, dataStart + compressedSize)
    if (method === 0) entries.set(name, Buffer.from(data))
    else if (method === 8) entries.set(name, inflateRawSync(data))
    else throw new Error(`xlsx: unsupported compression method ${method} for ${name}`)

    offset += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  for (let offset = buffer.length - 22; offset >= 0; offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset
  }
  throw new Error('xlsx: not a ZIP archive')
}
