import type { RampKind } from '../domain'
import type { DrugInfusionParams } from '../schemas/catalog'

type Steps = NonNullable<DrugInfusionParams['rate_ramp']>['first']

/**
 * The rate steps a dose of the given kind runs at, as the catalog writes them: the second
 * infusion has its own only where the label sets one (daratumumab IV); otherwise it runs like the
 * later ones, and those like the first where the drug has no faster restart.
 */
export function rampStepsFor(params: DrugInfusionParams, kind: RampKind): Steps | null {
  const ramp = params.rate_ramp
  if (!ramp) return null
  if (kind === 'first' || kind === 'first_split') return ramp.first
  const next = ramp.next ?? ramp.first
  return kind === 'second' ? (params.ramp_sequence?.second ?? next) : next
}
