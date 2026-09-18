import { deflateRawSync } from 'node:zlib'

/** Builds a minimal .xlsx in memory so the reader can be tested without a binary fixture. */
export function makeXlsx(files: Record<string, string>, { store = false } = {}): Buffer {
  const entries = Object.entries(files).map(([name, content]) => {
    const raw = Buffer.from(content, 'utf8')
    const data = store ? raw : deflateRawSync(raw)
    return { name: Buffer.from(name, 'utf8'), raw, data, method: store ? 0 : 8, offset: 0 }
  })

  const local: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    entry.offset = offset
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(entry.method, 8)
    header.writeUInt32LE(crc32(entry.raw), 14)
    header.writeUInt32LE(entry.data.length, 18)
    header.writeUInt32LE(entry.raw.length, 22)
    header.writeUInt16LE(entry.name.length, 26)
    local.push(header, entry.name, entry.data)
    offset += header.length + entry.name.length + entry.data.length
  }

  const central: Buffer[] = []
  let centralSize = 0
  for (const entry of entries) {
    const header = Buffer.alloc(46)
    header.writeUInt32LE(0x02014b50, 0)
    header.writeUInt16LE(20, 6)
    header.writeUInt16LE(entry.method, 10)
    header.writeUInt32LE(crc32(entry.raw), 16)
    header.writeUInt32LE(entry.data.length, 20)
    header.writeUInt32LE(entry.raw.length, 24)
    header.writeUInt16LE(entry.name.length, 28)
    header.writeUInt32LE(entry.offset, 42)
    central.push(header, entry.name)
    centralSize += header.length + entry.name.length
  }

  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(entries.length, 8)
  end.writeUInt16LE(entries.length, 10)
  end.writeUInt32LE(centralSize, 12)
  end.writeUInt32LE(offset, 16)

  return Buffer.concat([...local, ...central, end])
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  return value >>> 0
})

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** Wraps rows of strings/numbers into the sheet + workbook XML an .xlsx needs. */
export function sheetXlsx(rows: (string | number | null)[][], { inline = false } = {}): Buffer {
  const shared: string[] = []
  const cellRef = (row: number, column: number) => `${String.fromCharCode(65 + column)}${row + 1}`

  const sheetRows = rows
    .map((cells, rowIndex) => {
      const body = cells
        .map((value, column) => {
          if (value === null) return ''
          const reference = cellRef(rowIndex, column)
          if (typeof value === 'number') return `<c r="${reference}"><v>${value}</v></c>`
          if (inline) {
            return `<c r="${reference}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`
          }
          let index = shared.indexOf(value)
          if (index === -1) index = shared.push(value) - 1
          return `<c r="${reference}" t="s"><v>${index}</v></c>`
        })
        .join('')
      return `<row r="${rowIndex + 1}">${body}</row>`
    })
    .join('')

  return makeXlsx({
    'xl/workbook.xml': `<workbook><sheets><sheet name="Список" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>`,
    'xl/sharedStrings.xml': `<sst>${shared.map((value) => `<si><t>${escapeXml(value)}</t></si>`).join('')}</sst>`,
    'xl/worksheets/sheet1.xml': `<worksheet><sheetData>${sheetRows}</sheetData></worksheet>`,
  })
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
