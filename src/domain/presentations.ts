import { assertNonNegative, assertPositive } from './math'
import { DomainInputError } from './types'

/** A pack unit that cannot be split: a vial, a tablet, a pre-filled syringe. */
export interface Presentation {
  id: string
  strengthMg: number
}

export interface PresentationCount {
  presentation: Presentation
  count: number
}

export interface PackSelection {
  items: PresentationCount[]
  totalMg: number
  wasteMg: number
  unitCount: number
}

// Amounts are compared in micrograms so that 3.5 mg or 0.5 mg strengths are exact integers,
// then divided by the GCD of all strengths to keep the lookup table small.
const MG_TO_UG = 1000
const MAX_TABLE_SIZE = 200_000

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b]
  return a
}

function toUg(mg: number): number {
  return Math.round(mg * MG_TO_UG)
}

interface VialTable {
  /** Size of one table cell, µg. */
  cellUg: number
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
  presentations.forEach((p) => assertPositive(`presentations.${p.id}.strengthMg`, p.strengthMg))
}

function buildTable(presentations: Presentation[], upToMg: number): VialTable | null {
  const strengthsUg = presentations.map((p) => toUg(p.strengthMg))
  const cellUg = strengthsUg.reduce(gcd)
  const units = strengthsUg.map((s) => s / cellUg)
  const size = Math.ceil(toUg(upToMg) / cellUg) + Math.max(...units)
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
  return { cellUg, units, fewest, last }
}

function selectionFromCells(
  table: VialTable,
  cells: number,
  presentations: Presentation[],
  doseMg: number,
): PackSelection {
  const counts = new Array<number>(presentations.length).fill(0)
  for (let amount = cells; amount > 0; amount -= table.units[table.last[amount]!]!) {
    counts[table.last[amount]!]!++
  }
  const items = presentations
    .map((presentation, index) => ({ presentation, count: counts[index]! }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.presentation.strengthMg - a.presentation.strengthMg)
  const totalUg = cells * table.cellUg

  return {
    items,
    totalMg: totalUg / MG_TO_UG,
    wasteMg: Math.max(0, totalUg - toUg(doseMg)) / MG_TO_UG,
    unitCount: items.reduce((sum, item) => sum + item.count, 0),
  }
}

/**
 * Picks whole units covering `doseMg` with the least waste, then the fewest units.
 * Units opened for one administration are not shared with another.
 */
export function selectPresentations(doseMg: number, presentations: Presentation[]): PackSelection {
  assertNonNegative('doseMg', doseMg)
  validatePresentations(presentations)
  if (doseMg === 0) return { items: [], totalMg: 0, wasteMg: 0, unitCount: 0 }

  const table = buildTable(presentations, doseMg)
  if (!table) {
    // Not expected for real drugs: fall back to the largest strength only.
    const largest = presentations.reduce((a, b) => (b.strengthMg > a.strengthMg ? b : a))
    const count = Math.ceil(doseMg / largest.strengthMg)
    const totalMg = count * largest.strengthMg
    return {
      items: [{ presentation: largest, count }],
      totalMg,
      wasteMg: totalMg - doseMg,
      unitCount: count,
    }
  }

  let cells = Math.ceil(toUg(doseMg) / table.cellUg)
  while (table.fewest[cells] === Infinity) cells++
  return selectionFromCells(table, cells, presentations, doseMg)
}

/**
 * Exact whole-unit amounts closest to the dose from below and from above, mg.
 * `below` is null when no positive combination fits under the dose.
 */
export function nearestWholeUnitAmounts(
  doseMg: number,
  presentations: Presentation[],
): { below: number | null; above: number } {
  assertPositive('doseMg', doseMg)
  validatePresentations(presentations)

  const above = selectPresentations(doseMg, presentations).totalMg
  const table = buildTable(presentations, doseMg)
  if (!table) return { below: null, above }

  let cells = Math.floor(toUg(doseMg) / table.cellUg)
  while (cells > 0 && table.fewest[cells] === Infinity) cells--
  return { below: cells > 0 ? (cells * table.cellUg) / MG_TO_UG : null, above }
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
  return [...totals.values()].sort((a, b) => b.presentation.strengthMg - a.presentation.strengthMg)
}
