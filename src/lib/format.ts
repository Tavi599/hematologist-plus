import type { Language } from './i18n'

const LOCALES: Record<Language, string> = { uk: 'uk-UA', en: 'en-GB' }

/** Number for display: grouped thousands, at most `decimals` decimals, no trailing zeros. */
export function formatNumber(value: number, language: Language, decimals = 0): string {
  return new Intl.NumberFormat(LOCALES[language], {
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Calendar date for display; `iso` is YYYY-MM-DD. */
export function formatDate(iso: string, language: Language): string {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Intl.DateTimeFormat(LOCALES[language], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}
