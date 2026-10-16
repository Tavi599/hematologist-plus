import type { ManualRow } from './manual-rows'

/**
 * The department's standard support lines — hydration, glucose, an antiemetic, a proton-pump
 * inhibitor — as options the physician switches on for a course. They become ordinary
 * hand-written lines, so each can be edited afterwards.
 *
 * CALIBRATION: the additive amounts come from the department's IGEV sheet (1000 mL of saline with
 * 40 mL of 4% KCl and 4 mL of 25% MgSO4); the larger bags carry them in proportion. 7.5% KCl is
 * the department's alternative: 20 mL to a litre (the physician's instruction, 2026-10-16).
 */

export type Solvent = 'nacl' | 'glucose'

/** Bags that carry potassium and magnesium in proportion to their volume. */
export const PROPORTIONAL_VOLUMES_ML = [500, 1000, 3000] as const
/** Small bags: potassium and magnesium can be added, but no amount is ever filled in for them. */
export const SMALL_VOLUMES_ML = [100, 150, 200, 250, 400] as const

/** The potassium chloride the ward has: 4% is the department's own, 7.5% the alternative. */
export const KCL_STRENGTHS = ['4', '7.5'] as const
export type KclStrength = (typeof KCL_STRENGTHS)[number]

const KCL_ML_PER_LITRE: Record<KclStrength, number> = { '4': 40, '7.5': 20 }
const MGSO4_ML_PER_LITRE = 4

/** «4», «7,5»: the strength as the sheet writes it. */
export function kclPercent(strength: KclStrength): string {
  return strength.replace('.', ',')
}

export interface Additives {
  kclMl: number
  mgso4Ml: number
}

/** A bag of 500 mL or more, which carries potassium and magnesium in proportion. */
export function isProportionalBag(volumeMl: number): boolean {
  return (PROPORTIONAL_VOLUMES_ML as readonly number[]).includes(volumeMl)
}

/** The standard additives of a bag, or null for a bag that has no standard. */
export function standardAdditives(volumeMl: number, kcl: KclStrength = '4'): Additives | null {
  if (!isProportionalBag(volumeMl)) return null
  return {
    kclMl: (volumeMl / 1000) * KCL_ML_PER_LITRE[kcl],
    mgso4Ml: (volumeMl / 1000) * MGSO4_ML_PER_LITRE,
  }
}

/** Decimal comma, no trailing zeros: 2,5 — 40. */
function number(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',')
}

export interface InfusionLineInput {
  solvent: Solvent
  volumeMl: number
  /** Millilitres of KCl; null or 0 leaves it out. */
  kclMl: number | null
  /** 4% unless said otherwise. */
  kclStrength?: KclStrength
  /** Millilitres of 25% MgSO4; null or 0 leaves it out. */
  mgso4Ml: number | null
  /** Millilitres per hour; null leaves the rate to the ward. */
  rateMlH: number | null
}

const SOLVENT_NAME: Record<Solvent, string> = { nacl: 'NaCl 0,9%', glucose: 'Глюкоза 5%' }

/** «NaCl 0,9% 1000 мл + KCl 4% 40 мл + MgSO4 25% 4 мл». */
export function infusionWhat(input: InfusionLineInput): string {
  const parts = [`${SOLVENT_NAME[input.solvent]} ${number(input.volumeMl)} мл`]
  if (input.kclMl) {
    parts.push(`KCl ${kclPercent(input.kclStrength ?? '4')}% ${number(input.kclMl)} мл`)
  }
  if (input.mgso4Ml) parts.push(`MgSO4 25% ${number(input.mgso4Ml)} мл`)
  return parts.join(' + ')
}

export function infusionHow(rateMlH: number | null): string {
  return rateMlH ? `в/в крап. ${number(rateMlH)} мл/год` : 'в/в крап.'
}

export function infusionRow(id: string, input: InfusionLineInput, days: number[]): ManualRow {
  return {
    id,
    what: infusionWhat(input),
    how: infusionHow(input.rateMlH),
    days,
    hour: null,
    block: 'infusion',
  }
}

/** The additive potassium of a bag of the standard infusion: one of the strengths, or none. */
export type KclChoice = KclStrength | 'none'

/** One bag of the standard infusion: its volume and what goes into it. */
export interface SolutionPlan {
  on: boolean
  volumeMl: number
  kcl: KclChoice
  mgso4: boolean
}

/**
 * The infusion therapy of the department's standard support: saline, 5% glucose or both, each
 * with potassium and magnesium in proportion to the bag (500, 1000 or 3000 mL). A smaller bag
 * goes without them, and either bag may be given clean.
 */
export interface InfusionTherapy {
  on: boolean
  nacl: SolutionPlan
  glucose: SolutionPlan
  /** The days it is given on; null for the days of the cytostatics. */
  days: number[] | null
  /** Hour of the sheet the mark goes in; null for the hour the working day starts. */
  hour: number | null
  /** Millilitres per hour, set when the course is laid out; null leaves the rate to the ward. */
  rateMlH: number | null
}

/** The department's pace of the standard infusion, until the physician sets another. */
export const STANDARD_INFUSION_RATE_ML_H = 150

export const SOLVENTS: Solvent[] = ['nacl', 'glucose']

/** Every bag on offer: the small ones go without additives. */
export const INFUSION_VOLUMES_ML = [...SMALL_VOLUMES_ML, ...PROPORTIONAL_VOLUMES_ML] as const

const STANDARD_BAG: SolutionPlan = { on: true, volumeMl: 1000, kcl: '4', mgso4: true }

export const NO_INFUSION_THERAPY: InfusionTherapy = {
  on: false,
  nacl: STANDARD_BAG,
  glucose: { ...STANDARD_BAG, on: false },
  days: null,
  hour: null,
  rateMlH: STANDARD_INFUSION_RATE_ML_H,
}

/** Prefix of the lines of the standard infusion: they belong to the switch, not to the physician's list. */
export const INFUSION_THERAPY_ID = 'std-infusion-'

/** What one bag is written as: the solution, and its additives where the bag carries them. */
export function solutionLine(solvent: Solvent, plan: SolutionPlan): InfusionLineInput {
  const kcl = plan.kcl === 'none' ? null : standardAdditives(plan.volumeMl, plan.kcl)
  const mgso4 = plan.mgso4 ? standardAdditives(plan.volumeMl) : null
  return {
    solvent,
    volumeMl: plan.volumeMl,
    kclMl: kcl?.kclMl ?? null,
    ...(plan.kcl === 'none' ? {} : { kclStrength: plan.kcl }),
    mgso4Ml: mgso4?.mgso4Ml ?? null,
    rateMlH: null,
  }
}

/**
 * The lines of the standard infusion, one per bag switched on, given before the course's own
 * drugs on the days of the cytostatics unless the physician named others.
 */
export function infusionTherapyRows(
  therapy: InfusionTherapy,
  chemoDays: number[],
  dayStartHour: number,
): ManualRow[] {
  if (!therapy.on) return []
  const days = therapy.days && therapy.days.length > 0 ? therapy.days : chemoDays
  return SOLVENTS.filter((solvent) => therapy[solvent].on).map((solvent) => ({
    id: `${INFUSION_THERAPY_ID}${solvent}`,
    what: infusionWhat(solutionLine(solvent, therapy[solvent])),
    how: infusionHow(therapy.rateMlH),
    days: days.length > 0 ? days : [1],
    hour: therapy.hour ?? dayStartHour,
    block: 'infusion' as const,
    before: true,
  }))
}

/** The drug whose standard support the department writes on its own sheet. */
export const IVIG_DRUG_ID = 'immunoglobulin-human-iv'

/**
 * The department's standard support of intravenous immunoglobulin, as its «Біовен інфуз лист»
 * writes it: hydration with potassium and magnesium, paracetamol by mouth 30 min before, and
 * dexamethasone with diphenhydramine in 100 mL of saline before the immunoglobulin. They are
 * ordinary hand-written lines above the drug, so a colleague changes any of them as text.
 */
export function ivigSupportRows(itemId: string, days: number[]): ManualRow[] {
  const line = (key: string, what: string, how: string): ManualRow => ({
    id: `ivig-support-${itemId}-${key}`,
    what,
    how,
    days,
    hour: null,
    block: 'infusion',
    before: true,
    supportFor: itemId,
  })
  return [
    line(
      'hydration',
      'Р-н Натрію хлориду 0,9% - 500 мл\nР-н Калію хлориду 4% - 20 мл\nР-н Магнію сульфату 25% - 2 мл',
      'в/в крап.\nV = 150 мл/год',
    ),
    line('paracetamol', 'Парацетамол 1000 мг', 'р.о.\n(за 30 хв до біовену)'),
    line(
      'premedication',
      'Дексаметазон 8 мг\nДимедрол 1% - 1,0 мл\n0,9% NaCl 100,0 мл',
      'в/в крап.\nV = 200 мл/год\n(перед біовеном)',
    ),
  ]
}

export type DrugPreset = 'ondansetron' | 'omeprazole'

/** Ondansetron: the usual 8 mg before chemotherapy (SmPC); omeprazole as on the department sheet. */
const PRESETS: Record<DrugPreset, { what: string; how: string }> = {
  ondansetron: { what: 'Ондансетрон 8 мг', how: 'в/в повільно' },
  omeprazole: {
    what: 'Омепразол 40 мг у 40 мл NaCl 0,9%',
    how: 'в/в струминно повільно',
  },
}

export function presetRow(id: string, preset: DrugPreset, days: number[]): ManualRow {
  return { id, ...PRESETS[preset], days, hour: null, block: 'infusion' }
}
