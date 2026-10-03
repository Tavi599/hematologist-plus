import { amountUnitOf, convertAmount, DOMAIN_DEFAULTS, type CourseDrug } from '../domain'
import type { Drug, DrugInfusionParams, DrugPresentation, RegimenItem } from '../schemas/catalog'
import type { DoseModifier, Source } from '../schemas/common'
import type { LocalizedText } from './localized'
import type { CatalogIndex } from './catalog-index'

/** A regimen item ready for both the calculation and the table that shows it. */
export interface CourseItem {
  item: RegimenItem
  drug: Drug
  infusionParams: DrugInfusionParams | null
  /** The dose as this regimen writes it plus the same dose from other protocols. */
  doseChoices: DoseChoice[]
  /** Id of the choice the calculation used. */
  doseChoiceId: string
  /** Circumstances that change this dose, as the catalog records them. */
  doseModifiers: DoseModifier[]
  /** Keys of the modifiers the calculation applied. */
  activeModifierKeys: string[]
  /** What the calculation engine needs; `infusion` is set only when a volume can be derived. */
  courseDrug: CourseDrug
  /** Infusion that cannot be calculated: no catalog parameters and no fallback in the regimen. */
  missingInfusionData: boolean
  /** The protocol gives this drug as an infusion the physician may switch to boluses. */
  switchable: boolean
}

/** One dose the physician can pick for an item: the regimen's own, or another protocol's. */
export interface DoseChoice {
  /** `DEFAULT_DOSE_CHOICE` for the dose written in the regimen, otherwise the dose itself. */
  id: string
  /** Name of the protocol; null for the regimen's own dose when the regimen names no source. */
  label: string | null
  /** What tells this alternative from the others when they share a document: the phase, the
   *  platelet count, the indication. Shown in the picker instead of the protocol's name. */
  note?: LocalizedText | null
  doseValue: number
  doseUnit: RegimenItem['dose_unit']
  capAmount: number | null
  /** The document this dose comes from, shown next to the calculation chain. */
  source?: Source
}

export const DEFAULT_DOSE_CHOICE = 'default'

/**
 * Id of an alternative: the dose itself, not the name of its document. One label often states
 * several doses — a phase of the disease, a platelet count — and they must stay apart in the list.
 */
export function doseChoiceId(option: { dose_value: number; dose_unit: string }): string {
  return `${option.dose_value}-${option.dose_unit}`
}

/** The regimen's own dose first, then every alternative recorded for the item. */
export function doseChoices(catalog: CatalogIndex, item: RegimenItem): DoseChoice[] {
  const regimenSource = catalog.regimens.get(item.regimen_id)?.sources[0]
  return [
    {
      id: DEFAULT_DOSE_CHOICE,
      label: regimenSource?.name ?? null,
      doseValue: item.dose_value,
      doseUnit: item.dose_unit,
      capAmount: item.cap_amount,
      ...(regimenSource === undefined ? {} : { source: regimenSource }),
    },
    ...item.dose_options.map((option) => ({
      id: doseChoiceId(option),
      label: option.source.name,
      note: option.notes,
      doseValue: option.dose_value,
      doseUnit: option.dose_unit,
      capAmount: option.cap_amount,
      source: option.source,
    })),
  ]
}

/**
 * The modifiers in force for an item: what the physician ticked, or — before they have touched
 * anything — the ones the protocol itself assumes.
 */
export function activeModifiers(item: RegimenItem, chosen?: string[]): DoseModifier[] {
  // An offline copy saved by an older version of the app has no such column at all.
  const modifiers = item.dose_modifiers ?? []
  if (chosen === undefined) return modifiers.filter((modifier) => modifier.default_on)
  return modifiers.filter((modifier) => chosen.includes(modifier.key))
}

/**
 * The dose after the modifiers in force. Each states a whole dose in the item's own unit, so the
 * safest of them simply wins: the lowest dose, and the lowest cap among those that name one.
 */
export function applyModifiers(
  dose: { value: number; capAmount: number | null },
  modifiers: DoseModifier[],
): { value: number; capAmount: number | null } {
  let value = dose.value
  let capAmount = dose.capAmount
  for (const modifier of modifiers) {
    if (modifier.dose_value < value) value = modifier.dose_value
    if (modifier.cap_amount !== null && (capAmount === null || modifier.cap_amount < capAmount)) {
      capAmount = modifier.cap_amount
    }
  }
  return { value, capAmount }
}

/** Infusion parameters of a drug: the one the item points at, else the default, else the only one. */
export function resolveInfusionParams(
  catalog: CatalogIndex,
  item: RegimenItem,
): DrugInfusionParams | null {
  const all = catalog.infusionParamsByDrug.get(item.drug_id) ?? []
  if (item.infusion_params_id !== null) {
    return all.find((params) => params.id === item.infusion_params_id) ?? null
  }
  return all.find((params) => params.is_default) ?? (all.length === 1 ? all[0]! : null)
}

/**
 * How the physician gives a drug whose schedule varies between hospitals. `protocol` keeps the
 * regimen's own row; `bolus` gives the same daily dose as `count` equal boluses `intervalMin`
 * apart, the first one together with the day's first chained drug.
 */
export type AdministrationMode =
  { kind: 'protocol' } | { kind: 'bolus'; count: number; intervalMin: number }

export const PROTOCOL_MODE: AdministrationMode = { kind: 'protocol' }

/** Drugs whose way of giving the physician may switch in any protocol. */
const SWITCHABLE_DRUGS = new Set(['mesna'])

/** Drugs whose dose goes up to whole ampoules in every mode: 6.5 ampoules are given as 7. */
const WHOLE_PACK_DRUGS = new Set(['mesna'])

/** Only a protocol infusion can be switched: a row the protocol already gives as a bolus stays. */
export function canSwitchAdministration(item: Pick<RegimenItem, 'drug_id' | 'route'>): boolean {
  return SWITCHABLE_DRUGS.has(item.drug_id) && item.route === 'iv_infusion'
}

/** The mode a physician gets on first switching to boluses. */
export function defaultBolusMode(): AdministrationMode {
  return { kind: 'bolus', ...DOMAIN_DEFAULTS.mesnaBolus }
}

/**
 * The row as the physician chose to give it. The daily dose stays what the protocol states
 * (dose × administrations a day); only its split changes, so doses, alternatives and modifiers
 * are all rescaled to one bolus. An infusion's duration and bags no longer apply.
 */
export function applyAdministrationMode(item: RegimenItem, mode: AdministrationMode): RegimenItem {
  if (mode.kind === 'protocol' || !canSwitchAdministration(item)) return item
  const factor = item.administrations_per_day / mode.count
  return {
    ...item,
    route: 'iv_bolus',
    administrations_per_day: mode.count,
    interval_min: mode.intervalMin,
    anchor_offset_min: item.anchor_offset_min ?? 0,
    block: 'day_support',
    duration_min: null,
    fallback_solvent: null,
    fallback_volume_ml: null,
    infusion_params_id: null,
    gap_before_min: null,
    dose_value: item.dose_value * factor,
    cap_amount: item.cap_amount === null ? null : item.cap_amount * factor,
    dose_options: item.dose_options.map((option) => ({
      ...option,
      dose_value: option.dose_value * factor,
      cap_amount: option.cap_amount === null ? null : option.cap_amount * factor,
    })),
    dose_modifiers: (item.dose_modifiers ?? []).map((modifier) => ({
      ...modifier,
      dose_value: modifier.dose_value * factor,
      cap_amount: modifier.cap_amount === null ? null : modifier.cap_amount * factor,
    })),
  }
}

/** Builds the calculation input for every item of a regimen, in administration order. */
export function buildCourseItems(
  catalog: CatalogIndex,
  regimenId: string,
  chosenDoses?: Record<string, string>,
  chosenModifiers?: Record<string, string[]>,
  administrationModes?: Record<string, AdministrationMode>,
): CourseItem[] {
  return buildCourseItemsFrom(
    catalog,
    catalog.itemsByRegimen.get(regimenId) ?? [],
    chosenDoses,
    chosenModifiers,
    administrationModes,
  )
}

/** Same for an arbitrary list of items, including drugs the physician added by hand. */
export function buildCourseItemsFrom(
  catalog: CatalogIndex,
  protocolItems: RegimenItem[],
  chosenDoses?: Record<string, string>,
  chosenModifiers?: Record<string, string[]>,
  administrationModes?: Record<string, AdministrationMode>,
): CourseItem[] {
  const switchable = new Set(
    protocolItems.filter((item) => canSwitchAdministration(item)).map((item) => item.id),
  )
  const items = protocolItems.map((item) =>
    applyAdministrationMode(item, administrationModes?.[item.id] ?? PROTOCOL_MODE),
  )
  return items.flatMap((item) => {
    const drug = catalog.drugs.get(item.drug_id)
    if (!drug) return []
    const choices = doseChoices(catalog, item)
    const chosen = choices.find((choice) => choice.id === chosenDoses?.[item.id]) ?? choices[0]!
    const params = resolveInfusionParams(catalog, item)
    const presentations = (catalog.presentationsByDrug.get(item.drug_id) ?? [])
      .filter((presentation) => fitsRoute(presentation.form, item.route))
      .map((presentation) => ({
        id: presentation.id,
        strengthAmount: presentation.strength_amount,
        unit: presentation.strength_unit,
      }))
    const infusion = buildInfusionParams(item, params)
    // The regimen's own cap is already in the dose's unit; the drug's maximum is in the unit the
    // drug is measured in, which is not always the same one.
    const capAmount =
      chosen.capAmount ??
      (drug.max_single_dose_amount === null
        ? null
        : convertAmount(
            drug.max_single_dose_amount,
            drug.amount_unit,
            amountUnitOf(chosen.doseUnit),
            drug.unit_equivalence,
          ))
    const durationMin = item.duration_min ?? params?.duration_min ?? null
    const modifiers = activeModifiers(item, chosenModifiers?.[item.id])
    const dosed = applyModifiers({ value: chosen.doseValue, capAmount }, modifiers)

    const courseDrug: CourseDrug = {
      id: item.id,
      dose: {
        value: dosed.value,
        unit: chosen.doseUnit,
        ...(dosed.capAmount === null ? {} : { capAmount: dosed.capAmount }),
      },
      days: item.days,
      administrationsPerDay: item.administrations_per_day,
      ...(durationMin === null ? {} : { durationMin }),
      ...(item.gap_before_min === null ? {} : { gapBeforeMin: item.gap_before_min }),
      ...(infusion ? { infusion } : {}),
      ...(presentations.length > 0 ? { presentations } : {}),
      ...(WHOLE_PACK_DRUGS.has(item.drug_id) && presentations.length > 0
        ? { roundUpToWholePack: true }
        : {}),
      ...(drug.review_rules ? { reviewRules: drug.review_rules } : {}),
      ...(drug.unit_equivalence ? { unitEquivalence: drug.unit_equivalence } : {}),
      block: item.block,
      isMain: item.role === 'main',
      ...(item.anchor_offset_min === null ? {} : { anchorOffsetMin: item.anchor_offset_min }),
      ...(item.interval_min === null ? {} : { intervalMin: item.interval_min }),
    }

    return [
      {
        item,
        drug,
        infusionParams: params,
        doseChoices: choices,
        doseChoiceId: chosen.id,
        doseModifiers: item.dose_modifiers ?? [],
        activeModifierKeys: modifiers.map((modifier) => modifier.key),
        courseDrug,
        missingInfusionData: item.route === 'iv_infusion' && !infusion,
        switchable: switchable.has(item.id),
      },
    ]
  })
}

function buildInfusionParams(
  item: RegimenItem,
  params: DrugInfusionParams | null,
): CourseDrug['infusion'] {
  if (item.route !== 'iv_infusion') return undefined
  // Fallback volume from the regimen template is used when the catalog has no bag volumes.
  const bagVolumesMl =
    params && params.bag_volumes_ml.length > 0
      ? params.bag_volumes_ml
      : item.fallback_volume_ml === null
        ? []
        : [item.fallback_volume_ml]
  if (bagVolumesMl.length === 0) return undefined

  return {
    bagVolumesMl,
    ...(params?.concentration_min_mg_ml === null || params?.concentration_min_mg_ml === undefined
      ? {}
      : { concentrationMinMgMl: params.concentration_min_mg_ml }),
    ...(params?.concentration_max_mg_ml === null || params?.concentration_max_mg_ml === undefined
      ? {}
      : { concentrationMaxMgMl: params.concentration_max_mg_ml }),
    ...(params?.stock_concentration_mg_ml === null ||
    params?.stock_concentration_mg_ml === undefined
      ? {}
      : { stockConcentrationMgMl: params.stock_concentration_mg_ml }),
    ...(params?.rate_ramp
      ? {
          rateRamp: {
            first: toRateSteps(params.rate_ramp.first),
            ...(params.rate_ramp.next === null ? {} : { next: toRateSteps(params.rate_ramp.next) }),
          },
        }
      : {}),
  }
}

/** A drug the physician added to the course by hand, shaped like a regimen item. */
export function customCourseItem(params: {
  id: string
  drugId: string
  doseValue: number
  doseUnit: RegimenItem['dose_unit']
  days: number[]
  route: RegimenItem['route']
  durationMin?: number | null
  sortOrder: number
}): RegimenItem {
  return {
    id: params.id,
    regimen_id: '',
    drug_id: params.drugId,
    role: 'main',
    route: params.route,
    dose_value: params.doseValue,
    dose_unit: params.doseUnit,
    cap_amount: null,
    days: params.days,
    administrations_per_day: 1,
    infusion_params_id: null,
    duration_min: params.durationMin ?? null,
    fallback_solvent: null,
    fallback_volume_ml: null,
    gap_before_min: null,
    notes: null,
    sort_order: params.sortOrder,
    dose_options: [],
    dose_modifiers: [],
    // A drug added by hand is placed like the rest of its kind: tablets on the ward sheet.
    block: params.route === 'oral' ? 'ward' : 'infusion',
    interval_min: null,
    anchor_offset_min: null,
  }
}

/** The database writes the rate steps in snake_case; the calculation engine speaks camelCase. */
function toRateSteps(steps: {
  start_ml_h: number
  step_ml_h: number
  every_min: number
  max_ml_h: number
}) {
  return {
    startMlH: steps.start_ml_h,
    stepMlH: steps.step_ml_h,
    everyMin: steps.every_min,
    maxMlH: steps.max_ml_h,
  }
}

const ORAL_FORMS = new Set<DrugPresentation['form']>(['tablet', 'capsule'])
const PARENTERAL_FORMS = new Set<DrugPresentation['form']>(['vial', 'ampoule', 'syringe'])

/**
 * A tablet cannot be given intravenously and an ampoule cannot be swallowed, so the vial/tablet
 * count uses only the packs that match the route of this item.
 */
export function fitsRoute(form: DrugPresentation['form'], route: RegimenItem['route']): boolean {
  if (form === 'other') return false
  // A bottle of drops or a tube of ointment is not used up one pack per administration, so no
  // pack is counted against a topical order. The need for the course is a separate question.
  if (route === 'topical') return false
  return route === 'oral' ? ORAL_FORMS.has(form) : PARENTERAL_FORMS.has(form)
}
