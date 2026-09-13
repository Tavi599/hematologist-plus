import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import enCommon from '../locales/en/common.json'
import ukCommon from '../locales/uk/common.json'

export const SUPPORTED_LANGUAGES = ['uk', 'en'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]
export const DEFAULT_LANGUAGE: Language = 'uk'
export const LANGUAGE_STORAGE_KEY = 'hp.language'

export const resources = {
  uk: { common: ukCommon },
  en: { common: enCommon },
} as const

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS: 'common',
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    // Default is Ukrainian; only an explicit user choice (stored locally) overrides it.
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  })

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

export function currentLanguage(): Language {
  const lng = i18n.resolvedLanguage
  return SUPPORTED_LANGUAGES.includes(lng as Language) ? (lng as Language) : DEFAULT_LANGUAGE
}

export default i18n
