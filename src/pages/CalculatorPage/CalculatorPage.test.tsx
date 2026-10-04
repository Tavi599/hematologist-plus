import { act, fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import i18n from '../../lib/i18n'
import { renderWithProviders } from '../../test/render'
import { CalculatorPage } from './CalculatorPage'

const fetch = vi.hoisted(() => ({ fetchTable: vi.fn() }))
vi.mock('../../lib/catalog-source', () => ({ catalogFetcher: fetch.fetchTable }))

/** 180 cm × 80 kg → BSA exactly 2.0 m², so the demo regimen gives round doses. */
async function fillPatient() {
  const set = (label: string, value: string) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  await act(async () => {
    set('Вік, років', '60')
    set('Зріст, см', '180')
    set('Вага, кг', '80')
    set('Креатинін', '88,4')
  })
}

/** The disease page links to the calculator with the regimen in the URL. */
const REGIMEN_ROUTE = { route: '/calculator?regimen=r-chop-21' }

describe('CalculatorPage', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('uk'))
    const catalog = demoCatalog()
    fetch.fetchTable.mockReset()
    fetch.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])
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
    // Both BSA variants are equal here, so only the one dose is shown, with no second variant.
    expect(within(rituximab).getByText('750 мг')).toBeInTheDocument()
    expect(within(rituximab).queryByText(/^за BSA 2,0/)).not.toBeInTheDocument()
    expect(within(rituximab).getByText('1 × 500 мг')).toBeInTheDocument()
    expect(within(rituximab).getByText('3 × 100 мг')).toBeInTheDocument()
    expect(within(rituximab).getByText(/NaCl 0,9% 250 мл/)).toBeInTheDocument()

    // Vincristine 1.4 mg/m² × 2.0 = 2.8 mg, limited by the drug's 2 mg maximum.
    const vincristine = within(table).getByText('ДЕМО Вінкристин').closest('tr')!
    expect(within(vincristine).getByText('2 мг')).toBeInTheDocument()

    // Cyclophosphamide has no dilution parameters in the demo catalog.
    const cyclophosphamide = within(table).getByText('ДЕМО Циклофосфамід').closest('tr')!
    expect(within(cyclophosphamide).getByText('Немає параметрів розведення')).toBeInTheDocument()

    expect(screen.getByText(/BSA 2 м²/)).toBeInTheDocument()
    expect(screen.getByText(/88,9 мл\/хв/)).toBeInTheDocument()
  })

  it('shows the dose on the chosen BSA and the other variant under it when they differ', async () => {
    renderWithProviders(<CalculatorPage />, REGIMEN_ROUTE)
    expect(await screen.findByRole('combobox', { name: 'Схема' })).toBeInTheDocument()
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Вік, років'), { target: { value: '60' } })
      fireEvent.change(screen.getByLabelText('Зріст, см'), { target: { value: '190' } })
      fireEvent.change(screen.getByLabelText('Вага, кг'), { target: { value: '110' } })
    })
    // √(190 × 110 / 3600) = 2.41 m²: 375 × 2.41 = 904 mg on the actual BSA, 750 mg on 2.0.
    const rituximab = within(screen.getByRole('table', { name: 'Дози' }))
      .getByText('ДЕМО Ритуксимаб')
      .closest('tr')!
    expect(within(rituximab).getByText('за BSA 2,0: 750 мг')).toBeInTheDocument()
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
    expect(within(rituximab).getByText('563 мг')).toBeInTheDocument() // 750 − 25% = 562.5

    await act(async () => {
      fireEvent.click(within(rituximab).getByRole('switch'))
    })
    expect(screen.queryByText(/NaCl 0,9% 250 мл/)).not.toBeInTheDocument()
  })

  it('switches a dose modifier on and off and takes the lowest dose of those ticked', async () => {
    const catalog = demoCatalog()
    const source = { name: 'ДЕМО: інструкція', checkedOn: '2026-09-19' }
    catalog.regimen_items.find((row) => row.id === 'r-chop-21.cyclophosphamide')!.dose_modifiers = [
      {
        key: 'azole',
        label: { uk: 'Азол за протоколом' },
        dose_value: 500,
        cap_amount: null,
        notes: null,
        default_on: true,
        source,
      },
      {
        key: 'renal',
        label: { uk: 'Ниркова недостатність' },
        dose_value: 250,
        cap_amount: null,
        notes: null,
        default_on: false,
        source,
      },
    ]
    fetch.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])

    renderWithProviders(<CalculatorPage />, REGIMEN_ROUTE)
    await screen.findByRole('combobox', { name: 'Схема' })
    await fillPatient()

    const table = screen.getByRole('table', { name: 'Дози' })
    const row = within(table).getByText('ДЕМО Циклофосфамід').closest('tr')!
    // A modifier keeps the item's unit, so this is 500 mg/m² × 2.0 m² against the regimen's 750.
    expect(within(row).getByText('1 000 мг')).toBeInTheDocument()

    const azole = within(row).getByRole('checkbox', { name: /Азол за протоколом/ })
    await act(async () => fireEvent.click(azole))
    expect(within(row).getByText('1 500 мг')).toBeInTheDocument()

    // Two circumstances at once: the lower of the two doses is the one that is given.
    await act(async () => fireEvent.click(azole))
    await act(async () =>
      fireEvent.click(within(row).getByRole('checkbox', { name: /Ниркова недостатність/ })),
    )
    expect(within(row).getByText('500 мг')).toBeInTheDocument()
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
      fireEvent.change(within(rituximab).getByLabelText('Доза вручну: ДЕМО Ритуксимаб'), {
        target: { value: '700' },
      })
    })
    expect(within(rituximab).getByText('700 мг')).toBeInTheDocument()
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

  it('narrows the regimen list by disease and by what can be obtained', async () => {
    const catalog = demoCatalog()
    catalog.drugs.find((drug) => drug.id === 'rituximab')!.availability = 'unavailable'
    fetch.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])
    renderWithProviders(<CalculatorPage />)

    const regimen = await screen.findByRole('combobox', { name: 'Схема' })
    await act(async () => fireEvent.click(regimen))
    expect(await screen.findByText('R-CHOP-21 — ДЕМО R-CHOP-21')).toBeInTheDocument()
    expect(screen.getByText('недоступний')).toBeInTheDocument()

    // The regimen is kept unless the physician asks for obtainable ones only.
    await act(async () =>
      fireEvent.click(screen.getByLabelText('Лише схеми з доступних препаратів')),
    )
    await act(async () => fireEvent.click(regimen))
    expect(screen.queryByText('R-CHOP-21 — ДЕМО R-CHOP-21')).not.toBeInTheDocument()
  })

  it('says in the dose table which drug cannot be obtained, and why', async () => {
    const catalog = demoCatalog()
    const rituximab = catalog.drugs.find((drug) => drug.id === 'rituximab')!
    rituximab.availability = 'unavailable'
    rituximab.notes = { uk: 'Не зареєстрований в Україні.', en: 'Not registered in Ukraine.' }
    fetch.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])
    renderWithProviders(<CalculatorPage />, REGIMEN_ROUTE)
    expect(await screen.findByRole('combobox', { name: 'Схема' })).toBeInTheDocument()

    // The badge in the regimen list names no drug; the row has to, or the physician cannot tell
    // which of the four drugs in the course is the one that has to be found elsewhere.
    const row = within(await screen.findByRole('table', { name: 'Дози' }))
      .getByText('ДЕМО Ритуксимаб')
      .closest('tr')!
    expect(within(row).getByText(/недоступний\. Не зареєстрований в Україні\./)).toBeInTheDocument()
  })

  it('makes a printable sheet out of lines written by hand, with no regimen at all', async () => {
    renderWithProviders(<CalculatorPage />)
    await screen.findByRole('combobox', { name: 'Схема' })

    // Nothing is calculated and nothing is on paper yet, so there is nothing to download.
    expect(screen.queryByRole('button', { name: 'Завантажити .xlsx' })).not.toBeInTheDocument()

    // Hand-written lines sit in a folded section of the schedule tab; the physician opens it.
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'Графік введень' })))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Рядки від руки/ })))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Додати рядок' })))
    await act(async () =>
      fireEvent.change(screen.getByLabelText('Призначення'), {
        target: { value: 'Sol. NaCl 0,9% — 400,0 в/в крапельно' },
      }),
    )

    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'Друк і шапка' })))
    expect(screen.getByRole('button', { name: 'Завантажити .xlsx' })).toBeInTheDocument()

    // And the line is on the schedule for its day, at the hour it was written for, so the sheet
    // can be read before it is printed.
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'Графік введень' })))
    const day = screen.getByRole('table', { name: 'День 1' })
    expect(within(day).getByText('Sol. NaCl 0,9% — 400,0 в/в крапельно')).toBeInTheDocument()
  })

  it('opens a regimen with the cytostatics on and the supportive therapy off', async () => {
    const catalog = demoCatalog()
    catalog.regimen_items.find((row) => row.id === 'r-chop-21.prednisolone')!.role = 'supportive'
    fetch.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])
    renderWithProviders(<CalculatorPage />, REGIMEN_ROUTE)
    await screen.findByRole('combobox', { name: 'Схема' })
    await fillPatient()

    // What a patient actually gets of the supportive therapy is decided at the bedside.
    expect(screen.getByLabelText('Препарат у курсі: ДЕМО Преднізолон')).not.toBeChecked()
    expect(screen.getByLabelText('Препарат у курсі: ДЕМО Ритуксимаб')).toBeChecked()
    // Switched off means out of the course, not merely unticked: nothing to order for it, and
    // no line for it on the sheet.
    await act(async () => fireEvent.click(screen.getByRole('tab', { name: 'Флакони / потреба' })))
    const supply = screen.getByRole('table', { name: 'Потреба на курс' })
    expect(within(supply).queryByText(/Преднізолон/)).not.toBeInTheDocument()
    expect(within(supply).getAllByText(/Ритуксимаб/).length).toBeGreaterThan(0)
  })

  it('asks for the measurements before calculating', async () => {
    renderWithProviders(<CalculatorPage />)
    expect(
      await screen.findByText(
        'Заповніть зріст і вагу — або введіть BSA вручну, щоб побачити розрахунок.',
      ),
    ).toBeInTheDocument()
  })

  it('calculates on a BSA entered by hand, with no height and no weight', async () => {
    renderWithProviders(<CalculatorPage />, REGIMEN_ROUTE)
    const source = await screen.findByRole('combobox', { name: 'Дози за BSA' })

    await act(async () => fireEvent.click(source))
    await act(async () => fireEvent.click(await screen.findByText('введена вручну')))
    await act(async () =>
      fireEvent.change(screen.getByLabelText('BSA, м²'), { target: { value: '1,75' } }),
    )

    // 375 mg/m² × 1.75 m² = 656.25 → 656 mg, from the typed BSA alone.
    const table = screen.getByRole('table', { name: 'Дози' })
    const rituximab = within(table).getByText('ДЕМО Ритуксимаб').closest('tr')!
    expect(within(rituximab).getByText('656 мг')).toBeInTheDocument()
    expect(screen.getByLabelText('Зріст, см')).toHaveValue('')
    expect(screen.getByLabelText('Вага, кг')).toHaveValue('')
  })

  it('adds the standard antiviral row when its switch is turned on, and takes it away again', async () => {
    const rows = demoCatalog()
    rows.drugs.push({
      ...rows.drugs.find((drug) => drug.id === 'prednisolone')!,
      id: 'aciclovir',
      name: { uk: 'ДЕМО Ацикловір' },
    })
    fetch.fetchTable.mockImplementation(async (table: keyof typeof rows) => rows[table])
    renderWithProviders(<CalculatorPage />, REGIMEN_ROUTE)
    expect(await screen.findByRole('combobox', { name: 'Схема' })).toBeInTheDocument()
    await fillPatient()

    const table = () => screen.getByRole('table', { name: 'Дози' })
    expect(within(table()).queryByText('ДЕМО Ацикловір')).not.toBeInTheDocument()

    const antiviral = screen
      .getByText('Противірусна профілактика')
      .closest('.mantine-Switch-root')!
      .querySelector('input')!
    await act(async () => fireEvent.click(antiviral))
    expect(within(table()).getByText('ДЕМО Ацикловір')).toBeInTheDocument()

    await act(async () => fireEvent.click(antiviral))
    expect(within(table()).queryByText('ДЕМО Ацикловір')).not.toBeInTheDocument()
  })
})
