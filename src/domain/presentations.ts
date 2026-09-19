import { assertNonNegative, assertPositive } from './math'
import { DomainInputError, type AmountUnit } from './types'

/**
 * A pack unit that cannot be split: a vial, a tablet, a pre-filled syringe.
 * The strength is in the same unit as the dose it is counted against; converting a pack
 * strength into that unit is the caller's job (see calculateCourse).
 */
export interface Presentation {
  id: string
  strengthAmount: number
  /** Unit of `strengthAmount` as the catalog holds it; defaults to the dose's unit. */
  unit?: AmountUnit
}

export interface PresentationCount {
  presentation: Presentation
  count: number
}

export interface PackSelection {
  items: PresentationCount[]
  totalAmount: number
  wasteAmount: number
  unitCount: number
}

// Amounts are compared in thousandths of the unit so that 3.5 mg or 0.5 mg strengths are exact
// integers, then divided by the GCD of all strengths to keep the lookup table small.
const AMOUNT_SCALE = 1000
const MAX_TABLE_SIZE = 200_000

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b]
  return a
}

function toScaled(amount: number): number {
  return Math.round(amount * AMOUNT_SCALE)
}

interface VialTable {
  /** Size of one table cell, in scaled units. */
  cell: number
  /** Strength of each presentation in cells. */
  units: number[]
  /** fewest[a] = fewest units summing exactly to a cells (Infinity if impossible). */
  fewest: number[]
  /** last[a] = index of the presentation added last to reach a. */
  last: number[]
}

function validatePresentations(presentations: Presentation[]): void {
  if (presentations.length === 0) {
    throw new DomainInputError('presentations', 'at least one presentation is required')
  }
  presentations.forEach((p) =>
    assertPositive(`presentations.${p.id}.strengthAmount`, p.strengthAmount),
  )
}

function buildTable(presentations: Presentation[], upToAmount: number): VialTable | null {
  const strengths = presentations.map((p) => toScaled(p.strengthAmount))
  const cell = strengths.reduce(gcd)
  const units = strengths.map((s) => s / cell)
  const size = Math.ceil(toScaled(upToAmount) / cell) + Math.max(...units)
  if (size > MAX_TABLE_SIZE) return null

  const fewest = new Array<number>(size + 1).fill(Infinity)
  const last = new Array<number>(size + 1).fill(-1)
  fewest[0] = 0
  for (let amount = 1; amount <= size; amount++) {
    for (let index = 0; index < units.length; index++) {
      const unit = units[index]!
      if (unit <= amount && fewest[amount - unit]! + 1 < fewest[amount]!) {
        fewest[amount] = fewest[amount - unit]! + 1
        last[amount] = index
      }
    }
  }
  return { cell, units, fewest, last }
}

function selectionFromCells(
  table: VialTable,
  cells: number,
  presentations: Presentation[],
  doseAmount: number,
): PackSelection {
  const counts = new Array<number>(presentations.length).fill(0)
  for (let amount = cells; amount > 0; amount -= table.units[table.last[amount]!]!) {
    counts[table.last[amount]!]!++
  }
  const items = presentations
    .map((presentation, index) => ({ presentation, count: counts[index]! }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.presentation.strengthAmount - a.presentation.strengthAmount)
  const totalScaled = cells * table.cell

  return {
    items,
    totalAmount: totalScaled / AMOUNT_SCALE,
    wasteAmount: Math.max(0, totalScaled - toScaled(doseAmount)) / AMOUNT_SCALE,
    unitCount: items.reduce((sum, item) => sum + item.count, 0),
  }
}

/**
 * Picks whole units covering `doseAmount` with the least waste, then the fewest units.
 * Units opened for one administration are not shared with another.
 */
export function selectPresentations(
  doseAmount: number,
  presentations: Presentation[],
): PackSelection {
  assertNonNegative('doseAmount', doseAmount)
  validatePresentations(presentations)
  if (doseAmount === 0) return { items: [], totalAmount: 0, wasteAmount: 0, unitCount: 0 }

  const table = buildTable(presentations, doseAmount)
  if (!table) {
    // Not expected for real drugs: fall back to the largest strength only.
    const largest = presentations.reduce((a, b) => (b.strengthAmount > a.strengthAmount ? b : a))
    const count = Math.ceil(doseAmount / largest.strengthAmount)
    const totalAmount = count * largest.strengthAmount
    return {
      items: [{ presentation: largest, count }],
      totalAmount,
      wasteAmount: totalAmount - doseAmount,
      unitCount: count,
    }
  }

  let cells = Math.ceil(toScaled(doseAmount) / table.cell)
  while (table.fewest[cells] === Infinity) cells++
  return selectionFromCells(table, cells, presentations, doseAmount)
}

/**
 * Exact whole-unit amounts closest to the dose from below and from above, mg.
 * `below` is null when no positive combination fits under the dose.
 */
export function nearestWholeUnitAmounts(
  doseAmount: number,
  presentations: Presentation[],
): { below: number | null; above: number } {
  assertPositive('doseAmount', doseAmount)
  validatePresentations(presentations)

  const above = selectPresentations(doseAmount, presentations).totalAmount
  const table = buildTable(presentations, doseAmount)
  if (!table) return { below: null, above }

  let cells = Math.floor(toScaled(doseAmount) / table.cell)
  while (cells > 0 && table.fewest[cells] === Infinity) cells--
  return { below: cells > 0 ? (cells * table.cell) / AMOUNT_SCALE : null, above }
}

/** Sums unit counts per presentation, e.g. per-administration selections into a course total. */
export function sumSelections(selections: PackSelection[]): PresentationCount[] {
  const totals = new Map<string, PresentationCount>()
  for (const selection of selections) {
    for (const { presentation, count } of selection.items) {
      const existing = totals.get(presentation.id)
      if (existing) existing.count += count
      else totals.set(presentation.id, { presentation, count })
    }
  }
  return [...totals.values()].sort(
    (a, b) => b.presentation.strengthAmount - a.presentation.strengthAmount,
  )
}
