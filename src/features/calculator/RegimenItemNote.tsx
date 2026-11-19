import { Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { currentLanguage } from '../../lib/i18n'
import { localize, type LocalizedText } from '../../lib/localized'

/**
 * The regimen's own note on one of its drugs — a test dose, light protection, a ramp-up week,
 * what to avoid alongside it. It is part of the protocol, so it stands in full under the drug's
 * name rather than folded away; a note with no text in any language shows nothing.
 */
export function RegimenItemNote({ notes }: { notes: LocalizedText | null }) {
  const { t } = useTranslation()
  const text = localize(notes, currentLanguage())
  if (text === '') return null
  return (
    <Text size="xs" c="dimmed" mt={2}>
      <Text span size="xs" fw={600}>
        {t('calculator.doses.itemNote')}:
      </Text>{' '}
      {text}
    </Text>
  )
}
