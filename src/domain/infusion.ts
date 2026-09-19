import { DOMAIN_DEFAULTS } from './config'
import { assertPositive } from './math'
import { convertAmount, isMassUnit } from './units'
import { DomainInputError, type AmountUnit, type CalculationStep } from './types'

/** Dilution parameters of a drug, from the drug catalog. Concentration limits are mg/mL. */
export interface InfusionParams {
  /** Lowest allowed final concentration, mg/mL. */
  concentrationMinMgMl?: number
  /** Highest allowed final concentration, mg/mL. */
  concentrationMaxMgMl?: number
  /** Available carrier bag volumes, mL (e.g. 100, 250, 500). */
  bagVolumesMl: number[]
  /** Concentration of the drug concentrate/reconstituted solution, mg/mL; adds drug volume. */
  stockConcentrationMgMl?: number
}

export type InfusionIssue = 'concentration_out_of_range'

export interface InfusionResult {
  bagVolumeMl: number
  drugVolumeMl: number
  totalVolumeMl: number
  /** Final concentration in the dose's own unit per mL. */
  concentrationPerMl: number
  /** Unit of `concentrationPerMl`, e.g. 'mg' → mg/mL. */
  concentrationUnit: AmountUnit
  /** null for undefined duration (bolus / not specified). */
  rateMlH: number | null
  rateGttMin: number | null
  issue: InfusionIssue | null
  steps: CalculationStep[]
}

export interface InfusionInput {
  doseAmount: number
  /** Unit of `doseAmount`; defaults to milligrams. */
  amountUnit?: AmountUnit
  params: InfusionParams
  durationMin?: number
  dropFactorGttPerMl?: number
}

/**
 * Chooses the smallest carrier bag that keeps the final concentration within limits
 * and derives the infusion rate. If no bag fits, the closest compromise is returned with an issue.
 *
 * Concentration limits in the catalog are milligrams per millilitre, so they apply only to a
 * drug measured by mass. A drug measured in units of activity may carry bag volumes but no
 * limits — its volume comes from the protocol, never from a concentration we made up.
 */
export function calculateInfusion(input: InfusionInput): InfusionResult {
  const { doseAmount, params } = input
  const amountUnit = input.amountUnit ?? 'mg'
  const dropFactor = input.dropFactorGttPerMl ?? DOMAIN_DEFAULTS.dropFactorGttPerMl
  assertPositive('doseAmount', doseAmount)
  assertPositive('dropFactorGttPerMl', dropFactor)
  if (params.bagVolumesMl.length === 0) {
    throw new DomainInputError('bagVolumesMl', 'at least one bag volume is required')
  }
  params.bagVolumesMl.forEach((v) => assertPositive('bagVolumesMl', v))
  if (params.stockConcentrationMgMl !== undefined) {
    assertPositive('stockConcentrationMgMl', params.stockConcentrationMgMl)
  }

  const usesMgPerMl =
    params.concentrationMinMgMl !== undefined ||
    params.concentrationMaxMgMl !== undefined ||
    params.stockConcentrationMgMl !== undefined
  if (usesMgPerMl && !isMassUnit(amountUnit)) {
    throw new DomainInputError(
      'concentrationMgMl',
      `mg/mL parameters cannot be applied to a dose in ${amountUnit}`,
    )
  }
  const doseMg = isMassUnit(amountUnit) ? convertAmount(doseAmount, amountUnit, 'mg') : doseAmount

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
  const concentrationPerMl = doseAmount / totalVolumeMl

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
      value: concentrationPerMl,
      unit: `${amountUnit}_ml`,
      params: {
        dose: doseAmount,
        unit: amountUnit,
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
    concentrationPerMl,
    concentrationUnit: amountUnit,
    rateMlH,
    rateGttMin,
    issue,
    steps,
  }
}
