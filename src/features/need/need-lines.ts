import { monthsCovered } from '../../domain'
import { formatNumber } from '../../lib/format'
import type { Language } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import type { CatalogIndex } from '../../lib/catalog-index'
import type { DrugPresentation } from '../../schemas/catalog'
import type { NeedSheetRow } from './need-sheet'

/** One line of the distribution form, as it is edited on screen. */
export interface NeedLine {
  /** Stable key of the line; the form itself has no identifier for a line. */
  key: string
  drugId: string | null
  presentationId: string | null
  /**
   * The drug as the order writes it. Orders name a brand («Візгем 1000 мг»), the catalog names
   * the substance, so the name is prefilled from the catalog and stays editable.
   */
  name: string
  orderRef: string
  patients: number | null
  /** Courses planned for one patient; prefilled from the regimen's own number of cycles. */
  courses: number | null
  /** Packs one patient needs for one course — from the hint, or typed by hand. */
  packsPerCourse: number | null
  stock: number | null
  /**
   * Packs an average month takes. Left null it is counted from the course; a figure typed here
   * is the department's own and overrides the count.
   */
  monthlyUse: number | null
  /** Months the quantity lasts; counted from the two above unless typed over. */
  months: number | null
  /** What the department of health is asked to distribute; the whole need unless typed over. */
  proposed: number | null
  /** Regimen the hint counts the packs of this drug by. */
  regimenId: string | null
}

export interface NeedLineTotals {
  /** 100 % need: every patient's whole planned treatment, in packs. */
  total: number
  /** What goes in the «середньомісячне використання» graph, counted or typed. */
  monthlyUse: number | null
  /** What goes in the «кількість місяців» graph, counted or typed. */
  monthsCovered: number | null
  proposed: number
}

/**
 * The average month's use the form is filled in with, before anyone corrects it: what one patient
 * takes in one course. A cycle runs about a month, so the two come to the same thing — and that
 * is how the department's own forms are filled in, where the figure stays the same whether the
 * line is for two patients or for five (Візгем 4 flac, Вориконазол 60 tab).
 *
 * Nothing to count it from leaves the graph empty rather than zero: an empty graph is a question,
 * a zero is an answer, and the form goes to the department of health.
 */
export function defaultMonthlyUse(line: NeedLine): number | null {
  const packs = line.packsPerCourse
  return packs === null || packs === 0 ? null : packs
}

export function newNeedLine(key: string): NeedLine {
  return {
    key,
    drugId: null,
    presentationId: null,
    name: '',
    orderRef: '',
    patients: null,
    courses: null,
    packsPerCourse: null,
    stock: null,
    monthlyUse: null,
    months: null,
    proposed: null,
    regimenId: null,
  }
}

export function needLineTotals(line: NeedLine): NeedLineTotals {
  const total = (line.patients ?? 0) * (line.packsPerCourse ?? 0) * (line.courses ?? 0)
  const monthlyUse = line.monthlyUse ?? defaultMonthlyUse(line)
  return {
    total,
    monthlyUse,
    monthsCovered: line.months ?? monthsCovered(total, monthlyUse ?? 0),
    proposed: line.proposed ?? total,
  }
}

/** The drug and its strength as the catalog has them: what the name of a line starts out as. */
export function catalogName(
  catalog: CatalogIndex,
  presentation: DrugPresentation,
  language: Language,
  unitLabel: (unit: string) => string,
): string {
  const drug = catalog.drugs.get(presentation.drug_id)
  const name = drug ? localize(drug.name, language) : presentation.drug_id
  const strength = formatNumber(presentation.strength_amount, language, 2)
  return `${name} ${strength} ${unitLabel(presentation.strength_unit)}`
}

/** Lines of the form as the sheet writes them; a line with nothing filled in is left out. */
export function needSheetRows(
  lines: NeedLine[],
  packLabel: (line: NeedLine) => string,
  name: (line: NeedLine) => string,
): NeedSheetRow[] {
  return lines.filter(isFilled).map((line) => {
    const totals = needLineTotals(line)
    return {
      name: name(line),
      unit: packLabel(line),
      orderRef: line.orderRef,
      patients: line.patients,
      total: totals.total === 0 ? null : totals.total,
      stock: line.stock,
      monthlyUse: totals.monthlyUse,
      months: totals.monthsCovered,
      proposed: totals.proposed === 0 ? null : totals.proposed,
    }
  })
}

function isFilled(line: NeedLine): boolean {
  return line.drugId !== null || line.name.trim() !== ''
}
