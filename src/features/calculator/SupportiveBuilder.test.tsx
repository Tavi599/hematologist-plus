import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { renderWithProviders } from '../../test/render'

import type { ManualRow } from './manual-rows'
import { SupportiveBuilder } from './SupportiveBuilder'

function setup() {
  const onAdd = vi.fn<(row: ManualRow) => void>()
  renderWithProviders(<SupportiveBuilder onAdd={onAdd} />)
  return { onAdd }
}

describe('SupportiveBuilder', () => {
  it('adds the standard litre of saline with potassium and magnesium', async () => {
    const { onAdd } = setup()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Додати розчин' })))

    expect(onAdd).toHaveBeenCalledOnce()
    expect(onAdd.mock.calls[0]![0].what).toBe('NaCl 0,9% 1000 мл + KCl 4% 40 мл + MgSO4 25% 4 мл')
  })

  it('leaves out the potassium that is switched off', async () => {
    const { onAdd } = setup()
    await act(async () => fireEvent.click(screen.getByRole('switch', { name: 'KCl 4%' })))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Додати розчин' })))

    expect(onAdd.mock.calls[0]![0].what).toBe('NaCl 0,9% 1000 мл + MgSO4 25% 4 мл')
  })

  it('carries the additives in proportion to a 3000 mL bag', async () => {
    const { onAdd } = setup()
    await act(async () => fireEvent.click(screen.getByRole('combobox', { name: "Об'єм" })))
    await act(async () => fireEvent.click(await screen.findByText('3000 мл')))
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Додати розчин' })))

    expect(onAdd.mock.calls[0]![0].what).toBe('NaCl 0,9% 3000 мл + KCl 4% 120 мл + MgSO4 25% 12 мл')
  })

  it('fills nothing in for a small bag, and wants an amount once an additive is on', async () => {
    const { onAdd } = setup()
    await act(async () => fireEvent.click(screen.getByRole('combobox', { name: "Об'єм" })))
    await act(async () => fireEvent.click(await screen.findByText('250 мл')))

    const add = screen.getByRole('button', { name: 'Додати розчин' })
    await act(async () => fireEvent.click(add))
    expect(onAdd.mock.calls[0]![0].what).toBe('NaCl 0,9% 250 мл')

    await act(async () => fireEvent.click(screen.getByRole('switch', { name: 'MgSO4 25%' })))
    expect(add).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox', { name: /MgSO4 25%, мл/ }), {
      target: { value: '2' },
    })
    expect(add).toBeEnabled()
    await act(async () => fireEvent.click(add))
    expect(onAdd.mock.calls[1]![0].what).toBe('NaCl 0,9% 250 мл + MgSO4 25% 2 мл')
  })

  it('adds the antiemetic and the proton-pump inhibitor', async () => {
    const { onAdd } = setup()
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Додати ондансетрон' })),
    )
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Додати омепразол' })))

    expect(onAdd.mock.calls.map(([row]) => row.what)).toEqual([
      'Ондансетрон 8 мг',
      'Омепразол 40 мг у 40 мл NaCl 0,9%',
    ])
  })
})
