import { act, fireEvent, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { demoCatalog } from '../../lib/catalog.fixture'
import { loadFreeSheet, saveFreeSheet, initialFreeSheet } from '../../lib/free-sheet-draft'
import i18n from '../../lib/i18n'
import { renderWithProviders } from '../../test/render'
import { FreeSheetPage } from './FreeSheetPage'

const source = vi.hoisted(() => ({ fetchTable: vi.fn() }))
vi.mock('../../lib/catalog-source', () => ({ catalogFetcher: source.fetchTable }))

const saved = vi.hoisted(() => ({ saveFile: vi.fn() }))
vi.mock('../../lib/save-file', () => ({ saveFile: saved.saveFile }))

const pick = async (label: string, option: string) => {
  const combobox = await screen.findByRole('combobox', { name: label })
  await act(async () => fireEvent.click(combobox))
  await act(async () => fireEvent.click(await screen.findByText(option)))
}

describe('FreeSheetPage', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('uk'))
    window.localStorage.clear()
    const catalog = demoCatalog()
    saved.saveFile.mockReset()
    source.fetchTable.mockReset()
    source.fetchTable.mockImplementation(async (table: keyof typeof catalog) => catalog[table])
  })

  it('makes a sheet from a drug of the catalog, with no regimen and no measurement', async () => {
    renderWithProviders(<FreeSheetPage />)
    expect(
      await screen.findByText(
        'Додайте хоча б один рядок — тоді лист можна буде переглянути й зберегти.',
      ),
    ).toBeInTheDocument()
    // Nothing about the patient is asked but the name the sheet is written for.
    expect(screen.queryByLabelText(/Зріст/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Вага|Маса/)).not.toBeInTheDocument()

    await pick('Препарат з довідника', 'ДЕМО Ритуксимаб')
    expect(screen.getByDisplayValue('ДЕМО Ритуксимаб')).toBeInTheDocument()

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Завантажити .xlsx' })),
    )
    expect(saved.saveFile).toHaveBeenCalledOnce()
  })

  it('brings the sheet back on the next visit', async () => {
    const sheet = {
      ...initialFreeSheet(),
      startDate: '2026-11-27',
      rows: [
        {
          id: 'm1',
          what: 'Sol. NaCl 0,9% — 400,0',
          how: 'в/в крап.',
          days: [1, 2],
          hour: 9,
          block: 'infusion' as const,
        },
      ],
    }
    expect(saveFreeSheet(sheet, false)).toBe(true)
    expect(loadFreeSheet()).toEqual(sheet)

    renderWithProviders(<FreeSheetPage />)
    expect(await screen.findByDisplayValue('Sol. NaCl 0,9% — 400,0')).toBeInTheDocument()
  })

  it('keeps no name on the device without consent, and lets an old sheet go', () => {
    const named = { ...initialFreeSheet(), fullName: 'Петренко Іван', rows: [] }
    saveFreeSheet(named, false)
    expect(loadFreeSheet()?.fullName).toBe('')

    const withRow = {
      ...named,
      rows: [{ id: 'm1', what: 'X', how: '', days: [1], hour: null, block: 'ward' as const }],
    }
    saveFreeSheet(withRow, false)
    expect(loadFreeSheet()?.fullName).toBe('')
    saveFreeSheet(withRow, true)
    expect(loadFreeSheet()?.fullName).toBe('Петренко Іван')
    expect(loadFreeSheet(new Date(Date.now() + 8 * 24 * 60 * 60 * 1000))).toBeNull()
    expect(loadFreeSheet()).toBeNull()
  })
})
