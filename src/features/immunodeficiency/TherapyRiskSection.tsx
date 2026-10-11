import {
  Accordion,
  Anchor,
  Badge,
  Card,
  Chip,
  Group,
  List,
  Stack,
  Text,
  Title,
} from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { currentLanguage } from '../../lib/i18n'
import {
  GENERAL_FACTORS,
  PROPHYLAXIS_AGENTS,
  RISK_COLOR,
  RISK_LABELS,
  SOURCES,
  THERAPY_RISKS,
  type Measure,
  type RiskKind,
  type SourceKey,
} from './therapy-risks'

/**
 * Secondary immunodeficiency from treatment: each therapy with the infections it brings and what
 * the guidelines advise, filtered by the risk the physician is after.
 */
export function TherapyRiskSection() {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [risks, setRisks] = useState<string[]>([])
  const shown = THERAPY_RISKS.filter(
    (entry) => risks.length === 0 || entry.risks.some((risk) => risks.includes(risk)),
  )
  // Number the sources in the order they are first cited, as a reference list.
  const order: SourceKey[] = []
  for (const measure of [
    ...THERAPY_RISKS.flatMap((entry) => entry.measures),
    ...PROPHYLAXIS_AGENTS,
  ]) {
    if (!order.includes(measure.source)) order.push(measure.source)
  }
  const cite = (measure: Measure) => (
    <Text component="span" size="xs" c="dimmed">
      {' '}
      [{order.indexOf(measure.source) + 1}
      {measure.grade ? `; ${measure.grade}` : ''}]
    </Text>
  )

  return (
    <Card withBorder component="section">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('immunodeficiency.title')}
        </Title>
        <Text size="sm" c="dimmed">
          {t('immunodeficiency.lead')}
        </Text>

        <Chip.Group multiple value={risks} onChange={setRisks}>
          <Group gap={6}>
            {(Object.keys(RISK_LABELS) as RiskKind[]).map((risk) => (
              <Chip key={risk} value={risk} size="xs" color={RISK_COLOR[risk]}>
                {RISK_LABELS[risk][language]}
              </Chip>
            ))}
          </Group>
        </Chip.Group>

        <Accordion multiple variant="separated" chevronPosition="left">
          {shown.map((entry) => (
            <Accordion.Item key={entry.id} value={entry.id}>
              <Accordion.Control>
                <Stack gap={4}>
                  <Text fw={600} size="sm">
                    {entry.therapy[language]}
                  </Text>
                  <Group gap={4}>
                    {entry.risks.map((risk) => (
                      <Badge
                        key={risk}
                        size="xs"
                        variant="light"
                        color={RISK_COLOR[risk]}
                        tt="none"
                      >
                        {RISK_LABELS[risk][language]}
                      </Badge>
                    ))}
                  </Group>
                </Stack>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap={6}>
                  <Text size="sm">{entry.why[language]}</Text>
                  <List size="sm" spacing={4}>
                    {entry.measures.map((measure) => (
                      <List.Item key={measure.text.en}>
                        {measure.text[language]}
                        {cite(measure)}
                      </List.Item>
                    ))}
                  </List>
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>

        <Stack gap={4}>
          <Text fw={600} size="sm">
            {t('immunodeficiency.general')}
          </Text>
          <List size="sm" spacing={2}>
            {GENERAL_FACTORS.map((factor) => (
              <List.Item key={factor.en}>{factor[language]}</List.Item>
            ))}
          </List>
        </Stack>

        <Stack gap={4}>
          <Text fw={600} size="sm">
            {t('immunodeficiency.agents')}
          </Text>
          <List size="sm" spacing={2}>
            {PROPHYLAXIS_AGENTS.map((measure) => (
              <List.Item key={measure.text.en}>
                {measure.text[language]}
                {cite(measure)}
              </List.Item>
            ))}
          </List>
        </Stack>

        <Stack gap={2}>
          <Text fw={600} size="xs">
            {t('immunodeficiency.sources')}
          </Text>
          {order.map((key, index) => (
            <Text key={key} size="xs" c="dimmed">
              {index + 1}.{' '}
              <Anchor href={SOURCES[key].url} target="_blank" rel="noreferrer" size="xs">
                {SOURCES[key].name}
              </Anchor>{' '}
              — {SOURCES[key].read[language]}
            </Text>
          ))}
        </Stack>
      </Stack>
    </Card>
  )
}
