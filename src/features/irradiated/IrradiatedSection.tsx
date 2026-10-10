import { Anchor, Card, List, Stack, Table, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { currentLanguage } from '../../lib/i18n'
import { COMPONENT_NOTES, INDICATIONS, NOT_NEEDED, SOURCE } from './indications'

export const IRRADIATED_ANCHOR = 'irradiated-components'

/** Who needs irradiated blood components and for how long, and who does not. */
export function IrradiatedSection() {
  const { t } = useTranslation()
  const language = currentLanguage()

  return (
    <Card withBorder component="section" id={IRRADIATED_ANCHOR} style={{ scrollMarginTop: 60 }}>
      <Stack gap="sm">
        <Title order={2} size="h3">
          {t('irradiated.title')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('irradiated.lead')}
        </Text>

        <Table.ScrollContainer minWidth={560}>
          <Table striped withTableBorder verticalSpacing={6}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>{t('irradiated.who')}</Table.Th>
                <Table.Th>{t('irradiated.duration')}</Table.Th>
                <Table.Th w={90}>{t('irradiated.grade')}</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {INDICATIONS.flatMap(({ group, items }) => [
                <Table.Tr key={group.en}>
                  <Table.Td colSpan={3}>
                    <Text fw={700} size="sm">
                      {group[language]}
                    </Text>
                  </Table.Td>
                </Table.Tr>,
                ...items.map((item) => (
                  <Table.Tr key={item.who.en}>
                    <Table.Td>
                      <Text size="sm">{item.who[language]}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{item.duration[language]}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                        {item.grade}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                )),
              ])}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        <Stack gap={4}>
          <Text fw={600} size="sm">
            {t('irradiated.notNeeded')}
          </Text>
          <List size="sm" spacing={2}>
            {NOT_NEEDED.map((item) => (
              <List.Item key={item.who.en}>
                {item.who[language]} ({item.grade})
              </List.Item>
            ))}
          </List>
        </Stack>

        <Stack gap={4}>
          <Text fw={600} size="sm">
            {t('irradiated.components')}
          </Text>
          <List size="sm" spacing={2}>
            {COMPONENT_NOTES.map((note) => (
              <List.Item key={note.en}>{note[language]}</List.Item>
            ))}
          </List>
        </Stack>

        <Text size="xs" c="dimmed">
          {t('irradiated.gradeHint')}{' '}
          <Anchor href={SOURCE.url} target="_blank" rel="noreferrer" size="xs">
            {SOURCE.name}
          </Anchor>{' '}
          · {t('irradiated.checked', { date: SOURCE.checkedOn })}
        </Text>
      </Stack>
    </Card>
  )
}
