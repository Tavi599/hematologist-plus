/**
 * Imports the hospital's procurement lists (.xlsx) into data/drugs/*.json.
 *
 *   npx tsx scripts/import-sources/drugs-from-lists.ts <file.xlsx> [more.xlsx ...] [--write]
 *
 * Only what the calculator needs is taken: INN and pack strengths. Registry flags
 * (Нацперелік / ДЕЦ / договори керованого доступу) are deliberately not imported —
 * they are not used in calculations and go out of date quickly.
 *
 * Nothing is guessed: unknown names, ambiguous strengths and values that disagree
 * between files are reported instead of being written.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { readWorkbook, type CellValue } from '../lib/xlsx'
import { findDrugName, type DrugName } from './drug-names'
import { parseForm, parseStrength, type PresentationForm } from './parse-strength'

interface SourceRow {
  file: string
  sheet: string
  row: number
  name: string
  form: string
  strength: string
}

interface Presentation {
  key: string
  form: PresentationForm
  strength_mg: number
  volume_ml?: number
}

export interface ImportIssue {
  kind: 'unknown-name' | 'unreadable-strength' | 'conflict' | 'implausible' | 'skipped'
  drug: string
  detail: string
  where: string
}

const HEADER_HINTS = ['міжнародна непатентована', 'препарат', 'назва']

const text = (value: CellValue | undefined) => (typeof value === 'string' ? value.trim() : '')

/**
 * Finds the columns holding the name, the form and the strength on a sheet.
 * The hints are tried in order of precision: one list has both "Назва заходу міської
 * програми" and "Міжнародна непатентована назва" in the same header row.
 */
function findColumns(rows: CellValue[][]): { name: number; form: number; strength: number } | null {
  for (const row of rows.slice(0, 10)) {
    const cells = row.map((cell) => text(cell).toLowerCase())
    const name =
      HEADER_HINTS.map((hint) => cells.findIndex((cell) => cell.startsWith(hint))).find(
        (index) => index >= 0,
      ) ?? -1
    const form = cells.findIndex((cell) => cell.startsWith('форма випуску'))
    const strength = cells.findIndex((cell) => cell.startsWith('дозування'))
    if (name >= 0 && form >= 0 && strength >= 0) return { name, form, strength }
  }
  return null
}

export function collectRows(files: string[]): { rows: SourceRow[]; issues: ImportIssue[] } {
  const rows: SourceRow[] = []
  const issues: ImportIssue[] = []
  for (const file of files) {
    for (const sheet of readWorkbook(file)) {
      const columns = findColumns(sheet.rows)
      if (!columns) continue
      sheet.rows.forEach((cells, index) => {
        const name = text(cells[columns.name])
        const strength = text(cells[columns.strength])
        if (name === '' || strength === '') return
        if (HEADER_HINTS.some((hint) => name.toLowerCase().startsWith(hint))) return
        // Programme headings such as «2.35. «Забезпечення хіміопрепаратами...»» are not drugs.
        if (/^\d+\.\d+/.test(name) || name.length > 60) return
        rows.push({
          file: file.split(/[\\/]/).pop() ?? file,
          sheet: sheet.name,
          row: index + 1,
          name,
          form: text(cells[columns.form]),
          strength,
        })
      })
    }
  }
  return { rows, issues }
}

/** Obvious mechanical errors: a tablet of 5 g, an ampoule of a microgram. */
function implausible(form: PresentationForm, strengthMg: number): string | null {
  if (form === 'tablet' || form === 'capsule') {
    if (strengthMg > 2000) return `таблетка/капсула ${strengthMg} мг — завелика`
    if (strengthMg < 0.1) return `таблетка/капсула ${strengthMg} мг — замала`
  }
  if (strengthMg > 10_000) return `${strengthMg} мг на одиницю — завелика`
  if (strengthMg <= 0) return 'дозування не додатне'
  return null
}

function presentationKey(strengthMg: number, volumeMl?: number): string {
  const strength = String(strengthMg).replace('.', '-')
  return volumeMl === undefined
    ? `s${strength}`
    : `s${strength}-v${String(volumeMl).replace('.', '-')}`
}

export function buildDrugs(rows: SourceRow[]): {
  drugs: Map<string, { name: DrugName; presentations: Presentation[]; sources: Set<string> }>
  issues: ImportIssue[]
} {
  const drugs = new Map<
    string,
    { name: DrugName; presentations: Presentation[]; sources: Set<string> }
  >()
  const issues: ImportIssue[] = []
  // Same pack seen in several files: the strengths must agree.
  const seen = new Map<string, { volumeMl?: number; where: string }>()

  for (const row of rows) {
    const where = `${row.file} · ${row.sheet} · рядок ${row.row}`
    const found = findDrugName(row.name)
    if (found === null) {
      issues.push({ kind: 'unknown-name', drug: row.name, detail: 'немає в таблиці назв', where })
      continue
    }
    if ('skip' in found) {
      issues.push({ kind: 'skipped', drug: row.name, detail: found.skip, where })
      continue
    }
    const name = found

    const form = parseForm(row.form)
    if (form === null) {
      issues.push({
        kind: 'unreadable-strength',
        drug: name.uk,
        detail: `форма «${row.form}»`,
        where,
      })
      continue
    }
    if (name.combination) {
      issues.push({
        kind: 'skipped',
        drug: name.uk,
        detail: 'комбінований препарат: фасування не імпортується',
        where,
      })
      continue
    }

    const parsed = parseStrength(row.strength)
    if (!parsed.ok) {
      issues.push({
        kind: 'unreadable-strength',
        drug: name.uk,
        detail: `«${row.strength}» — ${parsed.reason}`,
        where,
      })
      continue
    }

    const entry = drugs.get(name.id) ?? { name, presentations: [], sources: new Set<string>() }
    entry.sources.add(row.file)
    for (const strength of parsed.strengths) {
      const problem = implausible(form, strength.strengthMg)
      if (problem) {
        issues.push({ kind: 'implausible', drug: name.uk, detail: problem, where })
        continue
      }
      const key = `${name.id}|${form}|${strength.strengthMg}`
      const previous = seen.get(key)
      // One list gives "450 мг", another "450 мг/45 мл": that is the same pack described
      // in more detail. Only two different volumes are a real disagreement.
      if (
        previous &&
        previous.volumeMl !== undefined &&
        strength.volumeMl !== undefined &&
        previous.volumeMl !== strength.volumeMl
      ) {
        issues.push({
          kind: 'conflict',
          drug: name.uk,
          detail: `${strength.strengthMg} мг: об'єм ${previous.volumeMl} мл проти ${strength.volumeMl} мл (${previous.where})`,
          where,
        })
        continue
      }
      const volumeMl = strength.volumeMl ?? previous?.volumeMl
      seen.set(key, { ...(volumeMl === undefined ? {} : { volumeMl }), where })

      const presentationId = presentationKey(strength.strengthMg)
      const existing = entry.presentations.find((item) => item.key === presentationId)
      if (existing) {
        if (volumeMl !== undefined) existing.volume_ml = volumeMl
        continue
      }
      entry.presentations.push({
        key: presentationId,
        form,
        strength_mg: strength.strengthMg,
        ...(volumeMl === undefined ? {} : { volume_ml: volumeMl }),
      })
    }
    drugs.set(name.id, entry)
  }

  for (const entry of drugs.values()) {
    entry.presentations.sort((a, b) => a.strength_mg - b.strength_mg)
  }
  return { drugs, issues }
}

function drugFile(
  entry: { name: DrugName; presentations: Presentation[]; sources: Set<string> },
  today: string,
): string {
  const body = {
    $comment: `Імпортовано з ${[...entry.sources].join(', ')} ${today}. Взято лише МНН і фасування; параметри розведення та максимальні дози додаються окремо.`,
    id: entry.name.id,
    name: { uk: entry.name.uk, en: entry.name.en },
    ...(entry.name.tradeNames ? { trade_names: entry.name.tradeNames } : {}),
    presentations: entry.presentations,
  }
  return JSON.stringify(body, null, 2) + '\n'
}

function main() {
  const args = process.argv.slice(2)
  const write = args.includes('--write')
  const files = args.filter((arg) => !arg.startsWith('--'))
  if (files.length === 0) {
    console.error('Usage: tsx scripts/import-sources/drugs-from-lists.ts <file.xlsx> [--write]')
    process.exitCode = 1
    return
  }

  const collected = collectRows(files)
  const built = buildDrugs(collected.rows)
  const issues = [...collected.issues, ...built.issues]
  const today = new Date().toISOString().slice(0, 10)

  console.log(`Рядків прочитано: ${collected.rows.length}; препаратів: ${built.drugs.size}`)

  const grouped = new Map<ImportIssue['kind'], ImportIssue[]>()
  for (const issue of issues) grouped.set(issue.kind, [...(grouped.get(issue.kind) ?? []), issue])
  const titles: Record<ImportIssue['kind'], string> = {
    'unknown-name': 'Назви, яких немає в таблиці перекладу (не імпортовано)',
    'unreadable-strength': 'Дозування, які неможливо розібрати однозначно (не імпортовано)',
    conflict: 'РОЗБІЖНОСТІ МІЖ ФАЙЛАМИ — потребують вашого рішення',
    implausible: 'НЕПРАВДОПОДІБНІ ЗНАЧЕННЯ — схоже на механічну помилку',
    skipped: 'Свідомо пропущено',
  }
  for (const kind of [
    'conflict',
    'implausible',
    'unknown-name',
    'unreadable-strength',
    'skipped',
  ] as const) {
    const list = grouped.get(kind) ?? []
    if (list.length === 0) continue
    console.log(`\n${titles[kind]} (${list.length}):`)
    const unique = new Map<string, ImportIssue>()
    for (const issue of list) unique.set(`${issue.drug}|${issue.detail}`, issue)
    for (const issue of unique.values()) console.log(`  • ${issue.drug}: ${issue.detail}`)
  }

  if (!write) {
    console.log('\nПробний запуск. Додайте --write, щоб записати data/drugs/.')
    return
  }

  const directory = join('data', 'drugs')
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true })
  let written = 0
  for (const entry of built.drugs.values()) {
    const file = join(directory, `${entry.name.id}.json`)
    const content = drugFile(entry, today)
    // Keep files that were edited by hand after the import untouched unless they changed.
    if (existsSync(file) && readFileSync(file, 'utf8') === content) continue
    writeFileSync(file, content)
    written++
  }
  console.log(`\nЗаписано файлів: ${written} у ${directory}`)
}

main()
