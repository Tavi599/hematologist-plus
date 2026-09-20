import { DomainInputError, type AmountUnit, type DoseBasis, type DoseUnit } from './types'

/**
 * Units of the same family measure the same thing and convert into each other exactly.
 * Mass and activity never do: how many international units a milligram of bleomycin holds
 * is a property of that drug, printed on its label — never a calculation.
 */
export type AmountFamily = 'mass' | 'activity'

interface UnitDefinition {
  family: AmountFamily
  /** How many base units (mg for mass, IU for activity) one of this unit holds. */
  inBase: number
}

const UNITS: Record<AmountUnit, UnitDefinition> = {
  mg: { family: 'mass', inBase: 1 },
  mcg: { family: 'mass', inBase: 0.001 },
  iu: { family: 'activity', inBase: 1 },
  miu: { family: 'activity', inBase: 1_000_000 },
}

export function amountFamily(unit: AmountUnit): AmountFamily {
  return UNITS[unit].family
}

export function sameFamily(a: AmountUnit, b: AmountUnit): boolean {
  return amountFamily(a) === amountFamily(b)
}

/** True for units of mass; only these can be compared with mg/mL concentration limits. */
export function isMassUnit(unit: AmountUnit): boolean {
  return amountFamily(unit) === 'mass'
}

/** The unit a dose written in `unit` comes out in. Calvert AUC doses are milligrams. */
export function amountUnitOf(unit: DoseUnit): AmountUnit {
  return unit === 'auc' ? 'mg' : (unit.slice(0, unit.lastIndexOf('_')) as AmountUnit)
}

/** What the dose is proportional to; `auc` has its own formula and no basis. */
export function doseBasisOf(unit: DoseUnit): DoseBasis | 'auc' {
  return unit === 'auc' ? 'auc' : (unit.slice(unit.lastIndexOf('_') + 1) as DoseBasis)
}

/** The dose unit made of an amount unit and a basis, e.g. ('iu', 'm2') → 'iu_m2'. */
export function doseUnitOf(amount: AmountUnit, basis: DoseBasis): DoseUnit {
  return `${amount}_${basis}`
}

/**
 * What one drug's label says its mass is worth in activity — 300 mcg of filgrastim is the same
 * syringe as 30 million IU. Only a drug that carries this can be converted across the two
 * families, and only by the number printed on its own pack.
 */
export interface UnitEquivalence {
  amount: number
  amount_unit: AmountUnit
  activity: number
  activity_unit: AmountUnit
}

/**
 * Exact conversion inside one family. Multiplying or dividing by a whole factor keeps
 * 350 mcg at exactly 0.35 mg instead of the floating-point 0.35000000000000003.
 *
 * Across families it converts only when the drug states an equivalence: how many units of
 * activity its mass holds is a property of that drug, read off the label, never arithmetic.
 */
export function convertAmount(
  value: number,
  from: AmountUnit,
  to: AmountUnit,
  equivalence?: UnitEquivalence | null,
): number {
  if (from === to) return value
  if (!sameFamily(from, to)) return convertAcrossFamilies(value, from, to, equivalence)
  return scale(value, from, to)
}

function scale(value: number, from: AmountUnit, to: AmountUnit): number {
  const fromBase = UNITS[from].inBase
  const toBase = UNITS[to].inBase
  return fromBase >= toBase ? value * (fromBase / toBase) : value / (toBase / fromBase)
}

function convertAcrossFamilies(
  value: number,
  from: AmountUnit,
  to: AmountUnit,
  equivalence?: UnitEquivalence | null,
): number {
  if (!equivalence) {
    throw new DomainInputError(
      'amountUnit',
      `cannot convert ${from} to ${to}: mass and biological activity are not interchangeable unless the drug states what its mass is worth`,
    )
  }
  const { amount, amount_unit: massUnit, activity, activity_unit: activityUnit } = equivalence
  if (amount <= 0 || activity <= 0) {
    throw new DomainInputError('unitEquivalence', 'both sides must be positive')
  }
  if (amountFamily(massUnit) !== 'mass' || amountFamily(activityUnit) !== 'activity') {
    throw new DomainInputError(
      'unitEquivalence',
      `expected a mass unit and an activity unit, got ${massUnit} and ${activityUnit}`,
    )
  }
  return amountFamily(from) === 'mass'
    ? scale((scale(value, from, massUnit) / amount) * activity, activityUnit, to)
    : scale((scale(value, from, activityUnit) / activity) * amount, massUnit, to)
}
