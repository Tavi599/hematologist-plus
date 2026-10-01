import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import i18n from '../../lib/i18n'
import { renderWithProviders } from '../../test/render'
import { NeedPage } from './NeedPage'

const source = vi.hoisted(() => ({ fetchTable: vi.fn() }))
vi.mock('../../lib/catalog-source', () => ({ catalogFetcher: source.fetchTable }))

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
    // 375 mg/m² × 2.0 m² = 750 mg: one 500 mg vial and three of 100 mg.
    await type('BSA для підрахунку, м²', '2')
    expect(await screen.findByText('1 × 500 мг + 3 × 100 мг')).toBeInTheDocument()

    // Only the pack the line is about is taken; the other strength stays a hint.
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Взяти 3/ })))
    expect(screen.getByLabelText('Упаковок на курс')).toHaveValue('3')
    // R-CHOP-21 is six cycles, and the form asks for the whole planned treatment.
    expect(screen.getByLabelText('Курсів на пацієнта')).toHaveValue('6')

    await type('Пацієнтів', '2')
    expect(screen.getByText('36')).toBeInTheDocument()
    await type('Середньомісячне використання', '4')
    expect(screen.getByText('9')).toBeInTheDocument()
  })

  it('says what the hint cannot count instead of counting it anyway', async () => {
    renderWithProviders(<NeedPage />)
    await pick('Препарат', 'ДЕМО Ритуксимаб')
    expect(await screen.findByText('Введіть BSA, щоб порахувати')).toBeInTheDocument()
  })
})
