import { readFileSync } from 'node:fs'

/**
 * Text of a PDF, page by page, for reading source protocols (NSSG, eviQ) during import.
 * Source documents are never committed: only the parameters read from them, with a citation.
 */
export async function readPdfPages(file: string): Promise<string[]> {
  // pdf.js is an ESM-only build meant for browsers; the legacy build runs in Node.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const document = await pdfjs.getDocument({
    data: new Uint8Array(readFileSync(file)),
    useSystemFonts: false,
  }).promise

  const pages: string[] = []
  for (let number = 1; number <= document.numPages; number++) {
    const page = await document.getPage(number)
    const content = await page.getTextContent()
    pages.push(itemsToText(content.items))
  }
  await document.cleanup()
  return pages
}

interface TextItem {
  str?: string
  hasEOL?: boolean
  transform?: number[]
}

/** Joins text items into lines, keeping the reading order pdf.js gives. */
function itemsToText(items: unknown[]): string {
  let text = ''
  let lastY: number | null = null
  for (const raw of items as TextItem[]) {
    if (typeof raw.str !== 'string') continue
    const y = raw.transform?.[5] ?? null
    if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) text += '\n'
    text += raw.str
    if (raw.hasEOL) text += '\n'
    if (y !== null) lastY = y
  }
  return text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n')
}
