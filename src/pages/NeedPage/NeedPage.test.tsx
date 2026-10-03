import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import i18n from '../../lib/i18n'
import { renderWithProviders } from '../../test/render'
import { NeedPage } from './NeedPage'

const source = vi.hoisted(() => ({ fetchTable: vi.fn() }))
vi.mock('../../lib/catalog-source', () => ({ catalogFetcher: source.fetchTable }))

const saved = vi.hoisted(() => ({ saveFile: vi.fn() }))
vi.mock('../../lib/save-file', () => ({ saveFile: saved.saveFile }))

const pick = async (label: string, option: string) => {
  const combobox = await screen.findByRole('combobox', { name: label })
  await act(async () => fireEvent.click(combobox))
  await act(async () => fireEvent.click(await screen.findByText(option)))
}

const type = async (label: string, value: string) => {
  await act(async () => fireEvent.change(screen.getByLabelText(label), { target: { value } }))
}

describe('NeedPage', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('uk'))
    const catalog = demoCatalog()
    saved.saveFile.mockReset()
    source.fetchTable.mockReset()
    source.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])
  })

  it('counts the need from a course of the regimen the drug is given in', async () => {
    renderWithProviders(<NeedPage />)
    await pick('Препарат', 'ДЕМО Ритуксимаб')

    // The pack of the line is the 100 mg vial, the first the catalog has for rituximab.
    expect(screen.getByRole('combobox', { name: 'Фасування' })).toHaveValue(
      'ДЕМО Ритуксимаб 100 мг',
    )
    // Typed the way Ukrainian writes a fraction: a comma, not a point. Read as 19 m² instead of
    // 1,9 it would ask for fourteen vials rather than four.
    // 375 mg/m² × 1.9 m² = 713 mg: one 500 mg vial and three of 100 mg.
    await type('BSA для підрахунку, м²', '1,9')
    expect(await screen.findByText('1 × 500 мг + 3 × 100 мг')).toBeInTheDocument()

    // Only the pack the line is about is taken; the other strength stays a hint.
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Взяти 3/ })))
    expect(screen.getByLabelText('Упаковок на курс')).toHaveValue('3')
    // R-CHOP-21 is six cycles, and the form asks for the whole planned treatment.
    expect(screen.getByLabelText('Курсів на пацієнта')).toHaveValue('6')

    await type('Пацієнтів', '2')
    expect(screen.getByText('36')).toBeInTheDocument()

    // Both counted graphs stand filled in before anyone touches them: two patients at three packs
    // a course spend six packs a month, and the six courses planned come out as six months.
    expect(screen.getByLabelText('Середньомісячне використання')).toHaveAttribute(
      'placeholder',
      '6',
    )
    expect(screen.getByLabelText('Місяців вистачає')).toHaveAttribute('placeholder', '6')

    // And a figure of the department's own replaces the count.
    await type('Середньомісячне використання', '4')
    expect(screen.getByLabelText('Місяців вистачає')).toHaveAttribute('placeholder', '9')
  })

  it('renames the line when the pack changes, unless the name was written by hand', async () => {
    renderWithProviders(<NeedPage />)
    await pick('Препарат', 'ДЕМО Ритуксимаб')
    expect(screen.getByLabelText('Назва в наказі')).toHaveValue('ДЕМО Ритуксимаб 100 мг')

    await pick('Фасування', 'ДЕМО Ритуксимаб 500 мг')
    expect(screen.getByLabelText('Назва в наказі')).toHaveValue('ДЕМО Ритуксимаб 500 мг')
    // The form has a graph for the unit of measure; a vial is «флак» in it.
    expect(screen.getByText('одиниця виміру: флак')).toBeInTheDocument()

    // The order names a brand, so a name typed by hand stays whatever the pack becomes.
    await act(async () =>
      fireEvent.change(screen.getByLabelText('Назва в наказі'), {
        target: { value: 'Мабтера 500 мг' },
      }),
    )
    await pick('Фасування', 'ДЕМО Ритуксимаб 100 мг')
    expect(screen.getByLabelText('Назва в наказі')).toHaveValue('Мабтера 500 мг')
  })

  it('works out the body surface from a height and a weight, so nothing has to be typed twice', async () => {
    renderWithProviders(<NeedPage />)
    await pick('Препарат', 'ДЕМО Ритуксимаб')

    // 180 cm × 80 kg → √(180 × 80 / 3600) = 2,00 m².
    await type('Зріст, см', '180')
    await type('Вага, кг', '80')
    expect(screen.getByLabelText('BSA для підрахунку, м²')).toHaveValue('2')
    expect(await screen.findByText('1 × 500 мг + 3 × 100 мг')).toBeInTheDocument()
  })

  it('waits for both measurements instead of falling over on a half-typed height', async () => {
    renderWithProviders(<NeedPage />)
    await pick('Препарат', 'ДЕМО Ритуксимаб')

    // A field clamps what is typed into it only when it is left, so a 0 reaches the calculation.
    await type('Зріст, см', '0')
    await type('Вага, кг', '80')
    expect(screen.getByLabelText('BSA для підрахунку, м²')).toHaveValue('')

    await type('Зріст, см', '180')
    expect(screen.getByLabelText('BSA для підрахунку, м²')).toHaveValue('2')
  })

  it('says what the hint cannot count instead of counting it anyway', async () => {
    renderWithProviders(<NeedPage />)
    await pick('Препарат', 'ДЕМО Ритуксимаб')
    expect(await screen.findByText('Введіть BSA, щоб порахувати')).toBeInTheDocument()
  })

  it('names the file after the drug of the form, not after the word "need"', async () => {
    // A folder of «Потреба 2026-10-03» tells nobody which form is which; the drug does.
    renderWithProviders(<NeedPage />)
    await pick('Препарат', 'ДЕМО Ритуксимаб')
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Завантажити .xlsx' })),
    )

    const name = saved.saveFile.mock.calls[0]?.[0] as string
    expect(name).toMatch(/^ДЕМО Ритуксимаб \d{4}-\d{2}-\d{2}\.xlsx$/)
  })
})
