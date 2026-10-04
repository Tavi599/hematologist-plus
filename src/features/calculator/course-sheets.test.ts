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

function sheets(overrides: Partial<CourseSheetsInput> = {}, catalog = demoCatalog()): XlsxSheet[] {
  const items = buildCourseItems(indexCatalog(catalog), 'r-chop-21')
  const course = calculateCourse(
    { ageYears: 60, sex: 'male', heightCm: 180, weightKg: 80, serumCreatinine: 88.4 },
    items.map((item) => item.courseDrug),
    { startDateIso: '2026-09-21', dayStart: '09:00', cycleNumber: overrides.cycleNumber ?? 1 },
  )
  return buildCourseSheets({
    items,
    course,
    startDateIso: '2026-09-21',
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

  it('writes a rising rate across the hours under the order, as the department does', () => {
    const catalog = demoCatalog()
    const params = catalog.drug_infusion_params.find((row) => row.drug_id === 'rituximab')!
    params.rate_ramp = {
      first: { start_ml_h: 25, step_ml_h: 25, every_min: 30, max_ml_h: 200 },
      next: { start_ml_h: 50, step_ml_h: 50, every_min: 30, max_ml_h: 200 },
    }
    const first = sheets({}, catalog)[0]!
    const index = first.rows.findIndex((row) =>
      String(text(row[0] ?? null) ?? '').startsWith('ДЕМО Ритуксимаб'),
    )
    // The route stays in its column; the rate is a line of its own across the lower row.
    expect(text(first.rows[index]![1] ?? null)).toBe('routeShort.iv_infusion')
    const note = String(text(first.rows[index + 1]![1] ?? null))
    expect(first.merges).toContain(`B${index + 2}:Z${index + 2}`)

    // A later cycle starts at the faster steps of the later infusions.
    expect(note).toBe(
      'Початкова швидкість (V1)= 25 мл/год. Пришвидшувати кожні 30 хв на 25 мл/год до досягнення максимальної швидкості (Vmax) = 200 мл/год.',
    )
    const later = sheets({ cycleNumber: 2 }, catalog)[0]!
    expect(String(text(later.rows[index + 1]![1] ?? null))).toBe(
      'Початкова швидкість (V1)= 50 мл/год. Пришвидшувати кожні 30 хв на 50 мл/год до досягнення максимальної швидкості (Vmax) = 200 мл/год.',
    )
  })

  it('writes an undiluted infusion in grams with its own volume in brackets', () => {
    const catalog = demoCatalog()
    const params = catalog.drug_infusion_params.find((row) => row.drug_id === 'rituximab')!
    params.bag_volumes_ml = []
    params.concentration_min_mg_ml = null
    params.concentration_max_mg_ml = null
    const day = sheets({}, catalog)[0]!
    // 375 mg/m² × 2.0 m² = 750 mg from a 10 mg/mL concentrate: 0,8 г in 75 mL, as «Біовен ___ гр (___ мл)».
    expect(text(bandStartingWith(day, 'ДЕМО Ритуксимаб')![0] ?? null)).toBe(
      'ДЕМО Ритуксимаб 0,8 гр (75 units.ml)',
    )
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
      // A day sheet carries the department's control line in it; the ward sheet is bare.
      const written = sheet.rows[last - 1]!.map((cell) => text(cell) ?? '').filter(
        (cell) => cell !== '',
      )
      expect(written.length).toBeLessThanOrEqual(1)
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
    // Four lines, as on the printed form — the order sits on one line with its date.
    expect(String(text(ward.rows[0]![16] ?? null))).toBe(
      'МЕДИЧНА ДОКУМЕНТАЦІЯ\nФорма первинної облікової документації №003-4/о\nЗАТВЕРДЖЕНО\nНаказ МОЗ України від 29.05.2013р. №435',
    )
    expect(String(text(ward.rows[1]![0] ?? null))).toBe('ЛИСТОК ЛІКАРСЬКИХ ПРИЗНАЧЕНЬ')
  })

  it('puts a drug with no clock time on the inpatient sheet, one column per day', () => {
    const ward = sheets().at(-1)!
    const prednisolone = bandStartingWith(ward, 'ДЕМО Преднізолон')!.map(text)

    // Five days of «+», one «-» on the day after the last — the department's own convention —
    // and then nothing.
    expect(prednisolone.slice(2, 2 + WARD_DAY_COLUMNS)).toEqual([
      ...Array.from({ length: 5 }, () => '+'),
      '-',
      ...Array.from({ length: WARD_DAY_COLUMNS - 6 }, () => null),
    ])
  })

  it('writes «-» on the days a drug is skipped inside its course, as VRD does', () => {
    // Dexamethasone on days 1-2, 4-5, 8-9 and 11-12: «+ + - + + - - + + - + + -».
    const items = buildCourseItems(indexCatalog(demoCatalog()), 'r-chop-21').map((item) =>
      item.courseDrug.block === 'ward'
        ? {
            ...item,
            courseDrug: { ...item.courseDrug, days: [1, 2, 4, 5, 8, 9, 11, 12] },
          }
        : item,
    )
    const course = calculateCourse(
      { ageYears: 60, sex: 'male', heightCm: 180, weightKg: 80 },
      items.map((item) => item.courseDrug),
      { startDateIso: '2026-09-21', dayStart: '09:00' },
    )
    const ward = sheets({ items, course }).at(-1)!
    const marks = bandStartingWith(ward, 'ДЕМО Преднізолон')!
      .map(text)
      .slice(2, 2 + 14)
    expect(marks).toEqual(['+', '+', '-', '+', '+', '-', '-', '+', '+', '-', '+', '+', '-', null])
  })

  it('gives every date its own column, also one on which nothing is given', () => {
    const ward = sheets().at(-1)!
    const dates = ward.rows[4]!.slice(2, 2 + 8).map((cell) => String(text(cell)))
    expect(dates).toEqual(['21.09', '22.09', '23.09', '24.09', '25.09', '26.09', '27.09', '28.09'])
  })

  it('prints the control line of the department at the foot of a day sheet only', () => {
    const built = sheets()
    const day = built[0]!
    expect(String(text(day.rows.at(-1)![0] ?? null))).toBe(
      'Контроль ваги, діурезу, АТ, ЧСС, температури тіла!',
    )
    expect(text(built.at(-1)!.rows.at(-1)![0] ?? null)).toBeNull()
  })

  it('writes the dose under every mark of a drug given several times a day', () => {
    const items = buildCourseItems(indexCatalog(demoCatalog()), 'r-chop-21').map((item) =>
      item.item.block === 'infusion' && item.item.drug_id === 'cyclophosphamide'
        ? {
            ...item,
            item: { ...item.item, administrations_per_day: 3 },
            courseDrug: { ...item.courseDrug, administrationsPerDay: 3, durationMin: 120 },
          }
        : item,
    )
    const course = calculateCourse(
      { ageYears: 60, sex: 'male', heightCm: 180, weightKg: 80 },
      items.map((item) => item.courseDrug),
      { startDateIso: '2026-09-21', dayStart: '09:00' },
    )
    const day = sheets({ items, course })[0]!
    const upper = day.rows.findIndex((row) =>
      String(text(row[0] ?? null) ?? '').startsWith('ДЕМО Циклофосфамід'),
    )
    const marks = day.rows[upper]!.slice(2).map(text)
    const under = day.rows[upper + 1]!.slice(2).map(text)
    expect(marks.filter((mark) => mark === '+')).toHaveLength(3)
    // The same three columns carry the dose beneath; the others stay empty.
    expect(under.map((cell, index) => (marks[index] === '+') === (cell !== null))).not.toContain(
      false,
    )
    expect(String(under.find((cell) => cell !== null))).toMatch(/units.mg$/)
  })

  describe('the ward layout', () => {
    it('puts the whole course on the inpatient sheet and makes no day sheets', () => {
      const built = sheets({ layout: 'ward' })
      expect(built.map((sheet) => sheet.name)).toEqual(['calculator.export.wardSheet'])
      const lines = orders(built[0]!, 5).join('|')
      // The infusion drugs are on it as well, not only the tablets.
      expect(lines).toContain('ДЕМО Ритуксимаб')
      expect(lines).toContain('ДЕМО Преднізолон')
    })

    it('marks an infusion drug on its day and dashes the days after it up to the last', () => {
      const ward = sheets({ layout: 'ward' })[0]!
      const rituximab = bandStartingWith(ward, 'ДЕМО Ритуксимаб')!
        .map(text)
        .slice(2, 2 + 7)
      // Given on day 1 only: «+» and then the single «-» of the day after.
      expect(rituximab).toEqual(['+', '-', null, null, null, null, null])
    })

    it('writes a tablet as «р.о. х 2р/добу (09:00 та 21:00)» when the protocol sets the interval', () => {
      const items = buildCourseItems(indexCatalog(demoCatalog()), 'r-chop-21').map((item) =>
        item.courseDrug.block === 'ward'
          ? {
              ...item,
              item: { ...item.item, administrations_per_day: 2, interval_min: 720 },
              courseDrug: { ...item.courseDrug, administrationsPerDay: 2 },
            }
          : item,
      )
      const course = calculateCourse(
        { ageYears: 60, sex: 'male', heightCm: 180, weightKg: 80 },
        items.map((item) => item.courseDrug),
        { startDateIso: '2026-09-21', dayStart: '09:00' },
      )
      const ward = sheets({ items, course, layout: 'ward', dayStart: '09:00' })[0]!
      const how = String(text(bandStartingWith(ward, 'ДЕМО Преднізолон')![1] ?? null))
      expect(how).toBe('routeShort.oral х 2р/добу (09:00 та 21:00)')
    })

    it('leaves a switched-off drug off the sheet', () => {
      const items = buildCourseItems(indexCatalog(demoCatalog()), 'r-chop-21')
      const course = calculateCourse(
        { ageYears: 60, sex: 'male', heightCm: 180, weightKg: 80 },
        items.map((item) => item.courseDrug),
        { startDateIso: '2026-09-21', dayStart: '09:00', disabledIds: ['r-chop-21.rituximab'] },
      )
      const ward = sheets({ items, course, layout: 'ward' })[0]!
      expect(orders(ward, 5).join('|')).not.toContain('ДЕМО Ритуксимаб')
    })
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

  it('prints a line written by hand as it was typed, marked at its own hour', () => {
    const built = sheets({
      manualRows: [
        {
          id: 'manual-1',
          what: 'Sol. NaCl 0,9% — 400,0 в/в крапельно',
          how: 'в/в крап. 120 мл/год',
          days: [1],
          hour: 14,
          block: 'infusion',
        },
      ],
    })
    const band = bandStartingWith(built[0]!, 'Sol. NaCl')!
    expect(String(text(band[1] ?? null))).toBe('в/в крап. 120 мл/год')
    // The hours run 9…24 then 1…8, so 14:00 is the sixth column of the grid.
    expect(text(band[2 + SHEET_HOURS.indexOf(14)] ?? null)).toBe('+')
    expect(text(band[2 + SHEET_HOURS.indexOf(15)] ?? null)).toBeNull()
  })

  it('makes a sheet for a day the course gives nothing on, when a line was written for it', () => {
    const built = sheets({
      manualRows: [
        { id: 'manual-1', what: 'Контроль ЗАК', how: '', days: [4], hour: 9, block: 'infusion' },
      ],
    })
    // The demo regimen gives on day 1 and days 1-5 on the ward; day 4 has no administration.
    const day4 = built.find((sheet) => String(text(sheet.rows[2]![0] ?? null)).includes('24 / 09'))
    expect(day4).toBeDefined()
    expect(orders(day4!, 4)).toContain('Контроль ЗАК')
  })

  it('puts a hand-written line of the inpatient sheet in its date columns, with no hour', () => {
    const built = sheets({
      manualRows: [
        {
          id: 'manual-1',
          what: 'Контроль маси тіла',
          how: '',
          days: [2, 3],
          hour: null,
          block: 'ward',
        },
      ],
    })
    const ward = built.at(-1)!
    const band = bandStartingWith(ward, 'Контроль маси')!
    expect(text(band[2] ?? null)).toBeNull()
    expect(text(band[3] ?? null)).toBe('+')
    expect(text(band[4] ?? null)).toBe('+')
    expect(text(band[5] ?? null)).toBeNull()
  })

  it('makes the sheets of a course that was written out entirely by hand', () => {
    const built = sheets({
      items: [],
      course: null,
      regimenName: null,
      manualRows: [
        {
          id: 'manual-1',
          what: 'Sol. Glucosae 5% — 400,0',
          how: 'в/в крап.',
          days: [1],
          hour: 10,
          block: 'infusion',
        },
        {
          id: 'manual-2',
          what: 'Омепразол 20 мг',
          how: 'р.о.',
          days: [1, 2],
          hour: null,
          block: 'ward',
        },
      ],
    })
    expect(built).toHaveLength(2)
    expect(orders(built[0]!, 4)).toContain('Sol. Glucosae 5% — 400,0')
    // Nothing was calculated, so the body surface of the heading is left empty rather than noughted.
    expect(String(text(built[0]!.rows[2]![18] ?? null))).toBe('S тіла: ')
    expect(bandStartingWith(built[1]!, 'Омепразол')).toBeDefined()
  })

  it('leaves a line with nothing written in it off the paper', () => {
    const built = sheets({
      manualRows: [{ id: 'manual-1', what: '   ', how: 'р.о.', days: [1], hour: 9, block: 'ward' }],
    })
    expect(bandStartingWith(built.at(-1)!, 'р.о.')).toBeUndefined()
  })

  it('sets a long hand-written order in smaller type instead of cutting it off', () => {
    const long =
      'Sol. NaCl 0,9% — 400,0 + KCl 4% — 40,0 + MgSO4 25% — 4,0 в/в крапельно 150 мл/год під контролем діурезу та рівня калію'
    const built = sheets({
      manualRows: [
        { id: 'manual-1', what: long, how: 'в/в крап.', days: [1], hour: 9, block: 'infusion' },
        {
          id: 'manual-2',
          what: 'Омепразол 40 мг',
          how: 'р.о.',
          days: [1],
          hour: 9,
          block: 'infusion',
        },
      ],
    })
    const cell = (first: string) =>
      built[0]!.rows.find((row) => String(text(row[0] ?? null) ?? '').startsWith(first))?.[0]
    const longCell = cell('Sol. NaCl') as XlsxCell
    const shortCell = cell('Омепразол') as XlsxCell
    expect(longCell.format?.font?.size).toBeLessThan(12)
    // A short order keeps the size the blank is written in.
    expect(shortCell.format?.font?.size).toBe(12)
  })

  it('names the patient and the day on every sheet of the course', () => {
    const built = sheets()
    expect(String(text(built[0]!.rows[0]![0] ?? null))).toBe('П.І.Б.: Тестовий Пацієнт')
    expect(String(text(built[0]!.rows[2]![0] ?? null))).toBe('Дата: 21 / 09 / 2026р.')
    expect(String(text(built.at(-1)!.rows[2]![1] ?? null))).toBe('123/26')
  })
})
