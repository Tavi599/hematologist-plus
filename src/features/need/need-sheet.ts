import type { PRESENTATION_FORMS } from '../../schemas/common'
import type { XlsxBox, XlsxFormat, XlsxInput, XlsxSheet } from '../../lib/xlsx-writer'
import { columnName } from '../../lib/xlsx-writer'

/**
 * The need for a drug on the Ministry's own distribution form — «Узагальнена інформація щодо
 * розподілу лікарських засобів, медичних виробів до проєкту наказу» — laid out as the two forms
 * the department has filled in: nine graphs, the institution's signatories under them, A4
 * landscape fitted to the width of the page.
 *
 * The wording, the column widths and the row heights are the form's own and are reproduced as
 * received, down to the typo in «Кількість пацінтів»: this sheet is handed in to the department
 * of health, and a form that reads differently from theirs invites a question.
 *
 * Pure: it only turns the numbers already on screen into rows. No patient is named on this form
 * at all — it counts them.
 */

/** One line of the table: one drug, in one order. */
export interface NeedSheetRow {
  /** The drug as the order writes it — trade name and strength, e.g. «Візгем 1000 мг». */
  name: string
  /** Unit the drug is distributed in: флак, таб, амп. */
  unit: string
  /** Reference of the order that distributed it, e.g. «1253-Р від 20.07.2026». */
  orderRef: string
  patients: number | null
  /** 100 % need, in packs. */
  total: number | null
  stock: number | null
  monthlyUse: number | null
  months: number | null
  proposed: number | null
}

/**
 * The unit of measure as the department fills the form in — «флак», «таб». Ukrainian whatever
 * language the app is showing, like every other word of this form.
 */
export const FORM_UNITS: Record<(typeof PRESENTATION_FORMS)[number], string> = {
  vial: 'флак',
  ampoule: 'амп',
  tablet: 'таб',
  capsule: 'капс',
  syringe: 'шприц',
  other: 'од',
}

/** Text the form itself carries; Ukrainian whatever language the app is showing. */
const FORM = {
  appendix: 'Додаток ',
  title:
    'Узагальнена інформація щодо розподілу лікарських засобів, медичних виробів до проєкту наказу',
  columns: [
    'Назва ЗОЗ, що отримає товар',
    'Одиниця виміру',
    'Розподілено наказом ДП "Медзакупівлі", МОЗ тощо (од)',
    'Кількість пацінтів у ЗОЗ, що потребують лікарських засобів, мед. виробів запропонованих до розподілу',
    '100 % потреба у запропонованому до розподілу  лікарському засобі/медичному виробі',
    'Залишки лікарських засобів, мед виробів на дату подання інформації (од)',
    'Середньомісячне використання (од)',
    'Кількість місяців на, які вистачає ЗАЛИШКУ лікарських засобів, медичних виробів, що розподіляються (місяць)',
    'Запропоновано в проєкті  наказу ДОЗ до розподілу (од)',
  ],
  signatories: ['Керівник закладу', 'Головний бухгалтер', 'Відповідальний фахівець'],
  name: 'ПІБ',
  phone: 'тел. відповідального фахівця',
} as const

/** Characters of the workbook font, measured off the форми the department filled in. */
const WIDTHS = [25.75, 7.875, 16.5, 25.25, 20.625, 17.625, 14.375, 20.5, 15.375]
const COLUMNS = WIDTHS.length

const APPENDIX_HEIGHT = 44.25
const TITLE_HEIGHT = 42
const HEAD_HEIGHT = 80.45
const DATA_HEIGHT = 15
/** The gap under the table, then one row per signatory, then the telephone line. */
const SIGNATURE_HEIGHTS = [31.5, 39, 35.25, 28.5, DATA_HEIGHT]

type XlsxLineSet = Required<XlsxBox>
const THIN: XlsxLineSet = { left: 'thin', right: 'thin', top: 'thin', bottom: 'thin' }

const TIMES_11 = { name: 'Times New Roman', size: 11 }
const TIMES_12 = { name: 'Times New Roman', size: 12 }

const APPENDIX_FORMAT: XlsxFormat = { font: TIMES_11, align: 'center', valign: 'center' }
const TITLE_FORMAT: XlsxFormat = { font: TIMES_11, align: 'center', valign: 'center' }
const HEAD_FORMAT: XlsxFormat = {
  font: TIMES_11,
  box: THIN,
  align: 'center',
  valign: 'center',
  wrap: true,
}
/** The drug stands at the head of its line, as the form's own lines have it: bold, top left. */
const NAME_FORMAT: XlsxFormat = {
  font: { ...TIMES_11, bold: true },
  box: THIN,
  align: 'left',
  valign: 'top',
}
const CELL_FORMAT: XlsxFormat = { font: TIMES_11, box: THIN, align: 'center', valign: 'center' }
/** The last graph is the department of health's to fill in, so it is left as it is typed. */
const PROPOSED_FORMAT: XlsxFormat = { font: TIMES_11, box: THIN }
const SIGNATURE_FORMAT: XlsxFormat = { font: TIMES_12, valign: 'center' }
const NAME_PLACE_FORMAT: XlsxFormat = { font: TIMES_12, align: 'center', valign: 'center' }

export function buildNeedSheet(rows: NeedSheetRow[], sheetName: string): XlsxSheet {
  // An empty form is still a form: it is printed and filled in by hand.
  const lines = rows.length === 0 ? [emptyRow()] : rows
  const last = columnName(COLUMNS - 1)
  const beforeLast = columnName(COLUMNS - 2)
  const sheet: XlsxInput[][] = []
  const heights: number[] = []
  const merges: string[] = []

  sheet.push([...blanks(COLUMNS - 2), cell(FORM.appendix, APPENDIX_FORMAT)])
  heights.push(APPENDIX_HEIGHT)
  merges.push(`${beforeLast}1:${last}1`)

  sheet.push([cell(FORM.title, TITLE_FORMAT)])
  heights.push(TITLE_HEIGHT)
  merges.push(`A2:${last}2`)

  sheet.push(FORM.columns.map((column) => cell(column, HEAD_FORMAT)))
  heights.push(HEAD_HEIGHT)

  for (const line of lines) {
    sheet.push([
      cell(line.name, NAME_FORMAT),
      cell(line.unit, CELL_FORMAT),
      cell(line.orderRef, CELL_FORMAT),
      cell(line.patients, CELL_FORMAT),
      cell(line.total, CELL_FORMAT),
      cell(line.stock, CELL_FORMAT),
      cell(line.monthlyUse, CELL_FORMAT),
      cell(line.months, CELL_FORMAT),
      cell(line.proposed, PROPOSED_FORMAT),
    ])
    heights.push(DATA_HEIGHT)
  }

  // A blank row under the table, then the three signatories with a place for each name.
  sheet.push([])
  for (const signatory of FORM.signatories) {
    const row = sheet.length + 1
    sheet.push([
      cell(signatory, SIGNATURE_FORMAT),
      ...blanks(COLUMNS - 3),
      cell(FORM.name, NAME_PLACE_FORMAT),
    ])
    merges.push(`${beforeLast}${row}:${last}${row}`)
  }
  sheet.push([cell(FORM.phone, SIGNATURE_FORMAT)])
  heights.push(...SIGNATURE_HEIGHTS)

  return { name: sheetName, widths: WIDTHS, heights, rows: sheet, merges, onePage: true }
}

function emptyRow(): NeedSheetRow {
  return {
    name: '',
    unit: '',
    orderRef: '',
    patients: null,
    total: null,
    stock: null,
    monthlyUse: null,
    months: null,
    proposed: null,
  }
}

function cell(value: string | number | null, format: XlsxFormat): XlsxInput {
  return { value: value === '' ? null : value, format }
}

function blanks(count: number): XlsxInput[] {
  return Array.from({ length: count }, () => null)
}
