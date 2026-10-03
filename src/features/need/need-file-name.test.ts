import { describe, expect, it } from 'vitest'

import { drugKeyword, needFileName } from './need-file-name'

const words = { fallback: 'Потреба', more: 'та інші' }

describe('drugKeyword', () => {
  it('drops the strength and keeps the name', () => {
    expect(drugKeyword('Ритуксимаб 500 мг')).toBe('Ритуксимаб')
  })

  it('keeps the brand, because that is what the order names', () => {
    expect(drugKeyword('Вориконазол Аккорд 200 мг')).toBe('Вориконазол Аккорд')
  })

  it('takes the whole name when no strength follows it', () => {
    expect(drugKeyword('Візгем')).toBe('Візгем')
  })

  it('has nothing to take from an empty name', () => {
    expect(drugKeyword('   ')).toBe('')
  })
})

describe('needFileName', () => {
  it('names the file after the drug of the form', () => {
    expect(needFileName(['Ритуксимаб 500 мг'], '2026-10-03', words)).toBe('Ритуксимаб 2026-10-03')
  })

  it('names every drug the form holds, each one once', () => {
    expect(
      needFileName(
        ['Ритуксимаб 500 мг', 'Ритуксимаб 100 мг', 'Бендамустин 100 мг'],
        '2026-10-03',
        words,
      ),
    ).toBe('Ритуксимаб, Бендамустин 2026-10-03')
  })

  it('stops naming drugs before the name stops being readable', () => {
    expect(needFileName(['А 1 мг', 'Б 1 мг', 'В 1 мг', 'Г 1 мг'], '2026-10-03', words)).toBe(
      'А, Б, В та інші 2026-10-03',
    )
  })

  it('falls back to the word the form is called when no drug is named yet', () => {
    expect(needFileName([], '2026-10-03', words)).toBe('Потреба 2026-10-03')
  })

  it('drops what Windows will not have in a file name', () => {
    // A slash in a drug name would otherwise turn the file into a folder that does not exist.
    expect(needFileName(['Амоксицилін/клавуланат 1 г'], '2026-10-03', words)).toBe(
      'Амоксицилін клавуланат 2026-10-03',
    )
  })
})
