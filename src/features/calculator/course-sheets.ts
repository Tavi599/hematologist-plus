import type { CourseDrugResult, CourseResult } from '../../domain'
import type { CourseItem } from '../../lib/course-input'
import { formatDate, formatNumber } from '../../lib/format'
import type { Language } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { XlsxInput, XlsxSheet } from '../../lib/xlsx-writer'
import { columnName } from '../../lib/xlsx-writer'
import type { PatientInput } from '../../schemas/patient'
import type { HeaderValue } from './header'

/**
 * The calculated course as an Excel workbook: one sheet per day that has an infusion, plus the
 * inpatient sheet. The hour grid follows the department's own sheets — the working day first,
 * the night after it — and an administration is marked in the hour it starts in.
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

/** Columns before the hour grid: №, drug, dose, packs, dilution, rate, time. */
const INFO_COLUMNS = 7
const INFO_WIDTHS = [4, 26, 14, 18, 30, 26, 14]
const EMPTY = '—'

export function buildCourseSheets(input: CourseSheetsInput): XlsxSheet[] {
  const sheets = input.course.days
    .filter((day) => day.administrations.length > 0)
    .map((day) => daySheet(input, day))
  const ward = wardSheet(input)
  return ward ? [...sheets, ward] : sheets
}

function daySheet(input: CourseSheetsInput, day: CourseResult['days'][number]): XlsxSheet {
  const { t, language } = input
  const rows: XlsxInput[][] = []
  const merges: string[] = []
  const info = (label: string, value: string) => {
    rows.push([{ value: label, style: 'label' }, value])
    merges.push(`B${rows.length}:${columnName(INFO_COLUMNS - 1)}${rows.length}`)
  }

  rows.push([{ value: t('calculator.export.infusionTitle'), style: 'title' }])
  merges.push(`A1:${columnName(INFO_COLUMNS - 1)}1`)
  for (const [label, value] of headerLines(input)) info(label, value)
  info(
    t('calculator.schedule.day', { day: day.day }),
    `${formatDate(day.date, language)} · ${t('calculator.export.dayStart')}: ${
      day.administrations[0]?.start ?? EMPTY
    }`,
  )
  rows.push([])

  rows.push([
    { value: t('calculator.export.number'), style: 'head' },
    { value: t('calculator.schedule.drug'), style: 'head' },
    { value: t('calculator.export.dose'), style: 'head' },
    { value: t('calculator.doses.units'), style: 'head' },
    { value: t('calculator.doses.infusion'), style: 'head' },
    { value: t('calculator.export.rate'), style: 'head' },
    { value: t('calculator.schedule.time'), style: 'head' },
    ...SHEET_HOURS.map((hour) => ({ value: hourLabel(hour), style: 'head' as const })),
  ])

  const byId = new Map(input.items.map((item) => [item.item.id, item]))
  const resultById = new Map(input.course.drugs.map((drug) => [drug.id, drug]))
  day.administrations.forEach((administration, index) => {
    const item = byId.get(administration.drugId)
    const result = resultById.get(administration.drugId)
    const hour = Math.floor(administration.startMin / 60) % 24
    rows.push([
      { value: index + 1, style: 'cell' },
      { value: item ? localize(item.drug.name, language) : administration.drugId, style: 'cell' },
      { value: doseText(result, language, t), style: 'cell' },
      { value: packText(result, language, t), style: 'cell' },
      { value: dilutionText(item, result, language, t), style: 'cell' },
      { value: rateText(item, result, language, t), style: 'cell' },
      { value: timeText(administration, item, t), style: 'cell' },
      ...SHEET_HOURS.map((sheetHour) => ({
        value: sheetHour === hour ? '+' : null,
        style: 'mark' as const,
      })),
    ])
  })

  if (day.untimed.length > 0) {
    rows.push([])
    rows.push([
      {
        value: `${t('calculator.schedule.ward')}: ${day.untimed
          .map((id) => nameOf(byId, id, language))
          .join(', ')}`,
        style: 'label',
      },
    ])
    merges.push(`A${rows.length}:${columnName(INFO_COLUMNS - 1)}${rows.length}`)
  }

  return {
    name: `${t('calculator.schedule.day', { day: day.day })} ${formatDate(day.date, language).slice(0, 5)}`,
    widths: [...INFO_WIDTHS, ...SHEET_HOURS.map(() => 4)],
    rows,
    merges,
  }
}

/**
 * The inpatient sheet: one row per drug that has no clock time, one column per course day.
 * These rows are never moved by a shift, which is exactly why they print on their own sheet.
 */
function wardSheet(input: CourseSheetsInput): XlsxSheet | null {
  const { t, language, course } = input
  const wardItems = input.items.filter((item) => item.item.block === 'ward')
  if (wardItems.length === 0) return null

  const rows: XlsxInput[][] = []
  const merges: string[] = []
  const lastInfoColumn = columnName(3)

  rows.push([{ value: t('calculator.export.wardTitle'), style: 'title' }])
  merges.push(`A1:${lastInfoColumn}1`)
  for (const [label, value] of headerLines(input)) {
    rows.push([{ value: label, style: 'label' }, value])
    merges.push(`B${rows.length}:${lastInfoColumn}${rows.length}`)
  }
  rows.push([])

  rows.push([
    { value: t('calculator.export.number'), style: 'head' },
    { value: t('calculator.schedule.drug'), style: 'head' },
    { value: t('calculator.export.dose'), style: 'head' },
    { value: t('calculator.export.route'), style: 'head' },
    ...course.days.map((day) => ({
      value: `${day.day}\n${formatDate(day.date, language).slice(0, 5)}`,
      style: 'head' as const,
    })),
  ])

  const resultById = new Map(course.drugs.map((drug) => [drug.id, drug]))
  wardItems.forEach((item, index) => {
    const result = resultById.get(item.item.id)
    const perDay = result?.administrationsPerDay ?? item.item.administrations_per_day
    rows.push([
      { value: index + 1, style: 'cell' },
      { value: localize(item.drug.name, language), style: 'cell' },
      { value: doseText(result, language, t), style: 'cell' },
      { value: t(`route.${item.item.route}`), style: 'cell' },
      ...course.days.map((day) => ({
        value: day.untimed.includes(item.item.id) ? (perDay > 1 ? `+ ×${perDay}` : '+') : null,
        style: 'mark' as const,
      })),
    ])
  })

  return {
    name: t('calculator.export.wardSheet'),
    widths: [4, 26, 14, 18, ...course.days.map(() => 6)],
    rows,
    merges,
  }
}

/** The lines both sheets carry above the table. */
function headerLines(input: CourseSheetsInput): [string, string][] {
  const { t, language, patient, header, course } = input
  const lines: [string, string][] = [
    [t('calculator.hospital.institution'), header.institution || EMPTY],
    [t('calculator.hospital.department'), header.department || EMPTY],
    [t('calculator.patient.fullName'), patient.fullName || EMPTY],
    [t('calculator.patient.recordNumber'), patient.recordNumber || EMPTY],
    [
      t('calculator.export.patientData'),
      [
        `${formatNumber(patient.ageYears, language)} ${t('calculator.export.years')}`,
        t(`calculator.patient.${patient.sex}`),
        `${formatNumber(patient.heightCm, language)} ${t('calculator.export.cm')}`,
        `${formatNumber(patient.weightKg, language)} ${t('calculator.export.kg')}`,
        `BSA ${formatNumber(course.bsa.actualM2, language, 2)} ${t('units.m2')}`,
      ].join(' · '),
    ],
    [
      t('calculator.course.regimen'),
      `${input.regimenName ?? EMPTY} · ${t('calculator.course.cycleNumber')} ${input.cycleNumber}`,
    ],
    [t('calculator.hospital.doctor'), header.doctor || EMPTY],
  ]
  return lines
}

function hourLabel(hour: number): string {
  return hour === 0 ? '24' : String(hour)
}

function nameOf(byId: Map<string, CourseItem>, id: string, language: Language): string {
  const item = byId.get(id)
  return item ? localize(item.drug.name, language) : id
}

function doseText(result: CourseDrugResult | undefined, language: Language, t: Translate): string {
  if (!result) return EMPTY
  return `${formatNumber(result.doseAmount, language, 1)} ${t(`units.${result.amountUnit}`)}`
}

function packText(result: CourseDrugResult | undefined, language: Language, t: Translate): string {
  if (!result?.pack || result.pack.items.length === 0) return EMPTY
  return result.pack.items
    .map((entry) =>
      t('calculator.doses.unitsValue', {
        count: entry.count,
        strength: formatNumber(entry.presentation.strengthAmount, language, 2),
        unit: t(`units.${result.amountUnit}`),
      }),
    )
    .join('; ')
}

function dilutionText(
  item: CourseItem | undefined,
  result: CourseDrugResult | undefined,
  language: Language,
  t: Translate,
): string {
  if (!result?.infusion) return EMPTY
  return t('calculator.doses.infusionValue', {
    solvent: t(`solvent.${item?.infusionParams?.solvent ?? 'sodium_chloride_0_9'}`),
    bag: formatNumber(result.infusion.bagVolumeMl, language, 0),
    total: formatNumber(result.infusion.totalVolumeMl, language, 1),
    concentration: formatNumber(result.infusion.concentrationPerMl, language, 2),
    unit: t(`units.${result.infusion.concentrationUnit}_ml`),
  })
}

function rateText(
  item: CourseItem | undefined,
  result: CourseDrugResult | undefined,
  language: Language,
  t: Translate,
): string {
  const infusion = result?.infusion
  if (!infusion) return EMPTY
  const ramp = item?.infusionParams?.rate_ramp
  if (infusion.ramp && ramp) {
    return [
      t('calculator.doses.infusionRamp', {
        start: ramp.first.start_ml_h,
        step: ramp.first.step_ml_h,
        every: ramp.first.every_min,
        max: ramp.first.max_ml_h,
      }),
      t('calculator.doses.infusionRampDuration', {
        first: infusion.ramp.first.durationMin,
        next: infusion.ramp.next.durationMin,
      }),
    ].join('\n')
  }
  if (infusion.rateMlH === null || infusion.rateGttMin === null) return EMPTY
  return t('calculator.doses.infusionRate', {
    rate: formatNumber(infusion.rateMlH, language, 1),
    drops: formatNumber(infusion.rateGttMin, language, 0),
  })
}

function timeText(
  administration: CourseResult['days'][number]['administrations'][number],
  item: CourseItem | undefined,
  t: Translate,
): string {
  if (administration.start !== administration.end) {
    return `${administration.start} – ${administration.end}`
  }
  const note =
    item?.item.route === 'iv_infusion'
      ? t('calculator.schedule.noDuration')
      : t('calculator.schedule.bolus')
  return `${administration.start} · ${note}`
}
