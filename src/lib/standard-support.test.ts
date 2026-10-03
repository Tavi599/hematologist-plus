import { describe, expect, it } from 'vitest'

import type { RegimenItem } from '../schemas/catalog'
import type { CatalogIndex } from './catalog-index'
import type { CourseItem } from './course-input'
import {
  categoryItemIds,
  isStandardSupportId,
  NO_SUPPORT,
  standardSupportRows,
  supportCategoryOf,
} from './standard-support'

const catalog = (drugIds: string[]) =>
  ({ drugs: new Map(drugIds.map((id) => [id, {}])) }) as unknown as CatalogIndex

const ALL = ['ondansetron', 'aciclovir', 'co-trimoxazole', 'fluconazole']

function entry(
  id: string,
  drug: string,
  role: RegimenItem['role'],
  route: RegimenItem['route'],
  days: number[],
): CourseItem {
  return {
    item: { id, regimen_id: 'r', drug_id: drug, role, route, days } as RegimenItem,
  } as CourseItem
}

const chemo = [
  entry('r.rituximab', 'rituximab', 'main', 'iv_infusion', [1]),
  entry('r.vincristine', 'vincristine', 'main', 'iv_infusion', [1, 8]),
  entry('r.prednisolone', 'prednisolone', 'main', 'oral', [1, 2, 3, 4, 5]),
]
const ON = { antiemetic: true, antiviral: true, pneumocystis: true, antifungal: true }

describe('supportCategoryOf', () => {
  it('names the kind of a supportive row and nothing for a drug that treats', () => {
    expect(supportCategoryOf(entry('a', 'ondansetron', 'premedication', 'oral', [1]).item)).toBe(
      'antiemetic',
    )
    expect(supportCategoryOf(entry('a', 'aciclovir', 'supportive', 'oral', [1]).item)).toBe(
      'antiviral',
    )
    expect(supportCategoryOf(entry('a', 'co-trimoxazole', 'supportive', 'oral', [1]).item)).toBe(
      'pneumocystis',
    )
    expect(supportCategoryOf(entry('a', 'fluconazole', 'supportive', 'oral', [1]).item)).toBe(
      'antifungal',
    )
    // The same drug as part of the treatment is not support.
    expect(supportCategoryOf(entry('a', 'fluconazole', 'main', 'oral', [1]).item)).toBeNull()
    expect(supportCategoryOf(entry('a', 'rituximab', 'supportive', 'oral', [1]).item)).toBeNull()
  })

  it("finds the regimen's own rows of a kind, leaving the standard ones out", () => {
    const items = [
      ...chemo,
      entry('r.aciclovir', 'aciclovir', 'supportive', 'oral', [1]),
      entry('standard-support.antiviral', 'aciclovir', 'supportive', 'oral', [1]),
    ]
    expect(categoryItemIds(items, 'antiviral')).toEqual(['r.aciclovir'])
    expect(isStandardSupportId('standard-support.antiviral')).toBe(true)
    expect(isStandardSupportId('r.aciclovir')).toBe(false)
  })
})

describe('standardSupportRows', () => {
  it('adds nothing while every switch is off', () => {
    expect(standardSupportRows(catalog(ALL), chemo, 21, '2026-10-05', NO_SUPPORT)).toEqual([])
  })

  it('gives each kind its standard dose and days', () => {
    const rows = standardSupportRows(catalog(ALL), chemo, 21, '2026-10-05', ON)
    const by = Object.fromEntries(rows.map((row) => [row.id, row]))

    // The whole 21-day cycle for the prophylaxis.
    expect(by['standard-support.antiviral']).toMatchObject({
      drug_id: 'aciclovir',
      dose_value: 400,
      administrations_per_day: 2,
      role: 'supportive',
    })
    expect(by['standard-support.antiviral']!.days).toHaveLength(21)
    expect(by['standard-support.antifungal']).toMatchObject({
      drug_id: 'fluconazole',
      dose_value: 50,
    })
    // Twice a day on the days an infusion is given — not on the days only a tablet is taken.
    expect(by['standard-support.antiemetic']).toMatchObject({
      drug_id: 'ondansetron',
      dose_value: 8,
      administrations_per_day: 2,
      route: 'iv_bolus',
      anchor_offset_min: -30,
      interval_min: 480,
    })
    expect(by['standard-support.antiemetic']!.days).toEqual([1, 8])
  })

  it('puts co-trimoxazole on Monday, Wednesday and Friday of the real calendar', () => {
    // 2026-10-05 is a Monday: days 1, 3, 5 are Mon, Wed, Fri; day 8 is the next Monday.
    const rows = standardSupportRows(catalog(ALL), chemo, 14, '2026-10-05', {
      ...NO_SUPPORT,
      pneumocystis: true,
    })
    expect(rows[0]!.days).toEqual([1, 3, 5, 8, 10, 12])
    // Starting on a Tuesday moves them.
    const tuesday = standardSupportRows(catalog(ALL), chemo, 7, '2026-10-06', {
      ...NO_SUPPORT,
      pneumocystis: true,
    })
    expect(tuesday[0]!.days).toEqual([2, 4, 7])
  })

  it('leaves a kind alone when the regimen already writes it', () => {
    const own = [...chemo, entry('r.aciclovir', 'aciclovir', 'supportive', 'oral', [1, 2, 3])]
    const rows = standardSupportRows(catalog(ALL), own, 21, '2026-10-05', ON)

    expect(rows.map((row) => row.drug_id)).not.toContain('aciclovir')
    expect(rows.map((row) => row.drug_id)).toContain('ondansetron')
  })

  it('skips a drug the catalog does not have, and an antiemetic where nothing is infused', () => {
    expect(
      standardSupportRows(catalog(['ondansetron']), chemo, 21, '2026-10-05', ON).map(
        (row) => row.drug_id,
      ),
    ).toEqual(['ondansetron'])
    const tablets = [entry('r.pred', 'prednisolone', 'main', 'oral', [1, 2, 3])]
    expect(
      standardSupportRows(catalog(ALL), tablets, 21, '2026-10-05', {
        ...NO_SUPPORT,
        antiemetic: true,
      }),
    ).toEqual([])
  })

  it('runs to the last day of the regimen when it states no cycle length', () => {
    const rows = standardSupportRows(catalog(ALL), chemo, null, '2026-10-05', {
      ...NO_SUPPORT,
      antiviral: true,
    })
    expect(rows[0]!.days).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })
})
