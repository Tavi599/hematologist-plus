import { describe, expect, it } from 'vitest'

import { calculateCourse } from '../../domain'
import { indexCatalog } from '../../lib/catalog-index'
import { demoCatalog } from '../../lib/catalog.fixture'
import { buildCourseItems } from '../../lib/course-input'
import type { XlsxCell, XlsxInput, XlsxSheet } from '../../lib/xlsx-writer'
import {
  buildCourseSheets,
  pageFill,
  SHEET_HOURS,
  WARD_DAY_COLUMNS,
  type CourseSheetsInput,
} from './course-sheets'
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
    header: {
      ...emptyHeader(),
      institution: 'КНП «Медичний центр міста Києва»',
      address: '02125, місто Київ, вул. Чорних Запорожців, буд. 26',
      registryCode: '42751893',
      department: 'Гематологія',
    },
    language: 'uk',
    t,
    ...overrides,
  })
}

const text = (cell: XlsxInput): string | number | null =>
  cell !== null && typeof cell === 'object' ? (cell as XlsxCell).value : cell

/** The order lines of a sheet: the first column of every band, from the first row after the ruler. */
const orders = (sheet: XlsxSheet, from: number) =>
  sheet.rows.slice(from).map((row) => String(text(row[0] ?? null) ?? ''))

const bandStartingWith = (sheet: XlsxSheet, first: string) =>
  sheet.rows.find((row) => String(text(row[0] ?? null) ?? '').startsWith(first))

describe('buildCourseSheets', () => {
  it('makes a sheet for every day with an administration and one inpatient sheet', () => {
    // Day 1 is the only day with infusions; prednisolone runs on days 1–5 without a clock time.
    const built = sheets()
    expect(built.map((sheet) => sheet.name)).toEqual([
      'R-CHOP-21 д1',
      'calculator.export.wardSheet',
    ])
  })

  it('keeps the two order columns and the 24 hours of the blank, and nothing else', () => {
    const [day] = sheets()
    expect(day!.widths).toHaveLength(2 + SHEET_HOURS.length)
    expect(day!.rows.every((row) => row.length <= 2 + SHEET_HOURS.length)).toBe(true)
    // The working day comes first and midnight is written as 24, as on the department's sheet.
    const ruler = day!.rows[3]!.slice(2).map(text)
    expect(ruler[0]).toBe('9')
    expect(ruler.at(-1)).toBe('8')
    expect(ruler).toContain('24')
  })

  it('marks an administration in the hour it starts in', () => {
    const [day] = sheets()
    const rituximab = bandStartingWith(day!, 'ДЕМО Ритуксимаб')!
    const grid = rituximab.slice(2).map(text)

    // The day starts at 09:00 and rituximab is first, so the mark sits in the first hour column.
    expect(SHEET_HOURS[0]).toBe(9)
    expect(grid[0]).toBe('+')
    expect(grid.filter((cell) => cell === '+')).toHaveLength(1)
  })

  it('writes what is given and how, and leaves the arithmetic off the sheet', () => {
    const [day] = sheets()
    const rituximab = bandStartingWith(day!, 'ДЕМО Ритуксимаб')!.map(text)

    expect(rituximab[0]).toBe(
      'ДЕМО Ритуксимаб 750 units.mg\nsolvent.sodium_chloride_0_9 250 units.ml',
    )
    expect(String(rituximab[1])).toContain('routeShort.iv_infusion')
    // No vial counts, no BSA, no dose steps: those belong to the supply form, not to the ward.
    const everything = day!.rows
      .flatMap((row) => row.map((cell) => String(text(cell) ?? '')))
      .join(' ')
    expect(everything).not.toContain('unitsValue')
    expect(everything).not.toContain('calculator.doses')
  })

  it('gives a drug repeated through the day one order line, not one per administration', () => {
    const items = buildCourseItems(indexCatalog(demoCatalog()), 'r-chop-21')
    const twiceDaily = items.map((item) =>
      item.courseDrug.id === 'r-chop-21.doxorubicin'
        ? { ...item.courseDrug, administrationsPerDay: 2 }
        : item.courseDrug,
    )
    const course = calculateCourse(
      { ageYears: 60, sex: 'male', heightCm: 180, weightKg: 80 },
      twiceDaily,
      { startDateIso: '2026-09-21', dayStart: '09:00' },
    )
    const [day] = sheets({ items, course })
    const lines = orders(day!, 4).filter((line) => line.startsWith('ДЕМО Доксорубіцин'))
    const marks = day!.rows
      .filter((row) => String(text(row[0] ?? null) ?? '').startsWith('ДЕМО Доксорубіцин'))
      .flatMap((row) => row.slice(2))
      .filter((cell) => text(cell) === '+')

    // One order line, and both administrations of the day marked on it.
    expect(lines).toHaveLength(1)
    expect(marks.length).toBeGreaterThanOrEqual(1)
    expect(
      course.days[0]!.administrations.filter((a) => a.drugId === 'r-chop-21.doxorubicin'),
    ).toHaveLength(2)
  })

  it('leaves a ruled, empty box at the foot of every sheet for a handwritten note', () => {
    for (const sheet of sheets()) {
      const last = sheet.rows.length
      expect(sheet.rows[last - 1]!.every((cell) => (text(cell) ?? '') === '')).toBe(true)
      expect(sheet.merges).toContain(`A${last}:Z${last}`)
      // Tall enough to write a line in; the department writes its notes by hand.
      expect(sheet.heights!.at(-1)).toBeGreaterThanOrEqual(30)
    }
  })

  it('rules the blank down to the foot of the page, not to a fixed number of lines', () => {
    const built = sheets()
    const [day] = built
    const ward = built.at(-1)!

    for (const sheet of built) {
      expect(sheet.heights).toHaveLength(sheet.rows.length)
      // The table reaches the foot of the page and stops there: no strip of bare paper under it,
      // and no last rule carried onto a second sheet.
      expect(pageFill(sheet)).toBeLessThanOrEqual(1)
      expect(pageFill(sheet)).toBeGreaterThan(0.9)
      expect(sheet.onePage).toBe(true)
    }
    // The inpatient sheet carries the printed stamp of form №003-4/о, so fewer order lines fit
    // on it — the blank follows the page it is printed on, not a number fixed in the code.
    expect(day!.rows.length).toBeGreaterThan(ward.rows.length)
    // Every order has a ruled line, and there are empty ones left over to write into by hand.
    const written = orders(day!, 4).filter((line) => line !== '').length
    expect(written).toBeGreaterThan(0)
    expect(written).toBeLessThan((day!.rows.length - 5) / 2)
  })

  it('leaves the measurement blank on the sheet when the form has none', () => {
    // A course calculated from a BSA entered by hand: the ward writes the height and weight in.
    const patient = {
      fullName: '',
      recordNumber: '',
      birthDate: '',
      ageYears: null,
      sex: 'male' as const,
      heightCm: null,
      weightKg: null,
      serumCreatinine: null,
      creatinineUnit: 'umol_l' as const,
      bilirubinUmolL: null,
    }
    const [day] = sheets({ patient })
    const measurements = day!.rows[2]!.map(text).filter((value) => value !== null)

    expect(measurements).toContain('Вік: ')
    expect(measurements).toContain('Маса тіла: ')
    expect(measurements).toContain('Зріст: ')
  })

  it('writes every hour and date so it fits the column it stands over', () => {
    const built = sheets()
    const hour = built[0]!.rows[3]![2] as XlsxCell
    const date = built.at(-1)!.rows[4]![2] as XlsxCell

    expect(date.value).toBe('21.09')
    // Wrapped in a column five characters wide, a date loses its month over the edge of the row.
    expect(hour.format!.wrap).toBeFalsy()
    expect(date.format!.wrap).toBeFalsy()
    expect(date.format!.align).toBe('center')
    // The long printed headings of form No 003-4/o are set in the smaller type for the same reason.
    const record = built.at(-1)!.rows[2]![0] as XlsxCell
    expect(record.format!.wrap).toBeFalsy()
    expect(record.format!.font!.size).toBe(10)
  })

  it('runs a course with more orders than the blank has lines onto a second page', () => {
    const base = buildCourseItems(indexCatalog(demoCatalog()), 'r-chop-21')
    const ward = base.find((item) => item.item.block === 'ward')!
    const crowd = Array.from({ length: 20 }, (_unused, index) => ({
      ...ward,
      item: { ...ward.item, id: `${ward.item.id}.${index}` },
      courseDrug: { ...ward.courseDrug, id: `${ward.item.id}.${index}` },
    }))
    const items = [...base.filter((item) => item.item.block !== 'ward'), ...crowd]
    const course = calculateCourse(
      { ageYears: 60, sex: 'male', heightCm: 180, weightKg: 80 },
      items.map((item) => item.courseDrug),
      { startDateIso: '2026-09-21' },
    )

    const sheet = sheets({ items, course }).at(-1)!
    // Every order keeps its own ruled line; the sheet is not squeezed to fit one page.
    expect(orders(sheet, 5).filter((line) => line !== '')).toHaveLength(20)
    expect(sheet.onePage).toBe(false)
    expect(pageFill(sheet)).toBeGreaterThan(1)
  })

  it('leaves the second row of each band free for the nurse to sign off in', () => {
    const [day] = sheets()
    const rituximabRow = day!.rows.findIndex((row) =>
      String(text(row[0] ?? null) ?? '').startsWith('ДЕМО Ритуксимаб'),
    )
    expect(day!.rows[rituximabRow + 1]!.every((cell) => text(cell) === null)).toBe(true)
    expect(day!.merges).toContain(`A${rituximabRow + 1}:A${rituximabRow + 2}`)
  })

  it('stamps the department and the form number on the inpatient sheet', () => {
    const ward = sheets().at(-1)!
    const stamp = String(text(ward.rows[0]![0] ?? null))

    expect(stamp).toContain('КНП «Медичний центр міста Києва»')
    expect(stamp).toContain('вул. Чорних Запорожців')
    expect(stamp).toContain('Код за ЄДРПОУ 42751893')
    // The stamp box is wide enough for the institution's current, much longer name.
    expect(ward.merges).toContain('A1:F1')
    expect(String(text(ward.rows[0]![16] ?? null))).toContain('№003-4/о')
    expect(String(text(ward.rows[1]![0] ?? null))).toBe('ЛИСТОК ЛІКАРСЬКИХ ПРИЗНАЧЕНЬ')
  })

  it('puts a drug with no clock time on the inpatient sheet, one column per day', () => {
    const ward = sheets().at(-1)!
    const prednisolone = bandStartingWith(ward, 'ДЕМО Преднізолон')!.map(text)

    expect(prednisolone.slice(2, 2 + WARD_DAY_COLUMNS)).toEqual([
      ...Array.from({ length: 5 }, () => '+'),
      ...Array.from({ length: WARD_DAY_COLUMNS - 5 }, () => null),
    ])
  })

  it('continues on a second inpatient sheet instead of dropping a day off the blank', () => {
    const items = buildCourseItems(indexCatalog(demoCatalog()), 'r-chop-21')
    const long = items.map((item) =>
      item.courseDrug.block === 'ward'
        ? { ...item.courseDrug, days: Array.from({ length: 30 }, (_unused, day) => day + 1) }
        : item.courseDrug,
    )
    const course = calculateCourse(
      { ageYears: 60, sex: 'male', heightCm: 180, weightKg: 80 },
      long,
      {
        startDateIso: '2026-09-21',
      },
    )

    const built = sheets({ items, course })
    expect(
      built.filter((sheet) => sheet.name.startsWith('calculator.export.wardSheet')),
    ).toHaveLength(2)
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

  it('names the patient and the day on every sheet of the course', () => {
    const built = sheets()
    expect(String(text(built[0]!.rows[0]![0] ?? null))).toBe('П.І.Б.: Тестовий Пацієнт')
    expect(String(text(built[0]!.rows[2]![0] ?? null))).toBe('Дата: 21 / 09 / 2026р.')
    expect(String(text(built.at(-1)!.rows[2]![1] ?? null))).toBe('123/26')
  })
})
