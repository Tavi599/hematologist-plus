import type { CourseDrug } from '../domain'
import type { Drug, DrugInfusionParams, DrugPresentation, RegimenItem } from '../schemas/catalog'
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
  /** What the calculation engine needs; `infusion` is set only when a volume can be derived. */
  courseDrug: CourseDrug
  /** Infusion that cannot be calculated: no catalog parameters and no fallback in the regimen. */
  missingInfusionData: boolean
}

/** One dose the physician can pick for an item: the regimen's own, or another protocol's. */
export interface DoseChoice {
  /** `DEFAULT_DOSE_CHOICE` for the dose written in the regimen, otherwise the source name. */
  id: string
  /** Name of the protocol; null for the regimen's own dose when the regimen names no source. */
  label: string | null
  doseValue: number
  doseUnit: RegimenItem['dose_unit']
  capMg: number | null
  url?: string
}

export const DEFAULT_DOSE_CHOICE = 'default'

/** The regimen's own dose first, then every alternative recorded for the item. */
export function doseChoices(catalog: CatalogIndex, item: RegimenItem): DoseChoice[] {
  const regimenSource = catalog.regimens.get(item.regimen_id)?.sources[0]
  return [
    {
      id: DEFAULT_DOSE_CHOICE,
      label: regimenSource?.name ?? null,
      doseValue: item.dose_value,
      doseUnit: item.dose_unit,
      capMg: item.cap_mg,
      ...(regimenSource?.url === undefined ? {} : { url: regimenSource.url }),
    },
    ...item.dose_options.map((option) => ({
      id: option.source.name,
      label: option.source.name,
      doseValue: option.dose_value,
      doseUnit: option.dose_unit,
      capMg: option.cap_mg,
      ...(option.source.url === undefined ? {} : { url: option.source.url }),
    })),
  ]
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

/** Builds the calculation input for every item of a regimen, in administration order. */
export function buildCourseItems(
  catalog: CatalogIndex,
  regimenId: string,
  chosenDoses?: Record<string, string>,
): CourseItem[] {
  return buildCourseItemsFrom(catalog, catalog.itemsByRegimen.get(regimenId) ?? [], chosenDoses)
}

/** Same for an arbitrary list of items, including drugs the physician added by hand. */
export function buildCourseItemsFrom(
  catalog: CatalogIndex,
  items: RegimenItem[],
  chosenDoses?: Record<string, string>,
): CourseItem[] {
  return items.flatMap((item) => {
    const drug = catalog.drugs.get(item.drug_id)
    if (!drug) return []
    const choices = doseChoices(catalog, item)
    const chosen = choices.find((choice) => choice.id === chosenDoses?.[item.id]) ?? choices[0]!
    const params = resolveInfusionParams(catalog, item)
    const presentations = (catalog.presentationsByDrug.get(item.drug_id) ?? [])
      .filter((presentation) => fitsRoute(presentation.form, item.route))
      .map((presentation) => ({ id: presentation.id, strengthMg: presentation.strength_mg }))
    const infusion = buildInfusionParams(item, params)
    const capMg = chosen.capMg ?? drug.max_single_dose_mg
    const durationMin = item.duration_min ?? params?.duration_min ?? null

    const courseDrug: CourseDrug = {
      id: item.id,
      dose: {
        value: chosen.doseValue,
        unit: chosen.doseUnit,
        ...(capMg === null ? {} : { capMg }),
      },
      days: item.days,
      administrationsPerDay: item.administrations_per_day,
      ...(durationMin === null ? {} : { durationMin }),
      ...(item.gap_before_min === null ? {} : { gapBeforeMin: item.gap_before_min }),
      ...(infusion ? { infusion } : {}),
      ...(presentations.length > 0 ? { presentations } : {}),
      ...(drug.review_rules ? { reviewRules: drug.review_rules } : {}),
    }

    return [
      {
        item,
        drug,
        infusionParams: params,
        doseChoices: choices,
        doseChoiceId: chosen.id,
        courseDrug,
        missingInfusionData: item.route === 'iv_infusion' && !infusion,
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
    cap_mg: null,
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
  return route === 'oral' ? ORAL_FORMS.has(form) : PARENTERAL_FORMS.has(form)
}
