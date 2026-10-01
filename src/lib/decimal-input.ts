import type { KeyboardEvent } from 'react'

import { currentLanguage, type Language } from './i18n'

/**
 * A number field that takes a fraction, in the separator the physician actually types.
 *
 * Ukrainian writes 1,9 and the whole interface prints 1,9 — but a field that knows only the
 * point reads the comma as nothing at all and turns 1,9 into 19. For a body surface or a
 * creatinine that is not a typo the reader notices; it is a tenfold dose.
 *
 * So the field takes the separator of the language, and the other one is translated into it as
 * it is typed: a point on the numeric keypad means the same thing the comma does, and must never
 * fall out and multiply the number by ten.
 */
export function decimalInput(language: Language = currentLanguage()): {
  decimalSeparator: string
  allowedDecimalSeparators: string[]
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
} {
  const separator = language === 'uk' ? ',' : '.'
  const other = separator === ',' ? '.' : ','
  return {
    decimalSeparator: separator,
    // Mantine itself uses this list when text is pasted; typing is handled below.
    allowedDecimalSeparators: [',', '.'],
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== other) return
      event.preventDefault()
      insert(event.currentTarget, separator)
    },
  }
}

/**
 * Writes into the field the way the browser would have, so that the value React holds is the one
 * on screen: the native setter followed by the event React listens for.
 */
function insert(input: HTMLInputElement, text: string): void {
  const start = input.selectionStart ?? input.value.length
  const end = input.selectionEnd ?? start
  const next = input.value.slice(0, start) + text + input.value.slice(end)
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, next)
  // React's onChange for a text field is the native input event, so that is the one to raise.
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
