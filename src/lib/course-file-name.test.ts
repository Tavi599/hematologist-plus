import { describe, expect, it } from 'vitest'

import {
  courseFileTarget,
  formatDayMonthYear,
  sanitizeName,
  uniqueFileName,
} from './course-file-name'

const fallback = (date: string) => `Курс ${date}`
const day = new Date(2026, 9, 17, 14, 30)

describe('sanitizeName', () => {
  it('keeps a Ukrainian name as it is typed, apostrophe and all', () => {
    expect(sanitizeName("  Мар'яненко  Ольга   Іванівна ")).toBe("Мар'яненко Ольга Іванівна")
  })

  it('turns characters Windows forbids into spaces', () => {
    expect(sanitizeName('Іваненко/І.І.: "тест" <a>|b*?\\c')).toBe('Іваненко І.І. тест a b c')
    expect(sanitizeName('Ім\u0007я\tПрізвище')).toBe('Ім я Прізвище')
  })

  it('drops the trailing dots and spaces Windows would drop silently', () => {
    expect(sanitizeName('Іваненко І. І. ')).toBe('Іваненко І. І')
    expect(sanitizeName('...')).toBe('')
    expect(sanitizeName(' :*? ')).toBe('')
  })

  it('keeps a reserved device name from being one', () => {
    expect(sanitizeName('con')).toBe('con_')
    expect(sanitizeName('LPT1')).toBe('LPT1_')
    expect(sanitizeName('Conrad')).toBe('Conrad')
  })

  it('cuts an overlong name', () => {
    expect(sanitizeName('а'.repeat(300))).toHaveLength(100)
  })
})

describe('formatDayMonthYear', () => {
  it('writes the date as the department does', () => {
    expect(formatDayMonthYear(day)).toBe('17.10.2026')
    expect(formatDayMonthYear(new Date(2027, 0, 5))).toBe('05.01.2027')
  })
})

describe('courseFileTarget', () => {
  it("puts the course into the patient's subfolder, named by name and date", () => {
    expect(courseFileTarget('Іваненко Іван Іванович', day, fallback)).toEqual({
      folder: 'Іваненко Іван Іванович',
      base: 'Іваненко Іван Іванович 17.10.2026',
    })
  })

  it('uses the cleaned name for both folder and file', () => {
    expect(courseFileTarget('Петренко П.П.', day, fallback)).toEqual({
      folder: 'Петренко П.П',
      base: 'Петренко П.П 17.10.2026',
    })
  })

  it('saves into the folder itself when no name is filled in', () => {
    expect(courseFileTarget('', day, fallback)).toEqual({ folder: null, base: 'Курс 17.10.2026' })
    expect(courseFileTarget('  ?? ', day, fallback)).toEqual({
      folder: null,
      base: 'Курс 17.10.2026',
    })
  })
})

describe('uniqueFileName', () => {
  it('takes the plain name when it is free', () => {
    expect(uniqueFileName('Курс 17.10.2026', 'xlsx', ['Курс 17.10.2026.json'])).toBe(
      'Курс 17.10.2026.xlsx',
    )
  })

  it('numbers a second and a third file instead of overwriting', () => {
    expect(uniqueFileName('А 17.10.2026', 'xlsx', ['А 17.10.2026.xlsx'])).toBe(
      'А 17.10.2026 (2).xlsx',
    )
    expect(
      uniqueFileName('А 17.10.2026', 'xlsx', ['а 17.10.2026.XLSX', 'А 17.10.2026 (2).xlsx']),
    ).toBe('А 17.10.2026 (3).xlsx')
  })
})
