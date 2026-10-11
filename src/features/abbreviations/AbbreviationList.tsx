import { Accordion, Table, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { currentLanguage } from '../../lib/i18n'
import { ABBREVIATIONS } from './abbreviations'

/**
 * The English abbreviations of a section spelled out, folded under one heading so the section
 * itself stays short.
 */
export function AbbreviationList({ keys }: { keys: readonly string[] }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const entries = keys.flatMap((key) => {
    const entry = ABBREVIATIONS.get(key)
    return entry ? [entry] : []
  })
  if (entries.length === 0) return null
  return (
    <Accordion variant="contained" chevronPosition="left">
      <Accordion.Item value="abbreviations">
        <Accordion.Control>
          <Text fw={600} size="sm">
            {t('abbreviations.title')}
          </Text>
        </Accordion.Control>
        <Accordion.Panel>
          <Table.ScrollContainer minWidth={420}>
            <Table striped verticalSpacing={4}>
              <Table.Tbody>
                {entries.map((entry) => (
                  <Table.Tr key={entry.short}>
                    <Table.Td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                      <Text size="sm" fw={700}>
                        {entry.short}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{entry.meaning[language]}</Text>
                      <Text size="xs" c="dimmed" fs="italic">
                        {entry.full}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  )
}
