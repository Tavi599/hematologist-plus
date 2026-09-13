import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, type Language } from './i18n'

/** Shape of every localized jsonb field in the database; any language may be missing. */
export type LocalizedText = Partial<Record<Language, string | null>>

export interface LocalizedResult {
  text: string
  /** Language the text is actually in; differs from the requested one when a fallback was used. */
  language: Language | null
  isFallback: boolean
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim() !== ''
}

/**
 * Resolves a localized field: the user's language if present,
 * otherwise the default language, otherwise any available language.
 */
export function resolveLocalized(
  field: LocalizedText | null | undefined,
  language: Language,
): LocalizedResult {
  if (!field) return { text: '', language: null, isFallback: false }

  const order: Language[] = [
    language,
    DEFAULT_LANGUAGE,
    ...SUPPORTED_LANGUAGES.filter((lng) => lng !== language && lng !== DEFAULT_LANGUAGE),
  ]

  for (const lng of order) {
    const value = field[lng]
    if (hasText(value)) return { text: value, language: lng, isFallback: lng !== language }
  }

  return { text: '', language: null, isFallback: false }
}

export function localize(field: LocalizedText | null | undefined, language: Language): string {
  return resolveLocalized(field, language).text
}
