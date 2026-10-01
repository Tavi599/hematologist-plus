import { NumberInput } from '@mantine/core'
import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { renderWithProviders } from '../test/render'
import { decimalInput } from './decimal-input'

function render(language: 'uk' | 'en') {
  renderWithProviders(<NumberInput label="BSA" {...decimalInput(language)} decimalScale={2} />)
  return screen.getByLabelText('BSA') as HTMLInputElement
}

describe('decimalInput', () => {
  it('writes the fraction the way the language does', () => {
    const field = render('uk')
    fireEvent.change(field, { target: { value: '1,75' } })
    expect(field.value).toBe('1,75')
  })

  // A point on the numeric keypad means what the comma means. Dropped instead, 1.75 would become
  // 175 — a hundredfold, typed in a field that measures a body.
  it('turns a typed point into the comma rather than losing it', () => {
    const field = render('uk')
    fireEvent.change(field, { target: { value: '1' } })
    fireEvent.keyDown(field, { key: '.' })
    fireEvent.change(field, { target: { value: field.value + '75' } })
    expect(field.value).toBe('1,75')
  })

  it('does the same the other way round in English', () => {
    const field = render('en')
    fireEvent.change(field, { target: { value: '1' } })
    fireEvent.keyDown(field, { key: ',' })
    fireEvent.change(field, { target: { value: field.value + '75' } })
    expect(field.value).toBe('1.75')
  })

  it('leaves every other key to the field itself', () => {
    const field = render('uk')
    fireEvent.change(field, { target: { value: '1,7' } })
    fireEvent.keyDown(field, { key: '5' })
    expect(field.value).toBe('1,7')
  })
})
