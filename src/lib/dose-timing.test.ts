import { describe, expect, it } from 'vitest'

import { calculateCourse } from '../domain'
import type { RegimenItem } from '../schemas/catalog'
import type { CourseItem } from './course-input'
import {
  applyTimingChoices,
  canChooseTiming,
  clockMinutes,
  defaultTiming,
  disabledWithDayOne,
  inheritedByDayOne,
  type DoseTiming,
  type TimingChoice,
} from './dose-timing'

function ondansetron(): CourseItem {
  const item = {
    id: 'r.ondansetron',
    regimen_id: 'r',
    drug_id: 'ondansetron',
    role: 'supportive',
    route: 'iv_bolus',
    block: 'day_support',
    dose_value: 8,
    dose_unit: 'mg_flat',
    days: [1, 2, 3],
    administrations_per_day: 2,
    interval_min: 480,
    anchor_offset_min: -30,
  } as unknown as RegimenItem
  return {
    item,
    courseDrug: {
      id: item.id,
      dose: { value: 8, unit: 'mg_flat' },
      days: [1, 2, 3],
      administrationsPerDay: 2,
      intervalMin: 480,
      anchorOffsetMin: -30,
      block: 'day_support',
    },
  } as unknown as CourseItem
}

const before: DoseTiming = {
  perDay: 1,
  intervalH: 8,
  mode: 'chemo',
  offsetMin: -30,
  clock: '09:00',
}
const every8: DoseTiming = { perDay: 3, intervalH: 8, mode: 'clock', offsetMin: 0, clock: '09:00' }

describe('canChooseTiming', () => {
  it('is for ondansetron and for support timed from the cytostatic, not for the treatment', () => {
    const base = { drug_id: 'ondansetron', block: 'ward', role: 'supportive' } as const
    expect(canChooseTiming(base)).toBe(true)
    expect(canChooseTiming({ ...base, drug_id: 'metoclopramide', block: 'day_support' })).toBe(true)
    expect(canChooseTiming({ ...base, drug_id: 'metoclopramide' })).toBe(false)
    expect(canChooseTiming({ ...base, role: 'main' })).toBe(false)
    expect(canChooseTiming(base, 'r.ondansetron')).toBe(false)
  })
})

describe('defaultTiming', () => {
  it("reads the regimen's own row", () => {
    expect(defaultTiming(ondansetron().item, '11:00')).toEqual({
      perDay: 2,
      intervalH: 8,
      mode: 'chemo',
      offsetMin: -30,
      clock: '11:00',
    })
  })
})

describe('applyTimingChoices', () => {
  it('leaves a row without a choice alone', () => {
    const items = [ondansetron()]
    expect(applyTimingChoices(items, {})[0]).toBe(items[0])
  })

  it('sets the frequency, the interval and the clock time of all days', () => {
    const [row] = applyTimingChoices([ondansetron()], {
      'r.ondansetron': { rest: every8, firstDay: null },
    })
    expect(row!.item).toMatchObject({ administrations_per_day: 3, interval_min: 480 })
    expect(row!.item.anchor_offset_min).toBeNull()
    expect(row!.courseDrug).toMatchObject({
      administrationsPerDay: 3,
      intervalMin: 480,
      clockStartMin: 540,
    })
    expect(row!.courseDrug.anchorOffsetMin).toBeUndefined()
  })

  it('splits the first day off when it is timed apart: before the chemo, then every 8 hours', () => {
    const choice: TimingChoice = { rest: every8, firstDay: before }
    const rows = applyTimingChoices([ondansetron()], { 'r.ondansetron': choice })
    expect(rows.map((row) => [row.item.id, row.item.days])).toEqual([
      ['r.ondansetron--day1', [1]],
      ['r.ondansetron', [2, 3]],
    ])
    expect(rows[0]!.dayOneOf).toBe('r.ondansetron')
    expect(rows[0]!.courseDrug).toMatchObject({ administrationsPerDay: 1, anchorOffsetMin: -30 })
    expect(rows[1]!.courseDrug).toMatchObject({ administrationsPerDay: 3, clockStartMin: 540 })
  })

  it('does not split a drug given on one day only', () => {
    const one = ondansetron()
    one.item = { ...one.item, days: [1] }
    one.courseDrug = { ...one.courseDrug, days: [1] }
    const rows = applyTimingChoices([one], { 'r.ondansetron': { rest: every8, firstDay: before } })
    expect(rows).toHaveLength(1)
  })

  it('schedules the first day before the cytostatic and the rest at the hours chosen', () => {
    const rows = applyTimingChoices([ondansetron()], {
      'r.ondansetron': { rest: every8, firstDay: before },
    })
    const chemo = {
      id: 'r.chemo',
      dose: { value: 100, unit: 'mg_flat' as const },
      days: [1, 2, 3],
      isMain: true,
      durationMin: 60,
    }
    const course = calculateCourse(
      { ageYears: 50, sex: 'male', heightCm: 180, weightKg: 80, serumCreatinine: 80 },
      [chemo, ...rows.map((row) => row.courseDrug)],
      { startDateIso: '2026-10-05', dayStart: '11:00', cycleNumber: 1 },
    )
    const times = (day: number) =>
      course.days
        .find((entry) => entry.day === day)!
        .administrations.filter((entry) => entry.drugId.startsWith('r.ondansetron'))
        .map((entry) => entry.start)
    expect(times(1)).toEqual(['10:30'])
    expect(times(2)).toEqual(['09:00', '17:00', '01:00'])
  })
})

describe('what the first-day row inherits', () => {
  const rows = applyTimingChoices([ondansetron()], {
    'r.ondansetron': { rest: every8, firstDay: before },
  })

  it('takes the dose and the reduction set for the drug, unless it has its own', () => {
    expect(inheritedByDayOne({ 'r.ondansetron': 4 }, rows)).toEqual({
      'r.ondansetron': 4,
      'r.ondansetron--day1': 4,
    })
    expect(
      inheritedByDayOne({ 'r.ondansetron': 4, 'r.ondansetron--day1': 6 }, rows)[
        'r.ondansetron--day1'
      ],
    ).toBe(6)
  })

  it('is switched off with the drug', () => {
    expect(disabledWithDayOne(['r.ondansetron'], rows)).toEqual([
      'r.ondansetron',
      'r.ondansetron--day1',
    ])
    expect(disabledWithDayOne([], rows)).toEqual([])
  })
})

describe('clockMinutes', () => {
  it('reads HH:MM and nothing else', () => {
    expect(clockMinutes('09:30')).toBe(570)
    expect(clockMinutes('9:05')).toBe(545)
    expect(clockMinutes('24:00')).toBeNull()
    expect(clockMinutes('')).toBeNull()
  })
})
