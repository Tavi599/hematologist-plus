import { describe, expect, it } from 'vitest'

import { calculateCourse } from '../../domain'
import { indexCatalog } from '../../lib/catalog-index'
import { demoCatalog } from '../../lib/catalog.fixture'
import { buildCourseItems } from '../../lib/course-input'
import type { XlsxCell, XlsxInput, XlsxSheet } from '../../lib/xlsx-writer'
import { buildCourseSheets, SHEET_HOURS, type CourseSheetsInput } from './course-sheets'
import { emptyHeader } from './header'

/** Translations are not under test here: the key comes back with its parameters filled in. */
const t = (key: string, params?: Record<string, unknown>) =>
  Object.entries(params ?? {}).reduce(
    (text, [name, value]) => text.replace(`{{${name}}}`, String(value)),
    key,
  )

function sheets(overrides: Partial<CourseSheetsInput> = {}): XlsxSheet[] {
  const items = buildCourseItems(indexCatalog(demoCatalog()), 'r-chop-21')
  const course = calculateCourse(
    { ageYears: 60, sex: 'male', heightCm: 180, weightKg: 80, serumCreatinine: 88.4 },
    items.map((item) => item.courseDrug),
    { startDateIso: '2026-09-21', dayStart: '09:00' },
  )
  return buildCourseSheets({
    items,
    course,
    patient: {
      fullName: 'Тестовий Пацієнт',
      recordNumber: '123/26',
      birthDate: '',
      ageYears: 60,
      sex: 'male',
      heightCm: 180,
      weightKg: 80,
      serumCreatinine: 88.4,
      creatinineUnit: 'umol_l',
      bilirubinUmolL: null,
    },
    regimenName: 'R-CHOP-21',
    cycleNumber: 1,
    header: { ...emptyHeader(), institution: 'Лікарня', department: 'Гематологія' },
    language: 'uk',
    t,
    ...overrides,
  })
}

const text = (cell: XlsxInput): string | number | null =>
  cell !== null && typeof cell === 'object' ? (cell as XlsxCell).value : cell

const rowStartingWith = (sheet: XlsxSheet, first: string) =>
  sheet.rows.find((row) => String(text(row[1] ?? null) ?? '').startsWith(first))

describe('buildCourseSheets', () => {
  it('makes a sheet for every day with an administration and one inpatient sheet', () => {
    // Day 1 is the only day with infusions; prednisolone runs on days 1–5 without a clock time.
    const built = sheets()
    expect(built.map((sheet) => sheet.name)).toEqual([
      'calculator.schedule.day 21.09',
      'calculator.export.wardSheet',
    ])
  })

  it('marks an administration in the hour it starts in', () => {
    const [day] = sheets()
    const rituximab = rowStartingWith(day!, 'ДЕМО Ритуксимаб')!
    const grid = rituximab.slice(-SHEET_HOURS.length).map(text)

    // The day starts at 09:00 and rituximab is first, so the mark sits in the first hour column.
    expect(SHEET_HOURS[0]).toBe(9)
    expect(grid[0]).toBe('+')
    expect(grid.filter((cell) => cell === '+')).toHaveLength(1)
  })

  it('carries the dose, the packs, the dilution and the rate of each row', () => {
    const [day] = sheets()
    const rituximab = rowStartingWith(day!, 'ДЕМО Ритуксимаб')!.map(text)

    expect(rituximab[2]).toBe('750 units.mg')
    expect(rituximab[3]).toContain('calculator.doses.unitsValue')
    expect(rituximab[4]).toContain('calculator.doses.infusionValue')
    // The demo regimen gives no duration, so the row says so instead of inventing an end time.
    expect(rituximab[6]).toBe('09:00 · calculator.schedule.noDuration')
  })

  it('puts a drug with no clock time on the inpatient sheet, one column per course day', () => {
    const built = sheets()
    const ward = built.at(-1)!
    const prednisolone = rowStartingWith(ward, 'ДЕМО Преднізолон')!.map(text)

    // 4 columns of drug data, then one per day of the course: days 1–5.
    expect(prednisolone.slice(4)).toEqual(['+', '+', '+', '+', '+'])
    expect(ward.rows.some((row) => String(text(row[0] ?? null) ?? '').includes('wardTitle'))).toBe(
      true,
    )
  })

  it('names the patient, the ward and the regimen above every table', () => {
    for (const sheet of sheets()) {
      const labels = sheet.rows.map((row) => String(text(row[1] ?? null) ?? ''))
      expect(labels).toContain('Тестовий Пацієнт')
      expect(labels).toContain('Гематологія')
      expect(labels.some((label) => label.startsWith('R-CHOP-21'))).toBe(true)
    }
  })

  it('leaves out the inpatient sheet when nothing belongs on it', () => {
    const catalog = demoCatalog()
    catalog.regimen_items = catalog.regimen_items.filter((row) => row.block !== 'ward')
    const items = buildCourseItems(indexCatalog(catalog), 'r-chop-21')
    const course = calculateCourse(
      { ageYears: 60, sex: 'male', heightCm: 180, weightKg: 80 },
      items.map((item) => item.courseDrug),
      { startDateIso: '2026-09-21' },
    )

    expect(sheets({ items, course })).toHaveLength(1)
  })
})
