import type { ManualRow } from './manual-rows'

/**
 * The department's standard support lines — hydration, glucose, an antiemetic, a proton-pump
 * inhibitor — as options the physician switches on for a course. They become ordinary
 * hand-written lines, so each can be edited afterwards.
 *
 * CALIBRATION: the additive amounts come from the department's IGEV sheet (1000 mL of saline with
 * 40 mL of 4% KCl and 4 mL of 25% MgSO4); the larger bags carry them in proportion.
 */

export type Solvent = 'nacl' | 'glucose'

/** Bags that carry potassium and magnesium in proportion to their volume. */
export const PROPORTIONAL_VOLUMES_ML = [500, 1000, 3000] as const
/** Small bags: potassium and magnesium can be added, but no amount is ever filled in for them. */
export const SMALL_VOLUMES_ML = [100, 150, 200, 250, 400] as const

const KCL_ML_PER_LITRE = 40
const MGSO4_ML_PER_LITRE = 4

export interface Additives {
  kclMl: number
  mgso4Ml: number
}

/** The standard additives of a bag, or null for a bag that has no standard. */
export function standardAdditives(volumeMl: number): Additives | null {
  if (!(PROPORTIONAL_VOLUMES_ML as readonly number[]).includes(volumeMl)) return null
  return {
    kclMl: (volumeMl / 1000) * KCL_ML_PER_LITRE,
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
  /** Millilitres of 4% KCl; null or 0 leaves it out. */
  kclMl: number | null
  /** Millilitres of 25% MgSO4; null or 0 leaves it out. */
  mgso4Ml: number | null
  /** Millilitres per hour; null leaves the rate to the ward. */
  rateMlH: number | null
}

const SOLVENT_NAME: Record<Solvent, string> = { nacl: 'NaCl 0,9%', glucose: 'Глюкоза 5%' }

/** «NaCl 0,9% 1000 мл + KCl 4% 40 мл + MgSO4 25% 4 мл». */
export function infusionWhat(input: InfusionLineInput): string {
  const parts = [`${SOLVENT_NAME[input.solvent]} ${number(input.volumeMl)} мл`]
  if (input.kclMl) parts.push(`KCl 4% ${number(input.kclMl)} мл`)
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
