import type { CourseResult } from '../domain'
import type { RegimenItem } from '../schemas/catalog'
import type { CatalogIndex } from './catalog-index'
import { buildCourseItemsFrom, type CourseItem } from './course-input'

/** A single cyclophosphamide dose from which the department protects the bladder with mesna. */
export const CYCLOPHOSPHAMIDE_MESNA_FROM_MG = 1000

/**
 * The mesna label (Mesna Injection SmPC, section 4.2): with an intravenous oxazaphosphorine,
 * 20% of its dose, weight for weight, by injection at 0, 4 and 8 hours — 60% in all.
 */
const LABEL_SHARE = 0.2
const LABEL_BOLUSES = 3
const LABEL_INTERVAL_MIN = 240

/**
 * Mesna on offer for every intravenous cyclophosphamide whose calculated single dose reaches
 * 1000 mg, unless the course already gives mesna of its own. It is only an offer: a protocol
 * that gives none (R-CHOP) is followed as written, and the physician adds it with one click
 * (decision of 2026-10-10). The dose follows the cyclophosphamide as
 * calculated — after the BSA variant, reductions and a dose typed by hand — so this runs on a
 * calculated course, and the course is calculated again with these rows in it.
 */
export function cyclophosphamideMesna(
  catalog: CatalogIndex,
  items: CourseItem[],
  course: CourseResult,
): CourseItem[] {
  if (!catalog.drugs.has('mesna')) return []
  if (items.some((entry) => entry.item.drug_id === 'mesna')) return []
  const results = new Map(course.drugs.map((drug) => [drug.id, drug]))

  return items.flatMap((entry) => {
    const { item } = entry
    if (item.drug_id !== 'cyclophosphamide' || item.route === 'oral') return []
    const result = results.get(item.id)
    if (!result || result.amountUnit !== 'mg') return []
    if (result.doseAmount < CYCLOPHOSPHAMIDE_MESNA_FROM_MG) return []

    const mesna: RegimenItem = {
      id: `${item.id}+mesna`,
      regimen_id: item.regimen_id,
      drug_id: 'mesna',
      role: 'supportive',
      route: 'iv_bolus',
      dose_value: result.doseAmount * LABEL_SHARE,
      dose_unit: 'mg_flat',
      cap_amount: null,
      days: item.days,
      administrations_per_day: LABEL_BOLUSES,
      infusion_params_id: null,
      duration_min: null,
      fallback_solvent: null,
      fallback_volume_ml: null,
      gap_before_min: null,
      notes: {
        uk: `Профілактика геморагічного циститу, додана лікарем: разова доза циклофосфаміду ${result.doseAmount} мг ≥ ${CYCLOPHOSPHAMIDE_MESNA_FROM_MG} мг, а протокол схеми месни не дає. За інструкцією месни: 20% дози циклофосфаміду в/в за 15–30 хв о 0, 4 і 8 год від початку циклофосфаміду (разом 60%).`,
        en: `Haemorrhagic cystitis prophylaxis added by the physician: the single cyclophosphamide dose of ${result.doseAmount} mg is at least ${CYCLOPHOSPHAMIDE_MESNA_FROM_MG} mg and the regimen's protocol gives no mesna. Per the mesna label: 20% of the cyclophosphamide dose IV over 15–30 min at 0, 4 and 8 hours from the start of the cyclophosphamide (60% in all).`,
      },
      sort_order: item.sort_order,
      dose_options: [],
      dose_modifiers: [],
      block: 'day_support',
      interval_min: LABEL_INTERVAL_MIN,
      anchor_offset_min: 0,
    }
    return buildCourseItemsFrom(catalog, [mesna]).map((built) => ({
      ...built,
      courseDrug: { ...built.courseDrug, anchorDrugId: item.id },
    }))
  })
}
