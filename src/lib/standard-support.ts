import type { RegimenItem } from '../schemas/catalog'
import type { CatalogIndex } from './catalog-index'
import type { CourseItem } from './course-input'

/**
 * The supportive care every course is surrounded by — antiemetics and prophylaxis against viral,
 * pneumocystis and fungal infection — as four switches the physician turns on or off by the
 * standard, instead of hunting for the rows in the regimen.
 *
 * A regimen that already writes such rows keeps them: the switch enables or disables them as a
 * group. A regimen that does not — most of them, since a protocol often says «antiemetics per
 * local policy» without a dose — gets the standard rows below while the switch is on.
 *
 * CALIBRATION: the standard doses are the ones the NSSG Oxford lymphoma and myeloid protocols
 * give for the same prophylaxis (ondansetron 8 mg twice a day on the days of chemotherapy,
 * co-trimoxazole 480 mg on Monday, Wednesday and Friday, fluconazole 50 mg a day), except the
 * antiviral: the department's own 400 mg twice a day, as in the regimens already in the catalog
 * (NSSG writes 200 mg three times a day). Change them here, not inline.
 */
export const SUPPORT_CATEGORIES = ['antiemetic', 'antiviral', 'pneumocystis', 'antifungal'] as const
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]

const CATEGORY_DRUGS: Record<SupportCategory, readonly string[]> = {
  antiemetic: ['ondansetron', 'metoclopramide', 'aprepitant'],
  antiviral: ['aciclovir', 'valaciclovir'],
  pneumocystis: ['co-trimoxazole'],
  antifungal: ['fluconazole', 'posaconazole', 'voriconazole'],
}

export const NO_SUPPORT: Record<SupportCategory, boolean> = {
  antiemetic: false,
  antiviral: false,
  pneumocystis: false,
  antifungal: false,
}

const MONDAY_WEDNESDAY_FRIDAY = new Set([1, 3, 5])
const STANDARD_ID_PREFIX = 'standard-support.'

export function isStandardSupportId(id: string): boolean {
  return id.startsWith(STANDARD_ID_PREFIX)
}

/** Which kind of supportive care a regimen row is, or null for a drug that treats the disease. */
export function supportCategoryOf(item: RegimenItem): SupportCategory | null {
  if (item.role === 'main') return null
  return (
    SUPPORT_CATEGORIES.find((category) => CATEGORY_DRUGS[category].includes(item.drug_id)) ?? null
  )
}

/** The regimen's own rows of one kind. */
export function categoryItemIds(items: CourseItem[], category: SupportCategory): string[] {
  return items
    .filter((entry) => !entry.item.id.startsWith(STANDARD_ID_PREFIX))
    .filter((entry) => supportCategoryOf(entry.item) === category)
    .map((entry) => entry.item.id)
}

/** Days 1..n, the whole cycle. */
function wholeCycle(cycleDays: number): number[] {
  return Array.from({ length: cycleDays }, (_unused, index) => index + 1)
}

/** Calendar weekday (0 = Sunday) of a course day that starts on `startDateIso`. */
function weekdayOf(startDateIso: string, day: number): number {
  const [year, month, date] = startDateIso.split('-').map(Number)
  return new Date(Date.UTC(year!, month! - 1, date! + day - 1)).getUTCDay()
}

function row(
  base: Pick<RegimenItem, 'regimen_id' | 'sort_order'>,
  category: SupportCategory,
  fields: Pick<RegimenItem, 'drug_id' | 'route' | 'dose_value' | 'days'> &
    Partial<RegimenItem> & { notes: NonNullable<RegimenItem['notes']> },
): RegimenItem {
  return {
    id: `${STANDARD_ID_PREFIX}${category}`,
    role: 'supportive',
    dose_unit: 'mg_flat',
    cap_amount: null,
    administrations_per_day: 1,
    infusion_params_id: null,
    duration_min: null,
    fallback_solvent: null,
    fallback_volume_ml: null,
    gap_before_min: null,
    dose_options: [],
    dose_modifiers: [],
    block: fields.route === 'oral' ? 'ward' : 'day_support',
    interval_min: null,
    anchor_offset_min: null,
    ...base,
    ...fields,
  }
}

/**
 * The standard rows for every switched-on kind the regimen does not write itself. Days follow
 * the course: the whole cycle for the prophylaxis, the days a cytostatic is given for the
 * antiemetic, the days that fall on Monday, Wednesday and Friday for co-trimoxazole.
 */
export function standardSupportRows(
  catalog: CatalogIndex,
  items: CourseItem[],
  cycleLengthDays: number | null,
  startDateIso: string,
  on: Record<SupportCategory, boolean>,
): RegimenItem[] {
  const lastDay = Math.max(cycleLengthDays ?? 0, ...items.flatMap((entry) => entry.item.days), 1)
  const cycle = wholeCycle(lastDay)
  const regimenId = items[0]?.item.regimen_id ?? 'standard-support'
  const result: RegimenItem[] = []
  let order = 1000

  for (const category of SUPPORT_CATEGORIES) {
    if (!on[category] || categoryItemIds(items, category).length > 0) continue
    const base = { regimen_id: regimenId, sort_order: order++ }
    const has = (drugId: string) => catalog.drugs.has(drugId)

    if (category === 'antiviral' && has('aciclovir')) {
      result.push(
        row(base, category, {
          drug_id: 'aciclovir',
          route: 'oral',
          dose_value: 400,
          days: cycle,
          administrations_per_day: 2,
          notes: {
            uk: 'Стандартна противірусна профілактика: 400 мг двічі на добу впродовж лікування і ще 3 місяці після. Додано перемикачем «Супровід за стандартом».',
            en: 'Standard antiviral prophylaxis: 400 mg twice a day during treatment and for 3 months after. Added by the «Standard support» switch.',
          },
        }),
      )
    }
    if (category === 'antifungal' && has('fluconazole')) {
      result.push(
        row(base, category, {
          drug_id: 'fluconazole',
          route: 'oral',
          dose_value: 50,
          days: cycle,
          notes: {
            uk: 'Стандартна протигрибкова профілактика низького ризику: 50 мг на добу впродовж лікування. При високому ризику (довга нейтропенія) протоколи радять позаконазол чи вориконазол — обирає лікар. Додано перемикачем «Супровід за стандартом».',
            en: 'Standard low-risk antifungal prophylaxis: 50 mg a day during treatment. At high risk (prolonged neutropenia) the protocols advise posaconazole or voriconazole — the physician chooses. Added by the «Standard support» switch.',
          },
        }),
      )
    }
    if (category === 'pneumocystis' && has('co-trimoxazole')) {
      const days = cycle.filter((day) => MONDAY_WEDNESDAY_FRIDAY.has(weekdayOf(startDateIso, day)))
      if (days.length > 0) {
        result.push(
          row(base, category, {
            drug_id: 'co-trimoxazole',
            route: 'oral',
            dose_value: 480,
            days,
            notes: {
              uk: "Профілактика пневмоцистної пневмонії: 480 мг у понеділок, середу й п'ятницю впродовж лікування і щонайменше 3 місяці після. Не поєднувати з метотрексатом у високих дозах; при непереносимості — пентамідин. Додано перемикачем «Супровід за стандартом».",
              en: 'Pneumocystis prophylaxis: 480 mg on Monday, Wednesday and Friday during treatment and for at least 3 months after. Not to be combined with high-dose methotrexate; pentamidine if it is not tolerated. Added by the «Standard support» switch.',
            },
          }),
        )
      }
    }
    if (category === 'antiemetic' && has('ondansetron')) {
      const days = [
        ...new Set(
          items
            .filter(
              (entry) =>
                entry.item.role === 'main' &&
                (entry.item.route === 'iv_infusion' || entry.item.route === 'iv_bolus'),
            )
            .flatMap((entry) => entry.item.days),
        ),
      ].sort((a, b) => a - b)
      if (days.length > 0) {
        result.push(
          row(base, category, {
            drug_id: 'ondansetron',
            route: 'iv_bolus',
            dose_value: 8,
            days,
            administrations_per_day: 2,
            anchor_offset_min: -30,
            interval_min: 480,
            notes: {
              uk: 'Стандартний протиблювотний засіб: 8 мг двічі на добу в дні введення цитостатиків, перша доза за 30 хв до початку. Схему за рівнем емето-ризику (метоклопрамід, апрепітант, дексаметазон) визначає лікар. Додано перемикачем «Супровід за стандартом».',
              en: "Standard antiemetic: 8 mg twice a day on the days cytostatics are given, the first dose 30 minutes ahead. The choice by emetic risk (metoclopramide, aprepitant, dexamethasone) is the physician's. Added by the «Standard support» switch.",
            },
          }),
        )
      }
    }
  }
  return result
}
