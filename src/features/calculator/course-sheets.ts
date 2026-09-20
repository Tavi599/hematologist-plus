import type { CourseDrugResult, CourseResult } from '../../domain'
import type { CourseItem } from '../../lib/course-input'
import { formatAmount, formatDate } from '../../lib/format'
import type { Language } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { XlsxBox, XlsxFormat, XlsxInput, XlsxSheet } from '../../lib/xlsx-writer'
import { columnName } from '../../lib/xlsx-writer'
import type { PatientInput } from '../../schemas/patient'
import type { HeaderValue } from './header'

/**
 * The calculated course on the department's own blanks: one sheet per day with an infusion, laid
 * out exactly like the sheet the nurse works from — two columns of orders and the 24 hours of the
 * day, the working day first and the night after it — plus the inpatient prescription list
 * (form №003-4/о) for everything that carries no clock time.
 *
 * Only what the ward needs goes on paper. Doses, solvent volumes, rates: yes. How a dose was
 * arrived at — BSA arithmetic, vial counts, reductions — stays on screen and in the supply form.
 *
 * Pure: it only turns what is already on screen into rows, so patient data never leaves the tab.
 */

/** Keys built at runtime are translated by the caller; only plain lookups are used here. */
export type Translate = (key: string, params?: Record<string, unknown>) => string

export interface CourseSheetsInput {
  items: CourseItem[]
  course: CourseResult
  patient: PatientInput
  /** Name of the regimen as chosen in the calculator; null for a course put together by hand. */
  regimenName: string | null
  cycleNumber: number
  header: HeaderValue
  language: Language
  t: Translate
}

/** Hours of the department's sheet: 9…24 then 1…8, so the working day comes first. */
export const SHEET_HOURS = [
  ...Array.from({ length: 15 }, (_unused, index) => index + 9),
  ...Array.from({ length: 9 }, (_unused, index) => index),
]

/** Date columns of the inpatient sheet; the blank has exactly this many. */
export const WARD_DAY_COLUMNS = 24

/** Two columns of orders before the grid: what is given, and how. */
const ORDER_COLUMNS = 2
const ORDER_WIDTH = 34.2
const HOW_WIDTH = 16.9
const GRID_WIDTH = 5

/** Each order takes two ruled rows: the prescription above, the nurse's sign-off below. */
const BAND_ROW_HEIGHT = 23.25
const BAND_HEIGHT = BAND_ROW_HEIGHT * 2

/**
 * The paper: A4 landscape with the margins the writer prints on every sheet.
 *
 * Excel scales these sheets to the width of the page (`fitToWidth`), so the scale follows from
 * the columns alone — and from the scale follows how much of the page one ruled line takes. That
 * is what lets the blank be ruled down to the foot of the page instead of to a fixed number of
 * lines: a sheet with a taller heading simply gets fewer lines, and the space left under the
 * table is the same margin as above it.
 */
const PAGE_WIDTH_PT = 841.9
const PAGE_HEIGHT_PT = 595.3
const MARGIN_SIDE_PT = 28.8
const MARGIN_EDGE_PT = 36

/**
 * How wide one unit of column width prints, in points. Excel measures a column in characters of
 * the workbook's own font, so this is a property of the sheet rather than of the format, and the
 * figure here is measured off a printed sheet (Arial 11). It does not have to be exact: a sheet
 * ruled a line too far is printed a per cent smaller (`onePage`), not broken over two pages.
 */
const POINTS_PER_WIDTH_UNIT = 7.9

/**
 * Text the blank itself carries. It is Ukrainian whatever language the app is showing, because
 * it is a Ukrainian form: №003-4/о is the inpatient prescription list approved by order of the
 * Ministry of Health of 29.05.2013 №435, and the rest is the department's own wording.
 */
const BLANK = {
  patient: 'П.І.Б.: ',
  diagnosis: 'Діагноз: ',
  age: 'Вік: ',
  weight: 'Маса тіла: ',
  height: 'Зріст: ',
  bodySurface: 'S тіла: ',
  orders: 'Призначення                                                         / Час',
  wardOrders: 'Призначення                                                           / Дата',
  wardForm:
    'МЕДИЧНА ДОКУМЕНТАЦІЯ\nФорма первинної облікової документації\n№003-4/о\nЗАТВЕРДЖЕНО\nНаказ МОЗ України\n29.05.2013р. №435',
  wardHeading: 'ЛИСТОК ЛІКАРСЬКИХ ПРИЗНАЧЕНЬ',
  wardRecord: 'Номер медичної карти стаціонарного пацієнта:',
  wardPatient: 'П.І.Б. пацієнта: ',
  wardRoom: 'Номер палати:',
  wardMode: 'Режим: палатний            Дієта: стіл №5',
  registryCode: 'Код за ЄДРПОУ ',
  rate: 'V= ',
  perDay: ' р/добу',
} as const

const MARK = '+'

type XlsxLineSet = Required<XlsxBox>
const THIN: XlsxLineSet = { left: 'thin', right: 'thin', top: 'thin', bottom: 'thin' }

const ARIAL_12 = { size: 12 }
const ARIAL_10 = { size: 10 }
/**
 * A heading cell holds one line and is centred in it. Wrapping is off on purpose: a wrapped line
 * that outgrows its row is simply cut off by Excel, and a heading that reads «Номер медичної
 * карти» where the blank says «Номер медичної карти стаціонарного пацієнта» is worse than a
 * heading set a point smaller.
 */
const HEADER_FORMAT: XlsxFormat = { font: ARIAL_12, box: THIN, valign: 'center' }
/** The same, for the long printed headings of form №003-4/о, which need the smaller type. */
const LABEL_FORMAT: XlsxFormat = { font: ARIAL_10, box: THIN, valign: 'center' }
const NAME_FORMAT: XlsxFormat = {
  font: { size: 13, bold: true },
  box: THIN,
  valign: 'top',
  wrap: true,
}
const STAMP_FORMAT: XlsxFormat = { font: ARIAL_10, box: THIN, valign: 'top', wrap: true }
const TITLE_FORMAT: XlsxFormat = {
  font: { size: 13, bold: true },
  box: THIN,
  align: 'center',
  valign: 'center',
}
/**
 * The box at the foot of every sheet: left empty on purpose. In the blank we were given it
 * carried a printed warning, but the department writes its notes by hand, so the app prints the
 * ruled space and nothing in it — tall enough for a line of handwriting.
 */
const NOTE_FORMAT: XlsxFormat = {
  font: { size: 12, bold: true },
  box: { left: 'medium', right: 'medium', top: 'medium', bottom: 'medium' },
  valign: 'center',
}
const NOTE_HEIGHT = 34

/** Every sixth hour is ruled off, the way the department's own sheet marks the shift. */
const GROUP_EVERY = 6

export function buildCourseSheets(input: CourseSheetsInput): XlsxSheet[] {
  const days = input.course.days
    .filter((day) => day.administrations.length > 0)
    .map((day) => daySheet(input, day))
  return [...days, ...wardSheets(input)]
}

/* ------------------------------------------------------------------ the day sheet ---------- */

function daySheet(input: CourseSheetsInput, day: CourseResult['days'][number]): XlsxSheet {
  const { language, patient, course } = input
  const lastColumn = columnName(ORDER_COLUMNS + SHEET_HOURS.length - 1)
  const widths = [ORDER_WIDTH, HOW_WIDTH, ...SHEET_HOURS.map(() => GRID_WIDTH)]
  const rows: XlsxInput[][] = []
  const merges: string[] = []
  const heights: number[] = []

  // Rows 1-2: who the sheet is for. The diagnosis is left for the ward to write in, as on the
  // blank: the calculator is given a regimen, not a diagnosis, and must not guess one.
  rows.push([
    { value: BLANK.patient + (patient.fullName || ''), format: NAME_FORMAT },
    { value: null, format: HEADER_FORMAT },
    ...spread(BLANK.diagnosis, 13, HEADER_FORMAT),
    ...spread('', 11, HEADER_FORMAT),
  ])
  rows.push([
    { value: null, format: NAME_FORMAT },
    { value: null, format: HEADER_FORMAT },
    ...spread('', 24, HEADER_FORMAT),
  ])
  merges.push('A1:A2', 'C1:O1', 'P1:Z1', 'C2:Z2')
  // Two rows deep, so a long patient name has a second line to wrap onto.
  heights.push(17, 17)

  // Row 3: the measurements the nurse checks a dose against.
  rows.push([
    { value: dateLine(day.date), format: HEADER_FORMAT },
    { value: null, format: HEADER_FORMAT },
    ...spread(`${BLANK.age}${given(patient.ageYears, language)}`, 4, HEADER_FORMAT),
    ...spread(`${BLANK.weight}${given(patient.weightKg, language, 1)}`, 6, HEADER_FORMAT),
    ...spread(`${BLANK.height}${given(patient.heightCm, language, 1)}`, 6, HEADER_FORMAT),
    ...spread(
      `${BLANK.bodySurface}${formatAmount(course.bsa.actualM2, language, 2)} ${input.t('units.m2')}`,
      8,
      HEADER_FORMAT,
    ),
  ])
  merges.push('C3:F3', 'G3:L3', 'M3:R3', 'S3:Z3')
  heights.push(16.8)

  // Row 4: the hour ruler.
  rows.push([
    { value: BLANK.orders, format: ORDER_HEAD_FORMAT },
    { value: null, format: ORDER_HEAD_FORMAT },
    ...SHEET_HOURS.map((hour) => ({ value: hourLabel(hour), format: RULER_FORMAT })),
  ])
  merges.push('A4:B4')
  heights.push(15.6)

  const orders = dayOrders(input, day)
  const ruled = appendBands(
    rows,
    merges,
    heights,
    widths,
    orders.map((order) => ({
      what: order.what,
      how: order.how,
      marks: SHEET_HOURS.map((hour) => (order.hours.has(hour) ? MARK : null)),
    })),
  )

  rows.push([{ value: null, format: NOTE_FORMAT }, ...spread('', 25, NOTE_FORMAT)])
  merges.push(`A${rows.length}:${lastColumn}${rows.length}`)
  heights.push(NOTE_HEIGHT)

  return {
    name: dayTabName(input, day),
    widths,
    heights,
    rows,
    merges,
    onePage: orders.length <= ruled,
  }
}

interface Order {
  what: string
  how: string
  /** Hours of this day the drug is given in; several for a drug repeated through the day. */
  hours: Set<number>
}

/**
 * One line per drug, not per administration: a drug given four times a day is one order with
 * four marks, exactly as the ward writes it.
 */
function dayOrders(input: CourseSheetsInput, day: CourseResult['days'][number]): Order[] {
  const byId = new Map(input.items.map((item) => [item.item.id, item]))
  const resultById = new Map(input.course.drugs.map((drug) => [drug.id, drug]))
  const orders = new Map<string, Order>()

  for (const administration of day.administrations) {
    const hour = Math.floor(administration.startMin / 60) % 24
    const known = orders.get(administration.drugId)
    if (known) {
      known.hours.add(hour)
      continue
    }
    const item = byId.get(administration.drugId)
    const result = resultById.get(administration.drugId)
    orders.set(administration.drugId, {
      what: whatLine(administration.drugId, item, result, input),
      how: howLine(item, result, input),
      hours: new Set([hour]),
    })
  }
  return [...orders.values()]
}

/* ------------------------------------------------------------- the inpatient sheet --------- */

/**
 * Form №003-4/о: one row per drug that has no clock time, one column per day. These rows are
 * never moved by a shift, which is exactly why they print on their own sheet. The blank is ruled
 * for 24 days, so a longer course continues on a second sheet rather than losing a column.
 */
function wardSheets(input: CourseSheetsInput): XlsxSheet[] {
  const wardItems = input.items.filter((item) => item.item.block === 'ward')
  if (wardItems.length === 0) return []

  const pages: CourseResult['days'][] = []
  for (let start = 0; start < input.course.days.length; start += WARD_DAY_COLUMNS) {
    pages.push(input.course.days.slice(start, start + WARD_DAY_COLUMNS))
  }
  return pages.map((days, index) => wardSheet(input, wardItems, days, index, pages.length))
}

function wardSheet(
  input: CourseSheetsInput,
  wardItems: CourseItem[],
  days: CourseResult['days'],
  page: number,
  pages: number,
): XlsxSheet {
  const { language, patient, header, t } = input
  const lastColumn = columnName(ORDER_COLUMNS + WARD_DAY_COLUMNS - 1)
  const widths = [
    ORDER_WIDTH,
    HOW_WIDTH,
    ...Array.from({ length: WARD_DAY_COLUMNS }, () => GRID_WIDTH),
  ]
  const rows: XlsxInput[][] = []
  const merges: string[] = []
  const heights: number[] = []

  // Row 1: the department's stamp on the left, the form's own designation on the right. The
  // stamp box is wider and taller than in the blank we were given: the institution has been
  // renamed since, and the new name is long enough to be clipped by the old five-line box.
  rows.push([
    { value: stampLines(header), format: STAMP_FORMAT },
    ...spread('', 5, STAMP_FORMAT),
    ...spread('', 10, STAMP_FORMAT),
    { value: BLANK.wardForm, format: STAMP_FORMAT },
    ...spread('', 9, STAMP_FORMAT),
  ])
  merges.push('A1:F1', 'Q1:Z1')
  // Six printed lines of the form's designation at ten points, and the stamp beside it: the box
  // is ruled to hold them whole, down to the order the form was approved by.
  heights.push(84)

  rows.push([{ value: BLANK.wardHeading, format: TITLE_FORMAT }, ...spread('', 25, TITLE_FORMAT)])
  merges.push(`A2:${lastColumn}2`)
  heights.push(18)

  rows.push([
    { value: BLANK.wardRecord, format: LABEL_FORMAT },
    { value: patient.recordNumber || null, format: LABEL_FORMAT },
    ...spread(BLANK.wardPatient, 3, LABEL_FORMAT),
    ...spread(patient.fullName || '', 16, LABEL_FORMAT),
    ...spread(BLANK.wardRoom, 3, LABEL_FORMAT),
    ...spread('', 2, LABEL_FORMAT),
  ])
  merges.push('C3:E3', 'F3:U3', 'V3:X3', 'Y3:Z3')
  heights.push(15)

  rows.push([{ value: BLANK.wardMode, format: LABEL_FORMAT }, ...spread('', 25, LABEL_FORMAT)])
  merges.push(`B4:${lastColumn}4`)
  heights.push(15.75)

  rows.push([
    { value: BLANK.wardOrders, format: ORDER_HEAD_FORMAT },
    { value: null, format: ORDER_HEAD_FORMAT },
    ...Array.from({ length: WARD_DAY_COLUMNS }, (_unused, index) => ({
      value: days[index] ? dayAndMonth(days[index]!.date, language) : '',
      format: RULER_FORMAT,
    })),
  ])
  merges.push('A5:B5')
  heights.push(19.5)

  const resultById = new Map(input.course.drugs.map((drug) => [drug.id, drug]))
  const ruled = appendBands(
    rows,
    merges,
    heights,
    widths,
    wardItems.map((item) => {
      const result = resultById.get(item.item.id)
      return {
        what: whatLine(item.item.id, item, result, input),
        how: howLine(item, result, input),
        marks: Array.from({ length: WARD_DAY_COLUMNS }, (_unused, index) =>
          days[index]?.untimed.includes(item.item.id) ? MARK : null,
        ),
      }
    }),
  )

  rows.push([{ value: null, format: NOTE_FORMAT }, ...spread('', 25, NOTE_FORMAT)])
  merges.push(`A${rows.length}:${lastColumn}${rows.length}`)
  heights.push(NOTE_HEIGHT)

  const name = t('calculator.export.wardSheet')
  return {
    name: pages > 1 ? `${name} ${page + 1}` : name,
    widths,
    heights,
    rows,
    merges,
    onePage: wardItems.length <= ruled,
  }
}

/* --------------------------------------------------------------------- shared rows --------- */

interface Band {
  what: string
  how: string
  marks: (string | null)[]
}

/**
 * Each order takes two ruled rows: the prescription is written across both, the mark goes in the
 * upper one and the lower one is left for the nurse to sign the administration off in. The blank
 * is ruled to the foot of the page — a short course does not leave a strip of bare paper under
 * the table, and the ward has empty lines to write a new order into by hand.
 */
function appendBands(
  rows: XlsxInput[][],
  merges: string[],
  heights: number[],
  widths: number[],
  bands: Band[],
): number {
  const width = widths.length - ORDER_COLUMNS
  const ruled = blankBands(widths, heights)
  const count = Math.max(ruled, bands.length)
  for (let index = 0; index < count; index++) {
    const band = bands[index]
    const top = rows.length + 1
    rows.push([
      { value: band?.what ?? null, format: orderFormat(false) },
      { value: band?.how ?? null, format: orderFormat(true) },
      ...Array.from({ length: width }, (_unused, column) => ({
        value: band?.marks[column] ?? null,
        format: markFormat(isGroupEnd(column), false),
      })),
    ])
    rows.push([
      { value: null, format: orderFormat(false) },
      { value: null, format: orderFormat(true) },
      ...Array.from({ length: width }, (_unused, column) => ({
        value: null,
        format: markFormat(isGroupEnd(column), true),
      })),
    ])
    merges.push(`A${top}:A${top + 1}`, `B${top}:B${top + 1}`)
    heights.push(BAND_ROW_HEIGHT, BAND_ROW_HEIGHT)
  }
  return ruled
}

/** How many order lines are left on the page once the heading and the note box have their share. */
function blankBands(widths: number[], headingHeights: number[]): number {
  const heading = headingHeights.reduce((sum, height) => sum + height, 0)
  const room = pagePoints(widths) - heading - NOTE_HEIGHT
  return Math.max(1, Math.floor(room / BAND_HEIGHT))
}

/** How many points of a sheet's own height go on one printed page, at the scale Excel prints it. */
function pagePoints(widths: number[]): number {
  const sheetWidth = widths.reduce((sum, width) => sum + width, 0) * POINTS_PER_WIDTH_UNIT
  const scale = (PAGE_WIDTH_PT - 2 * MARGIN_SIDE_PT) / sheetWidth
  return (PAGE_HEIGHT_PT - 2 * MARGIN_EDGE_PT) / scale
}

/**
 * How much of one printed page a built sheet fills: 1 is the full page between the margins.
 * Above 1 the table runs onto a second sheet of paper.
 */
export function pageFill(sheet: XlsxSheet): number {
  const height = (sheet.heights ?? []).reduce((sum, value) => sum + value, 0)
  return height / pagePoints(sheet.widths ?? [])
}

/** The cells a merged range covers still have to exist, or its borders break up. */
function spread(value: string, width: number, format: XlsxFormat): XlsxInput[] {
  return Array.from({ length: width }, (_unused, index) => ({
    value: index === 0 ? value : null,
    format,
  }))
}

/* ------------------------------------------------------------------------ the text --------- */

/** What is given: the drug and its dose, and under it the solvent it goes into. */
function whatLine(
  id: string,
  item: CourseItem | undefined,
  result: CourseDrugResult | undefined,
  input: CourseSheetsInput,
): string {
  const { language, t } = input
  const name = item ? localize(item.drug.name, language) : id
  const dose = result
    ? ` ${formatAmount(result.doseAmount, language, 1)} ${t(`units.${result.amountUnit}`)}`
    : ''
  const infusion = result?.infusion
  if (!infusion) return name + dose
  const solvent = t(`solvent.${item?.infusionParams?.solvent ?? 'sodium_chloride_0_9'}`)
  return `${name}${dose}\n${solvent} ${formatAmount(infusion.bagVolumeMl, language)} ${t('units.ml')}`
}

/** How it is given: the route, and under it the rate or how many times a day. */
function howLine(
  item: CourseItem | undefined,
  result: CourseDrugResult | undefined,
  input: CourseSheetsInput,
): string {
  const { language, t } = input
  const route = item ? t(`routeShort.${item.item.route}`) : ''
  const infusion = result?.infusion
  const ramp = item?.infusionParams?.rate_ramp
  if (infusion?.ramp && ramp) {
    return `${route}\n${BLANK.rate}${ramp.first.start_ml_h}→${ramp.first.max_ml_h} ${t('units.ml_h')}`
  }
  if (infusion && infusion.rateMlH !== null) {
    return `${route}\n${BLANK.rate}${formatAmount(infusion.rateMlH, language)} ${t('units.ml_h')}`
  }
  const perDay = result?.administrationsPerDay ?? item?.item.administrations_per_day ?? 1
  return perDay > 1 ? `${route}\n${perDay}${BLANK.perDay}` : route
}

/** The stamp at the top of the blank: institution, address, registry code. */
function stampLines(header: HeaderValue): string {
  return [
    header.institution,
    header.address,
    header.registryCode && BLANK.registryCode + header.registryCode,
  ]
    .filter((line) => line !== '' && line !== null)
    .join('\n')
}

function dateLine(iso: string): string {
  const [year, month, day] = iso.split('-')
  return year && month && day ? `Дата: ${day} / ${month} / ${year}р.` : `Дата: ${iso}`
}

/**
 * A measurement of the patient, or the blank space for one. Height, weight and age may be absent
 * — a course calculated from a BSA entered by hand needs none of them — and then the sheet prints
 * the printed label alone, for the ward to write into.
 */
function given(value: number | null, language: Language, decimals = 0): string {
  return value === null ? '' : formatAmount(value, language, decimals)
}

/** A date column of the inpatient sheet: day and month, the way the ward writes it by hand. */
function dayAndMonth(iso: string, language: Language): string {
  return formatDate(iso, language).slice(0, 5)
}

function dayTabName(input: CourseSheetsInput, day: CourseResult['days'][number]): string {
  const prefix = input.regimenName ?? input.t('calculator.schedule.day', { day: day.day })
  return input.regimenName === null ? prefix : `${prefix} д${day.day}`
}

function hourLabel(hour: number): string {
  return hour === 0 ? '24' : String(hour)
}

/* ---------------------------------------------------------------------- the ruling --------- */

function isGroupEnd(column: number): boolean {
  return (column + 1) % GROUP_EVERY === 0
}

const MEDIUM: XlsxLineSet = { left: 'medium', right: 'medium', top: 'medium', bottom: 'medium' }

/** The «Призначення … / Час» cell over the two order columns. */
const ORDER_HEAD_FORMAT: XlsxFormat = { font: ARIAL_12, box: MEDIUM, valign: 'center' }

/**
 * One hour or one date over the grid. Set in the smaller type and centred without wrapping: a
 * date wrapped in a column five characters wide loses its month to the edge of the row.
 */
const RULER_FORMAT: XlsxFormat = {
  font: ARIAL_10,
  box: MEDIUM,
  align: 'center',
  valign: 'center',
}

function orderFormat(groupEnd: boolean): XlsxFormat {
  return {
    font: ARIAL_12,
    box: { left: 'thin', right: groupEnd ? 'medium' : 'thin' },
    valign: 'top',
    wrap: true,
  }
}

function markFormat(groupEnd: boolean, lower: boolean): XlsxFormat {
  return {
    font: { size: 16, bold: true },
    box: {
      left: 'thin',
      right: groupEnd ? 'medium' : 'thin',
      ...(lower
        ? { top: 'thin' as const, bottom: 'medium' as const }
        : { bottom: 'thin' as const }),
    },
    align: 'center',
    valign: 'top',
  }
}
