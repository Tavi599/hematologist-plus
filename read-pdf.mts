import { readPdfPages } from './scripts/lib/pdf'

const file = process.argv[2]!
const pages = await readPdfPages(file)
for (const [i, text] of pages.entries()) {
  console.log(`\n===== PAGE ${i + 1} =====\n${text}`)
}
process.exitCode = 0
