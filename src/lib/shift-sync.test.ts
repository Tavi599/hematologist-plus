import { describe, expect, it } from 'vitest'

import { calculateCourse } from '../domain'
import type { CourseItem } from './course-input'
import {
  daysOfDrugs,
  effectiveShifts,
  isSynced,
  NO_SHIFT_SYNC,
  previousDayOf,
  type ShiftSync,
} from './shift-sync'

const row = (id: string, days: number[]) => ({ item: { id, days } }) as unknown as CourseItem
const days = daysOfDrugs([row('etoposide', [1, 2, 3]), row('rituximab', [1, 8])])

const sync = (partial: Partial<ShiftSync>): ShiftSync => ({ ...NO_SHIFT_SYNC, ...partial })

describe('previousDayOf', () => {
  it('is the nearest earlier day the drug is given, and none on its first day', () => {
    expect(previousDayOf(days, 'etoposide', 1)).toBeNull()
    expect(previousDayOf(days, 'etoposide', 3)).toBe(2)
    expect(previousDayOf(days, 'rituximab', 8)).toBe(1)
  })
})

describe('effectiveShifts', () => {
  it('is empty while nothing was typed', () => {
    expect(effectiveShifts(days, NO_SHIFT_SYNC)).toEqual({})
  })

  it('carries a shift typed on one day to the days after it, and not to the days before', () => {
    const shifts = effectiveShifts(days, sync({ explicit: { etoposide: { 2: 60 } } }))
    expect(shifts.etoposide).toEqual({ 1: 0, 2: 60, 3: 60 })
    // The drug given a week later follows the first day, whatever lies between.
    expect(effectiveShifts(days, sync({ explicit: { rituximab: { 1: 30 } } })).rituximab).toEqual({
      1: 30,
      8: 30,
    })
  })

  it('stops following the previous day on a day that is set free, and the days after follow that day', () => {
    const typed = { explicit: { etoposide: { 1: 60 } } }
    expect(effectiveShifts(days, sync({ ...typed, offDays: [2] })).etoposide).toEqual({
      1: 60,
      2: 0,
      3: 0,
    })
    expect(
      effectiveShifts(days, sync({ ...typed, offDrugDays: { etoposide: [3] } })).etoposide,
    ).toEqual({
      1: 60,
      2: 60,
      3: 0,
    })
    // A drug set free on a day another drug is not: only that one is.
    expect(
      effectiveShifts(
        days,
        sync({ explicit: { rituximab: { 1: 30 } }, offDrugDays: { etoposide: [2] } }),
      ).rituximab,
    ).toEqual({ 1: 30, 8: 30 })
  })

  it('takes the time typed for a day over the previous one, whether the day follows it or not', () => {
    const typed = { etoposide: { 1: 60, 3: -15 } }
    expect(effectiveShifts(days, sync({ explicit: typed })).etoposide).toEqual({
      1: 60,
      2: 60,
      3: -15,
    })
    expect(effectiveShifts(days, sync({ explicit: typed, offDays: [3] })).etoposide).toEqual({
      1: 60,
      2: 60,
      3: -15,
    })
  })
})

describe('isSynced', () => {
  it('is on unless the day or the drug on that day is switched off', () => {
    expect(isSynced(NO_SHIFT_SYNC, 'etoposide', 2)).toBe(true)
    expect(isSynced(sync({ offDays: [2] }), 'etoposide', 2)).toBe(false)
    expect(isSynced(sync({ offDrugDays: { etoposide: [2] } }), 'etoposide', 2)).toBe(false)
    expect(isSynced(sync({ offDrugDays: { etoposide: [2] } }), 'rituximab', 2)).toBe(true)
  })
})

describe('the course schedule with a shift for each day', () => {
  it('moves a drug on the days it was shifted on', () => {
    const drug = {
      id: 'etoposide',
      dose: { value: 100, unit: 'mg_flat' as const },
      days: [1, 2],
      isMain: true,
      durationMin: 60,
    }
    const course = calculateCourse(
      { ageYears: 50, sex: 'male', heightCm: 180, weightKg: 80, serumCreatinine: 80 },
      [drug],
      {
        startDateIso: '2026-10-05',
        dayStart: '11:00',
        cycleNumber: 1,
        shiftMinByDay: { etoposide: { 1: 0, 2: 90 } },
      },
    )
    const start = (day: number) =>
      course.days.find((entry) => entry.day === day)!.administrations[0]!.start
    expect(start(1)).toBe('11:00')
    expect(start(2)).toBe('12:30')
  })
})
