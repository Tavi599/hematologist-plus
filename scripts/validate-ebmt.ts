/**
 * Checks the generated EBMT handbook files and the Ukrainian translation
 * against each other.
 *
 *   npm run ebmt:validate
 *
 * The English files are generated from the PDF and are disposable; the
 * translation files are written by hand and are not. They are joined by a block
 * id that is a hash of the English text, so re-running the import keeps every
 * translation whose paragraph did not change — and leaves the rest orphaned.
 * This is what finds those: an orphaned translation means a paragraph was
 * re-extracted differently and its Ukrainian has to be moved to the new id,
 * never silently dropped.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'

const dir = process.argv.includes('--dir')
  ? (process.argv[process.argv.indexOf('--dir') + 1] ?? 'public/ebmt')
  : 'public/ebmt'

interface Problem {
  file: string
  message: string
}
const problems: Problem[] = []
const notes: string[] = []

const read = (name: string): unknown => JSON.parse(readFileSync(`${dir}/${name}`, 'utf8'))

if (!existsSync(dir)) {
  console.error(`${dir} does not exist; run npm run ebmt:extract first`)
  process.exitCode = 1
} else {
  main()
}

function main(): void {
  const files = readdirSync(dir)
  for (const required of ['index.json', 'parts.json', 'book.json', 'abbreviations.json'])
    if (!files.includes(required)) problems.push({ file: required, message: 'missing' })

  const index = read('index.json') as { number: number; headings: { id: string }[] }[]
  const chapterFiles = files.filter((f) => /^ch\d\d\.json$/.test(f)).sort()
  if (chapterFiles.length !== index.length)
    problems.push({
      file: 'index.json',
      message: `lists ${index.length} chapters but ${chapterFiles.length} chapter files are present`,
    })

  let blocks = 0
  let translated = 0
  let orphans = 0
  let tablesWithoutGrid = 0
  const chaptersStarted: number[] = []

  for (const file of chapterFiles) {
    const chapter = read(file) as {
      number: number
      title_en: string
      blocks: { id: string; type: string; en: string; rows_en?: string[][] }[]
      references: string[]
    }
    const ids = new Set(chapter.blocks.map((b) => b.id))
    if (ids.size !== chapter.blocks.length)
      problems.push({ file, message: 'two blocks share an id; a translation would land on both' })
    if (!chapter.title_en) problems.push({ file, message: 'no title' })
    if (!chapter.blocks.length) problems.push({ file, message: 'no blocks' })
    if (!chapter.references.length) notes.push(`${file}: no references`)
    blocks += chapter.blocks.length
    tablesWithoutGrid += chapter.blocks.filter((b) => b.type === 'table' && !b.rows_en).length

    const ukName = file.replace('.json', '.uk.json')
    if (!files.includes(ukName)) continue
    chaptersStarted.push(chapter.number)
    const uk = read(ukName) as {
      blocks?: Record<string, string>
      rows?: Record<string, string[][]>
    }
    for (const id of Object.keys(uk.blocks ?? {})) {
      if (ids.has(id)) translated++
      else {
        orphans++
        problems.push({
          file: ukName,
          message: `translation for block ${id}, which the English file no longer has`,
        })
      }
    }
    for (const id of Object.keys(uk.rows ?? {}))
      if (!ids.has(id))
        problems.push({ file: ukName, message: `translated table ${id} has no English block` })
  }

  // The front-matter translation keys chapters by number and parts by numeral.
  if (files.includes('front.uk.json')) {
    const front = read('front.uk.json') as {
      chapters?: Record<string, string>
      parts?: Record<string, string>
      abbreviations?: Record<string, string>
    }
    const numbers = new Set(index.map((c) => String(c.number)))
    for (const key of Object.keys(front.chapters ?? {}))
      if (!numbers.has(key))
        problems.push({ file: 'front.uk.json', message: `chapter ${key} does not exist` })
    const parts = new Set((read('parts.json') as { roman: string }[]).map((p) => p.roman))
    for (const key of Object.keys(front.parts ?? {}))
      if (!parts.has(key))
        problems.push({ file: 'front.uk.json', message: `part ${key} does not exist` })
    const abbrs = new Set((read('abbreviations.json') as { abbr: string }[]).map((a) => a.abbr))
    for (const key of Object.keys(front.abbreviations ?? {}))
      if (!abbrs.has(key))
        notes.push(`front.uk.json: abbreviation "${key}" is not in the book's own list`)
  }

  console.log(
    `${chapterFiles.length} chapters, ${blocks} blocks, ${translated} translated ` +
      `(${blocks ? Math.round((translated / blocks) * 100) : 0}%), ` +
      `${chaptersStarted.length} chapters started, ${tablesWithoutGrid} tables without a grid`,
  )
  if (notes.length) {
    console.log(`\n${notes.length} note(s):`)
    for (const note of notes.slice(0, 20)) console.log('  ' + note)
    if (notes.length > 20) console.log(`  … and ${notes.length - 20} more`)
  }
  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`)
    for (const p of problems.slice(0, 40)) console.error(`  ${p.file}: ${p.message}`)
    if (problems.length > 40) console.error(`  … and ${problems.length - 40} more`)
    process.exitCode = 1
  } else {
    console.log('\nno problems')
  }
  if (orphans) console.error(`${orphans} orphaned translation(s) — move them to the new block ids`)
}
