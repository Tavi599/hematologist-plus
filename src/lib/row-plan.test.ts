import { describe, expect, it } from 'vitest'

import { calculateCourse } from '../domain'
import type { RegimenItem } from '../schemas/catalog'
import type { CourseItem } from './course-input'
import {
  applyPlans,
  clockOfHour,
  defaultWardHours,
  inSheetOrder,
  isFreeRow,
  minutesOfHour,
  nextVariantId,
  overlappingDays,
  variantBase,
  withVariants,
} from './row-plan'

function row(
  id: string,
  overrides: Partial<RegimenItem> = {},
  drug: Partial<CourseItem['courseDrug']> = {},
): CourseItem {
  const item = {
    id,
    regimen_id: 'r',
    drug_id: id.replace(/^r\./, '').replace(/~\d+$/, ''),
    role: 'supportive',
    route: 'iv_bolus',
    block: 'day_support',
    dose_value: 8,
    dose_unit: 'mg_flat',
    days: [1, 2, 3],
    administrations_per_day: 1,
    interval_min: null,
    anchor_offset_min: -30,
    ...overrides,
  } as unknown as RegimenItem
  return {
    item,
    courseDrug: {
      id,
      dose: { value: 8, unit: 'mg_flat' },
      days: item.days,
      administrationsPerDay: item.administrations_per_day,
      block: item.block,
      anchorOffsetMin: -30,
      ...drug,
    },
  } as unknown as CourseItem
}

describe('the hours of the sheet', () => {
  it('runs 9…24 and then the night after, 1…8', () => {
    expect(minutesOfHour(9)).toBe(540)
    expect(minutesOfHour(23)).toBe(1380)
    expect(minutesOfHour(0)).toBe(1440)
    expect(minutesOfHour(7)).toBe(1860)
    expect(inSheetOrder([7, 15, 23])).toEqual([15, 23, 7])
    expect(clockOfHour(0)).toBe('24:00')
    expect(clockOfHour(7)).toBe('07:00')
  })

  it('writes a tablet three times a day at the department hours', () => {
    expect(defaultWardHours(3)).toEqual([7, 15, 23])
    expect(defaultWardHours(2)).toEqual([9, 21])
  })
})

describe('variants', () => {
  it('copies a row right after it, under an id of its own', () => {
    const items = [row('r.ondansetron').item, row('r.dexamethasone').item]
    const id = nextVariantId('r.ondansetron', [])
    expect(id).toBe('r.ondansetron~2')
    expect(nextVariantId('r.ondansetron', [id])).toBe('r.ondansetron~3')
    expect(variantBase(id)).toBe('r.ondansetron')
    expect(withVariants(items, [id]).map((item) => item.id)).toEqual([
      'r.ondansetron',
      'r.ondansetron~2',
      'r.dexamethasone',
    ])
  })

  it('leaves the days and the frequency of a cytostatic to the protocol, not of its copy', () => {
    expect(isFreeRow({ id: 'r.x', role: 'main' }, [])).toBe(false)
    expect(isFreeRow({ id: 'r.x', role: 'supportive' }, [])).toBe(true)
    expect(isFreeRow({ id: 'custom-1', role: 'main' }, ['custom-1'])).toBe(true)
    expect(isFreeRow({ id: 'r.x~2', role: 'main' }, [])).toBe(true)
  })

  it('says on which days two rows of one drug both give it', () => {
    const items = [
      row('r.ondansetron', { days: [1, 2, 3] }),
      row('r.ondansetron~2', { days: [3, 4] }),
    ]
    expect(overlappingDays(items, []).get('r.ondansetron')).toEqual([3])
    expect(overlappingDays(items, ['r.ondansetron~2']).size).toBe(0)
  })
})

describe('applyPlans', () => {
  it('leaves a row with no plan alone', () => {
    const items = [row('r.ondansetron')]
    expect(applyPlans(items, {}, [])[0]).toBe(items[0])
  })

  it('gives a support row as many times a day as hours were marked, at those hours', () => {
    const [planned] = applyPlans(
      [row('r.ondansetron')],
      { 'r.ondansetron': { hours: [7, 15, 23] } },
      [],
    )
    expect(planned!.item.administrations_per_day).toBe(3)
    expect(planned!.courseDrug.startsMin).toEqual([900, 1380, 1860])
  })

  it('puts a cytostatic at an hour as a whole, keeping its frequency', () => {
    const main = row('r.cytarabine', {
      role: 'main',
      block: 'infusion',
      administrations_per_day: 2,
    })
    const [planned] = applyPlans([main], { 'r.cytarabine': { hours: [10, 14] } }, [])
    expect(planned!.item.administrations_per_day).toBe(2)
    expect(planned!.courseDrug.startsMin).toEqual([600])
  })

  it('writes a tablet as a frequency, or at hours when asked', () => {
    const tablet = row('r.aciclovir', { route: 'oral', block: 'ward', administrations_per_day: 2 })
    const [count] = applyPlans([tablet], { 'r.aciclovir': { perDay: 3 } }, [])
    expect(count!.item.administrations_per_day).toBe(3)
    expect(count!.wardHours).toBeUndefined()

    const [hours] = applyPlans(
      [tablet],
      { 'r.aciclovir': { wardMode: 'hours', hours: [21, 9] } },
      [],
    )
    expect(hours!.wardHours).toEqual([9, 21])
    expect(hours!.item.administrations_per_day).toBe(2)
    expect(hours!.courseDrug.startsMin).toBeUndefined()
  })

  it('gives the support on the days typed, and a cytostatic on its own', () => {
    const [support, main] = applyPlans(
      [row('r.ondansetron'), row('r.etoposide', { role: 'main', block: 'infusion' })],
      { 'r.ondansetron': { days: [1, 4] }, 'r.etoposide': { days: [9] } },
      [],
    )
    expect(support!.courseDrug.days).toEqual([1, 4])
    expect(main!.courseDrug.days).toEqual([1, 2, 3])
  })

  it('schedules the hours chosen and moves nothing else', () => {
    const chemo = row(
      'r.etoposide',
      { role: 'main', block: 'infusion' },
      { isMain: true, durationMin: 60, block: 'infusion', anchorOffsetMin: undefined },
    )
    const rows = applyPlans(
      [
        chemo,
        row('r.ondansetron', { days: [1] }, { days: [1] }),
        row('r.metoclopramide', { days: [1] }, { days: [1] }),
      ],
      { 'r.ondansetron': { hours: [9, 17] }, 'r.etoposide': { hours: [13] } },
      [],
    )
    const course = calculateCourse(
      { ageYears: 50, sex: 'male', heightCm: 180, weightKg: 80, serumCreatinine: 80 },
      rows.map((entry) => entry.courseDrug),
      { startDateIso: '2026-10-05', dayStart: '11:00', cycleNumber: 1 },
    )
    const day1 = course.days.find((day) => day.day === 1)!.administrations
    const start = (id: string) =>
      day1.filter((entry) => entry.drugId === id).map((entry) => entry.start)
    expect(start('r.etoposide')).toEqual(['13:00'])
    expect(start('r.ondansetron')).toEqual(['09:00', '17:00'])
    // Timed from the cytostatic, which is where the physician put it.
    expect(start('r.metoclopramide')).toEqual(['12:30'])
  })
})
