import type { RegimenItem } from '../schemas/catalog'
import type { CatalogIndex } from './catalog-index'
import type { CourseItem } from './course-input'

/**
 * The supportive care every course is surrounded by — antiemetics, prophylaxis against viral,
 * pneumocystis and fungal infection, and thromboprophylaxis — as five switches the physician turns on or off by the
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
 *
 * Thromboprophylaxis offers three drugs, as the NSSG myeloma protocols do: apixaban 2.5 mg twice
 * a day, their standard (MM.38, MM.56, MM.59); a low-molecular-weight heparin, enoxaparin 40 mg a
 * day; and aspirin 100 mg a day, for a patient with no other risk factor. The enoxaparin and aspirin
 * doses are those of the randomised trials (Palumbo, J Clin Oncol 2011; Larocca, Blood 2012);
 * NSSG names no heparin dose and gives aspirin 75 mg (MM.59).
 *
 * The antiviral can be valaciclovir instead, 500 mg twice a day: the label's dose for suppressing
 * herpes simplex in an immunocompromised adult. Antibacterial prophylaxis is levofloxacin 500 mg a
 * day, the NSSG myeloma protocols' dose (MM.18). Both carry the label's ranges of creatinine
 * clearance here, since no regimen of the catalog writes them for the switch to borrow.
 */
export const SUPPORT_CATEGORIES = [
  'antiemetic',
  'antiviral',
  'pneumocystis',
  'antifungal',
  'antibacterial',
  'gastroprotection',
  'allopurinol',
  'thrombosis',
] as const
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number]

const CATEGORY_DRUGS: Record<SupportCategory, readonly string[]> = {
  antiemetic: ['ondansetron', 'metoclopramide', 'aprepitant'],
  antiviral: ['aciclovir', 'valaciclovir'],
  pneumocystis: ['co-trimoxazole'],
  antifungal: ['fluconazole', 'posaconazole', 'voriconazole'],
  antibacterial: ['levofloxacin', 'ciprofloxacin'],
  gastroprotection: ['omeprazole'],
  allopurinol: ['allopurinol'],
  thrombosis: ['acetylsalicylic-acid', 'apixaban', 'enoxaparin'],
}

export const THROMBO_AGENTS = ['apixaban', 'enoxaparin', 'aspirin'] as const
export type ThromboAgent = (typeof THROMBO_AGENTS)[number]

/**
 * Gastroprotection, the department's three ways of giving it: omeprazole 20 mg by mouth every
 * day, 40 mg intravenously every day, or 40 mg intravenously on the days a steroid is given.
 */
export const GASTRO_AGENTS = ['tablet', 'iv_daily', 'iv_steroid'] as const
export type GastroAgent = (typeof GASTRO_AGENTS)[number]

/** Steroids that call for gastroprotection on the days they are given. */
const STEROID_DRUGS = new Set([
  'dexamethasone',
  'prednisolone',
  'methylprednisolone',
  'hydrocortisone',
])

/** Days of the allopurinol prophylaxis: the first week of the cycle, as the department writes it. */
const ALLOPURINOL_DAYS = 7

export const ANTIVIRAL_AGENTS = ['aciclovir', 'valaciclovir'] as const
export type AntiviralAgent = (typeof ANTIVIRAL_AGENTS)[number]

/**
 * The drugs that make a kind of prophylaxis part of the course, per the NSSG myeloma protocols:
 * aciclovir with a proteasome inhibitor or an anti-CD38 antibody (for the whole treatment and three
 * months after), thromboprophylaxis with an immunomodulatory drug. Such a kind opens switched on.
 */
const INDICATED_BY: Partial<Record<SupportCategory, readonly string[]>> = {
  antiviral: ['bortezomib', 'carfilzomib', 'ixazomib', 'daratumumab', 'isatuximab'],
  thrombosis: ['lenalidomide', 'thalidomide', 'pomalidomide'],
}

/** For each kind the course calls for, the drugs of the regimen that call for it. */
export function indicatedSupport(items: CourseItem[]): Partial<Record<SupportCategory, string[]>> {
  const result: Partial<Record<SupportCategory, string[]>> = {}
  for (const category of SUPPORT_CATEGORIES) {
    const drugs = [
      ...new Set(
        items
          .filter((entry) => entry.item.role === 'main')
          .map((entry) => entry.item.drug_id)
          .filter((drugId) => INDICATED_BY[category]?.includes(drugId)),
      ),
    ]
    if (drugs.length > 0) result[category] = drugs
  }
  return result
}

export const NO_SUPPORT: Record<SupportCategory, boolean> = {
  antiemetic: false,
  antiviral: false,
  pneumocystis: false,
  antifungal: false,
  antibacterial: false,
  gastroprotection: false,
  allopurinol: false,
  thrombosis: false,
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
    renal_bands: [],
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
  thromboAgent: ThromboAgent = 'aspirin',
  antiviralAgent: AntiviralAgent = 'aciclovir',
  gastroAgent: GastroAgent = 'tablet',
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

    if (category === 'antiviral' && antiviralAgent === 'valaciclovir' && has('valaciclovir')) {
      result.push(
        row(base, category, {
          drug_id: 'valaciclovir',
          route: 'oral',
          dose_value: 500,
          days: cycle,
          administrations_per_day: 2,
          renal_bands: [
            {
              crcl_min: 0,
              crcl_max: 29,
              dose_value: 500,
              administrations_per_day: 1,
              withhold: null,
              dose_min: null,
              dose_max: null,
              interval_min: null,
              notes: {
                uk: 'SmPC (пригнічення HSV в імунокомпрометованих): КК < 30 — 500 мг раз на добу; на гемодіалізі — після сеансу.',
                en: 'SmPC (HSV suppression in the immunocompromised): CrCl < 30, 500 mg once a day; on haemodialysis, after the session.',
              },
              source: VALTREX_SMPC,
            },
          ],
          notes: {
            uk: 'Валацикловір 500 мг двічі на добу — доза SmPC для пригнічення HSV в імунокомпрометованих дорослих; впродовж лікування і ще 3 місяці після. Альтернатива ацикловіру. Додано перемикачем «Супровід за стандартом».',
            en: 'Valaciclovir 500 mg twice a day, the SmPC dose for suppressing HSV in immunocompromised adults; during treatment and for 3 months after. An alternative to aciclovir. Added by the «Standard support» switch.',
          },
        }),
      )
    }
    if (category === 'gastroprotection' && has('omeprazole')) {
      const added = gastroRow(base, cycle, items, gastroAgent)
      if (added) result.push(added)
    }
    if (category === 'allopurinol' && has('allopurinol')) {
      result.push(
        row(base, category, {
          drug_id: 'allopurinol',
          route: 'oral',
          dose_value: 300,
          days: cycle.slice(0, ALLOPURINOL_DAYS),
          notes: {
            uk: 'Профілактика синдрому лізису пухлини: алопуринол 300 мг раз на добу, дні 1–7 (як на листі відділення). Алопуринол і його метаболіт виводяться нирками: при зниженій функції нирок дозу зменшують за інструкцією — автоматично тут не коригується. Додано перемикачем «Супровід за стандартом».',
            en: 'Tumour lysis prophylaxis: allopurinol 300 mg once a day, days 1-7 (as on the department sheet). Allopurinol and its metabolite are cleared by the kidneys: with reduced renal function the dose is lowered per the label, not corrected automatically here. Added by the «Standard support» switch.',
          },
        }),
      )
    }
    if (category === 'antibacterial' && has('levofloxacin')) {
      result.push(
        row(base, category, {
          drug_id: 'levofloxacin',
          route: 'oral',
          dose_value: 500,
          days: cycle,
          renal_bands: [
            {
              crcl_min: 20,
              crcl_max: 50,
              dose_value: 250,
              administrations_per_day: 1,
              withhold: null,
              dose_min: null,
              dose_max: null,
              interval_min: null,
              first_dose_full: true,
              notes: {
                uk: 'SmPC: КК 20–50 — перша доза 500 мг, далі 250 мг кожні 24 год.',
                en: 'SmPC: CrCl 20-50, a first dose of 500 mg, then 250 mg every 24 h.',
              },
              source: LEVOFLOXACIN_SMPC,
            },
            {
              crcl_min: 0,
              crcl_max: 19,
              dose_value: 125,
              administrations_per_day: 1,
              withhold: null,
              dose_min: null,
              dose_max: null,
              interval_min: null,
              first_dose_full: true,
              notes: {
                uk: 'SmPC: КК < 20 (і на гемодіалізі чи ПАПД, без додаткових доз) — перша доза 500 мг, далі 125 мг кожні 24 год. Таблеток 125 мг немає: половина таблетки 250 мг, лише якщо інструкція конкретного препарату дозволяє ділити.',
                en: 'SmPC: CrCl < 20 (and on haemodialysis or CAPD, with no extra doses), a first dose of 500 mg, then 125 mg every 24 h. There is no 125 mg tablet: half a 250 mg tablet, only where the label of that product allows dividing it.',
              },
              source: LEVOFLOXACIN_SMPC,
            },
          ],
          notes: {
            uk: 'Антибактеріальна профілактика: левофлоксацин 500 мг раз на добу (NSSG MM.18 — 12 тижнів від початку лікування мієломи; при тривалій глибокій нейтропенії — на її час). Дні обирає лікар. Додано перемикачем «Супровід за стандартом».',
            en: 'Antibacterial prophylaxis: levofloxacin 500 mg once a day (NSSG MM.18: 12 weeks from the start of myeloma treatment; in long, deep neutropenia, for its duration). The physician chooses the days. Added by the «Standard support» switch.',
          },
        }),
      )
    }
    if (category === 'antiviral' && antiviralAgent === 'aciclovir' && has('aciclovir')) {
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
    if (category === 'thrombosis') {
      const added = thromboRow(base, cycle, thromboAgent)
      if (has(added.drug_id)) result.push(added)
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
  return result.map((added) =>
    added.renal_bands.length > 0
      ? added
      : { ...added, renal_bands: catalogRenalBands(catalog, added) },
  )
}

const VALTREX_SMPC = {
  name: 'SmPC Valtrex 500mg Tablets (emc), 4.2',
  url: 'https://www.medicines.org.uk/emc/product/5467/smpc',
  version: 'ред. 18.06.2026',
  checkedOn: '2026-10-13',
}

const LEVOFLOXACIN_SMPC = {
  name: 'SmPC Levofloxacin 500mg film-coated tablets (Ipca, emc), 4.2',
  url: 'https://www.medicines.org.uk/emc/product/12153/smpc',
  version: 'ред. 05.2026',
  checkedOn: '2026-10-13',
}

/**
 * The label's ranges of creatinine clearance for a standard row: those the catalog writes for the
 * regimens' own rows of the same drug, dose and frequency (aciclovir 400 mg twice a day), so a
 * row added by the switch is corrected exactly as the regimen's own would be.
 */
function catalogRenalBands(catalog: CatalogIndex, added: RegimenItem): RegimenItem['renal_bands'] {
  const same = catalog.rows.regimen_items.find(
    (item) =>
      item.role === 'supportive' &&
      item.drug_id === added.drug_id &&
      item.route === added.route &&
      item.dose_unit === added.dose_unit &&
      item.dose_value === added.dose_value &&
      item.administrations_per_day === added.administrations_per_day &&
      item.renal_bands.length > 0,
  )
  return same?.renal_bands ?? []
}

/** The omeprazole row for the way the physician gave it, or null where a steroid is never given. */
function gastroRow(
  base: Pick<RegimenItem, 'regimen_id' | 'sort_order'>,
  cycle: number[],
  items: CourseItem[],
  agent: GastroAgent,
): RegimenItem | null {
  const note = {
    uk: ' Додано перемикачем «Супровід за стандартом».',
    en: ' Added by the «Standard support» switch.',
  }
  if (agent === 'tablet') {
    return row(base, 'gastroprotection', {
      drug_id: 'omeprazole',
      route: 'oral',
      dose_value: 20,
      days: cycle,
      notes: {
        uk: `Омепразол 20 мг всередину раз на добу вранці натще — гастропротекція на весь цикл.${note.uk}`,
        en: `Omeprazole 20 mg by mouth once a day in the morning, fasting: gastroprotection for the whole cycle.${note.en}`,
      },
    })
  }
  const intravenous = {
    drug_id: 'omeprazole',
    route: 'iv_bolus' as const,
    dose_value: 40,
  }
  if (agent === 'iv_daily') {
    return row(base, 'gastroprotection', {
      ...intravenous,
      days: cycle,
      // Every day for weeks belongs with the ward's daily drugs, not the day's infusions.
      block: 'ward',
      notes: {
        uk: `Омепразол 40 мг в/в струминно повільно (у 20–40 мл 0,9% NaCl, як у дизайнах відділення) щодня.${note.uk}`,
        en: `Omeprazole 40 mg by slow IV push (in 20-40 mL of 0.9% NaCl, as in the department designs) every day.${note.en}`,
      },
    })
  }
  const days = [
    ...new Set(
      items
        .filter((entry) => STEROID_DRUGS.has(entry.item.drug_id))
        .flatMap((entry) => entry.item.days),
    ),
  ].sort((a, b) => a - b)
  if (days.length === 0) return null
  return row(base, 'gastroprotection', {
    ...intravenous,
    days,
    anchor_offset_min: -30,
    notes: {
      uk: `Омепразол 40 мг в/в струминно повільно (у 20–40 мл 0,9% NaCl) у дні введення стероїдів, перед цитостатиком.${note.uk}`,
      en: `Omeprazole 40 mg by slow IV push (in 20-40 mL of 0.9% NaCl) on the days a steroid is given, before the cytostatic.${note.en}`,
    },
  })
}

const THROMBO_NOTE = {
  uk: 'Тип профілактики обирають за ризиком тромбозу й кровотечі; при тромбоцитах нижче 50 ×10⁹/л і ризику кровотечі вирішує лікар. Додано перемикачем «Супровід за стандартом».',
  en: 'The kind of prophylaxis is chosen by the risk of thrombosis and bleeding; with platelets below 50 ×10⁹/L and a bleeding risk the physician decides. Added by the «Standard support» switch.',
}

/** The thromboprophylaxis row for the drug chosen, for the whole cycle. */
function thromboRow(
  base: Pick<RegimenItem, 'regimen_id' | 'sort_order'>,
  cycle: number[],
  agent: ThromboAgent,
): RegimenItem {
  if (agent === 'apixaban') {
    return row(base, 'thrombosis', {
      drug_id: 'apixaban',
      route: 'oral',
      dose_value: 2.5,
      days: cycle,
      administrations_per_day: 2,
      notes: {
        uk: `Апіксабан 2,5 мг двічі на добу — стандартна тромбопрофілактика протоколів NSSG при леналідоміді (MM.38, MM.56, MM.59); перевірити взаємодії. ${THROMBO_NOTE.uk}`,
        en: `Apixaban 2.5 mg twice a day, the standard thromboprophylaxis of the NSSG protocols with lenalidomide (MM.38, MM.56, MM.59); check for interactions. ${THROMBO_NOTE.en}`,
      },
    })
  }
  if (agent === 'enoxaparin') {
    return row(base, 'thrombosis', {
      drug_id: 'enoxaparin',
      route: 'subcutaneous',
      dose_value: 40,
      days: cycle,
      // A daily injection for weeks belongs with the ward's daily drugs, not the day's infusions.
      block: 'ward',
      notes: {
        uk: `Еноксапарин 40 мг підшкірно раз на добу — профілактична доза низькомолекулярного гепарину в рандомізованих дослідженнях при мієломі (Palumbo 2011, Larocca 2012); NSSG дози гепарину не називає. ${THROMBO_NOTE.uk}`,
        en: `Enoxaparin 40 mg subcutaneously once a day, the prophylactic heparin dose of the randomised myeloma trials (Palumbo 2011, Larocca 2012); NSSG names no heparin dose. ${THROMBO_NOTE.en}`,
      },
    })
  }
  return row(base, 'thrombosis', {
    drug_id: 'acetylsalicylic-acid',
    route: 'oral',
    dose_value: 100,
    days: cycle,
    notes: {
      uk: `Аспірин 100 мг раз на добу — лише без додаткових чинників ризику тромбозу (NSSG); доза — з досліджень Palumbo 2011 і Larocca 2012, NSSG MM.59 дає 75 мг. Також при тромбоцитозі. ${THROMBO_NOTE.uk}`,
      en: `Aspirin 100 mg once a day, only with no other risk factor for thrombosis (NSSG); the dose is that of Palumbo 2011 and Larocca 2012, NSSG MM.59 gives 75 mg. Also for thrombocytosis. ${THROMBO_NOTE.en}`,
    },
  })
}
