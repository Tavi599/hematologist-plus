import { act, fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import i18n from '../../lib/i18n'
import { renderWithProviders } from '../../test/render'
import { CalculatorPage } from './CalculatorPage'

const source = vi.hoisted(() => ({ fetchTable: vi.fn() }))
vi.mock('../../lib/catalog-source', () => ({ catalogFetcher: source.fetchTable }))

/** 180 cm × 80 kg → BSA exactly 2.0 m², so the demo regimen gives round doses. */
async function fillPatient() {
  const set = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  await act(async () => {
    set('Вік, років', '60')
    set('Зріст, см', '180')
    set('Вага, кг', '80')
    set('Креатинін', '88.4')
  })
}

/** The disease page links to the calculator with the regimen in the URL. */
const REGIMEN_ROUTE = { route: '/calculator?regimen=r-chop-21' }

describe('CalculatorPage', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('uk'))
    const catalog = demoCatalog()
    source.fetchTable.mockReset()
    source.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])
  })

  it('calculates the regimen once the patient and the regimen are set', async () => {
    renderWithProviders(<CalculatorPage />, REGIMEN_ROUTE)
    expect(await screen.findByRole('combobox', { name: 'Схема' })).toHaveValue(
      'R-CHOP-21 — ДЕМО R-CHOP-21',
    )

    await fillPatient()

    const table = screen.getByRole('table', { name: 'Дози' })
    const rituximab = within(table).getByText('ДЕМО Ритуксимаб').closest('tr')!
    // 375 mg/m² × 2.0 m² = 750 mg; 500 + 3 × 100 mg vials; 250 mL bag keeps 1–4 mg/mL.
    // Both BSA variants are equal here, so the actual and the capped column show the same dose.
    expect(within(rituximab).getAllByText('750 мг')).toHaveLength(2)
    expect(within(rituximab).getByText('1 × 500 мг')).toBeInTheDocument()
    expect(within(rituximab).getByText('3 × 100 мг')).toBeInTheDocument()
    expect(within(rituximab).getByText(/NaCl 0,9% 250 мл/)).toBeInTheDocument()

    // Vincristine 1.4 mg/m² × 2.0 = 2.8 mg, limited by the drug's 2 mg maximum.
    const vincristine = within(table).getByText('ДЕМО Вінкристин').closest('tr')!
    expect(within(vincristine).getAllByText('2 мг')).toHaveLength(2)

    // Cyclophosphamide has no dilution parameters in the demo catalog.
    const cyclophosphamide = within(table).getByText('ДЕМО Циклофосфамід').closest('tr')!
    expect(within(cyclophosphamide).getByText('Немає параметрів розведення')).toBeInTheDocument()

    expect(screen.getByText(/BSA 2 м²/)).toBeInTheDocument()
    expect(screen.getByText(/88,9 мл\/хв/)).toBeInTheDocument()
  })

  it('reduces one drug only when it is marked and lets a drug be switched off', async () => {
    renderWithProviders(<CalculatorPage />, REGIMEN_ROUTE)
    expect(await screen.findByRole('combobox', { name: 'Схема' })).toBeInTheDocument()
    await fillPatient()

    const rituximab = within(screen.getByRole('table', { name: 'Дози' }))
      .getByText('ДЕМО Ритуксимаб')
      .closest('tr')!
    // No percent field until the drug is marked as needing a reduction.
    expect(within(rituximab).queryByLabelText(/^Редукція, %/)).not.toBeInTheDocument()
    await act(async () => {
      fireEvent.click(within(rituximab).getByLabelText('потрібна: ДЕМО Ритуксимаб'))
    })
    await act(async () => {
      fireEvent.change(within(rituximab).getByLabelText('Редукція, %: ДЕМО Ритуксимаб'), {
        target: { value: '25' },
      })
    })
    expect(within(rituximab).getAllByText('563 мг')).toHaveLength(2) // 750 − 25% = 562.5

    await act(async () => {
      fireEvent.click(within(rituximab).getByRole('switch'))
    })
    expect(screen.queryByText(/NaCl 0,9% 250 мл/)).not.toBeInTheDocument()
  })

  it('shows the composition of the regimen before the patient data is entered', async () => {
    renderWithProviders(<CalculatorPage />, REGIMEN_ROUTE)
    expect(await screen.findByRole('combobox', { name: 'Схема' })).toBeInTheDocument()

    const table = within(await screen.findByRole('table', { name: 'Дози' }))
    expect(table.getByText('ДЕМО Ритуксимаб')).toBeInTheDocument()
    // The drugs can be switched off and marked for reduction without any patient data.
    expect(table.getAllByRole('switch').length).toBeGreaterThan(1)
    expect(table.getByLabelText('потрібна: ДЕМО Ритуксимаб')).toBeInTheDocument()
  })

  it('takes a dose typed by hand for one drug', async () => {
    renderWithProviders(<CalculatorPage />, REGIMEN_ROUTE)
    expect(await screen.findByRole('combobox', { name: 'Схема' })).toBeInTheDocument()
    await fillPatient()

    const rituximab = within(screen.getByRole('table', { name: 'Дози' }))
      .getByText('ДЕМО Ритуксимаб')
      .closest('tr')!
    await act(async () => {
      fireEvent.change(within(rituximab).getByLabelText('Доза вручну, мг: ДЕМО Ритуксимаб'), {
        target: { value: '700' },
      })
    })
    expect(within(rituximab).getAllByText('700 мг')).toHaveLength(2)
    expect(within(rituximab).getByText('вручну')).toBeInTheDocument()
  })

  it('shows the calculation chain for a dose', async () => {
    renderWithProviders(<CalculatorPage />, REGIMEN_ROUTE)
    expect(await screen.findByRole('combobox', { name: 'Схема' })).toBeInTheDocument()
    await fillPatient()

    const rituximab = within(screen.getByRole('table', { name: 'Дози' }))
      .getByText('ДЕМО Ритуксимаб')
      .closest('tr')!
    await act(async () => {
      fireEvent.click(within(rituximab).getByRole('button', { name: 'Як порахували' }))
    })
    // The chain sits in the details row right below the drug.
    const details = within(rituximab.nextElementSibling as HTMLElement)
    expect(details.getByText(/BSA за Mosteller: √\(180 см × 80 кг \/ 3600\)/)).toBeInTheDocument()
    expect(details.getByText(/375 мг\/м² × 2 м²/)).toBeInTheDocument()
    expect(details.getByText(/Округлення до 1 мг/)).toBeInTheDocument()
  })

  it('asks for the patient data before calculating', async () => {
    renderWithProviders(<CalculatorPage />)
    expect(
      await screen.findByText('Заповніть зріст, вагу, вік і стать, щоб побачити розрахунок.'),
    ).toBeInTheDocument()
  })
})
