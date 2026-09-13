import { DOMAIN_DEFAULTS } from './config'
import { assertPositive } from './math'
import { DomainInputError, type CalculationStep } from './types'

/** Dilution parameters of a drug, from the drug catalog. */
export interface InfusionParams {
  /** Lowest allowed final concentration, mg/mL. */
  concentrationMinMgMl?: number
  /** Highest allowed final concentration, mg/mL. */
  concentrationMaxMgMl?: number
  /** Available carrier bag volumes, mL (e.g. 100, 250, 500). */
  bagVolumesMl: number[]
  /** Concentration of the drug concentrate/reconstituted solution; adds drug volume to the bag. */
  stockConcentrationMgMl?: number
}

export type InfusionIssue = 'concentration_out_of_range'

export interface InfusionResult {
  bagVolumeMl: number
  drugVolumeMl: number
  totalVolumeMl: number
  concentrationMgMl: number
  /** null for undefined duration (bolus / not specified). */
  rateMlH: number | null
  rateGttMin: number | null
  issue: InfusionIssue | null
  steps: CalculationStep[]
}

export interface InfusionInput {
  doseMg: number
  params: InfusionParams
  durationMin?: number
  dropFactorGttPerMl?: number
}

/**
 * Chooses the smallest carrier bag that keeps the final concentration within limits
 * and derives the infusion rate. If no bag fits, the closest compromise is returned with an issue.
 */
export function calculateInfusion(input: InfusionInput): InfusionResult {
  const { doseMg, params } = input
  const dropFactor = input.dropFactorGttPerMl ?? DOMAIN_DEFAULTS.dropFactorGttPerMl
  assertPositive('doseMg', doseMg)
  assertPositive('dropFactorGttPerMl', dropFactor)
  if (params.bagVolumesMl.length === 0) {
    throw new DomainInputError('bagVolumesMl', 'at least one bag volume is required')
  }
  params.bagVolumesMl.forEach((v) => assertPositive('bagVolumesMl', v))
  if (params.stockConcentrationMgMl !== undefined) {
    assertPositive('stockConcentrationMgMl', params.stockConcentrationMgMl)
  }

  const drugVolumeMl = params.stockConcentrationMgMl ? doseMg / params.stockConcentrationMgMl : 0
  const bags = [...params.bagVolumesMl].sort((a, b) => a - b)
  const concentrationFor = (bag: number) => doseMg / (bag + drugVolumeMl)
  const fitsMax = (bag: number) =>
    params.concentrationMaxMgMl === undefined ||
    concentrationFor(bag) <= params.concentrationMaxMgMl
  const fitsMin = (bag: number) =>
    params.concentrationMinMgMl === undefined ||
    concentrationFor(bag) >= params.concentrationMinMgMl

  let bagVolumeMl = bags.find((bag) => fitsMax(bag) && fitsMin(bag))
  let issue: InfusionIssue | null = null
  if (bagVolumeMl === undefined) {
    issue = 'concentration_out_of_range'
    // Over-concentration is the more dangerous error: prefer the smallest bag that satisfies max.
    bagVolumeMl = bags.find(fitsMax) ?? bags[bags.length - 1]!
  }

  const totalVolumeMl = bagVolumeMl + drugVolumeMl
  const concentrationMgMl = concentrationFor(bagVolumeMl)

  let rateMlH: number | null = null
  let rateGttMin: number | null = null
  if (input.durationMin !== undefined) {
    assertPositive('durationMin', input.durationMin)
    rateMlH = totalVolumeMl / (input.durationMin / 60)
    rateGttMin = (rateMlH * dropFactor) / 60
  }

  const steps: CalculationStep[] = [
    {
      key: 'infusion.volume',
      value: totalVolumeMl,
      unit: 'ml',
      params: { bagVolumeMl, drugVolumeMl },
    },
    {
      key: 'infusion.concentration',
      value: concentrationMgMl,
      unit: 'mg_ml',
      params: {
        doseMg,
        ...(params.concentrationMinMgMl !== undefined && { minMgMl: params.concentrationMinMgMl }),
        ...(params.concentrationMaxMgMl !== undefined && { maxMgMl: params.concentrationMaxMgMl }),
      },
    },
  ]
  if (rateMlH !== null && rateGttMin !== null) {
    steps.push({
      key: 'infusion.rate',
      value: rateMlH,
      unit: 'ml_h',
      params: { durationMin: input.durationMin!, rateGttMin, dropFactor },
    })
  }

  return {
    bagVolumeMl,
    drugVolumeMl,
    totalVolumeMl,
    concentrationMgMl,
    rateMlH,
    rateGttMin,
    issue,
    steps,
  }
}
