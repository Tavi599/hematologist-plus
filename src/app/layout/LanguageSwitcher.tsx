import { SegmentedControl } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { SUPPORTED_LANGUAGES, currentLanguage, type Language } from '../../lib/i18n'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()

  return (
    <SegmentedControl<Language>
      size="xs"
      aria-label={t('language.label')}
      value={currentLanguage()}
      onChange={(lng) => void i18n.changeLanguage(lng)}
      data={SUPPORTED_LANGUAGES.map((lng) => ({ value: lng, label: t(`language.${lng}`) }))}
    />
  )
}
