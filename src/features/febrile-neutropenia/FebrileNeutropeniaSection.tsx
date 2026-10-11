import { Anchor, Badge, Card, Group, List, Stack, Table, Text, Title } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { routes } from '../../app/routes'
import { currentLanguage } from '../../lib/i18n'
import { AbbreviationList } from '../abbreviations/AbbreviationList'
import { FEBRILE_NEUTROPENIA_ABBREVIATIONS } from '../abbreviations/abbreviations'
import { CatalogGate } from '../catalog/CatalogGate'
import { TreatmentTree } from '../catalog/TreatmentTree'
import {
  AGENTS,
  FEBRILE_NEUTROPENIA_DISEASE,
  GUIDELINE,
  NEUTROPENIA_DEFINITION,
  STAGES,
} from './algorithm'
import { COMPLICATION_STAGES } from './complications'

/**
 * Febrile neutropenia as an algorithm: risk, the first line by risk and colonisation, what is done
 * after 96 hours, antifungal therapy and when to stop, with the guideline's grade at each step and
 * the label dose of each named drug, and the courses the calculator writes from those doses.
 */
export function FebrileNeutropeniaSection() {
  const { t } = useTranslation()
  const language = currentLanguage()

  return (
    <Stack gap="sm">
      <Card withBorder component="section">
        <Stack gap={6}>
          <Title order={2} size="h3">
            {t('febrileNeutropenia.title')}
          </Title>
          <Text size="sm">{NEUTROPENIA_DEFINITION.text[language]}</Text>
          <Text size="sm" c="dimmed">
            {t('febrileNeutropenia.lead')}{' '}
            <Anchor component={Link} to={`${routes.scores}?score=mascc`} size="sm">
              {t('febrileNeutropenia.mascc')} →
            </Anchor>
          </Text>
        </Stack>
      </Card>

      <AbbreviationList keys={FEBRILE_NEUTROPENIA_ABBREVIATIONS} />

      {[...STAGES, ...COMPLICATION_STAGES].map((stage) => (
        <Card key={stage.id} withBorder component="section">
          <Stack gap={6}>
            <Title order={3} size="h4">
              {stage.title[language]}
            </Title>
            <List size="sm" spacing={4}>
              {stage.steps.map((step) => (
                <List.Item key={step.text.en}>
                  {step.text[language]}{' '}
                  {step.grade && (
                    <Badge size="xs" variant="light" color="gray" tt="none">
                      {step.grade}
                    </Badge>
                  )}
                </List.Item>
              ))}
            </List>
            {stage.sources && (
              <Text size="xs" c="dimmed">
                {t('febrileNeutropenia.stageSources')}{' '}
                {stage.sources.map((source, index) => (
                  <span key={source.url}>
                    {index > 0 && '; '}
                    <Anchor href={source.url} target="_blank" rel="noreferrer" size="xs">
                      {source.name}
                    </Anchor>
                  </span>
                ))}
              </Text>
            )}
          </Stack>
        </Card>
      ))}

      <Card withBorder component="section">
        <Stack gap={6}>
          <Title order={3} size="h4">
            {t('febrileNeutropenia.agents')}
          </Title>
          <Text size="xs" c="dimmed">
            {t('febrileNeutropenia.agentsHint')}
          </Text>
          <Table.ScrollContainer minWidth={520}>
            <Table striped withTableBorder verticalSpacing={6}>
              <Table.Tbody>
                {AGENTS.flatMap(({ group, agents }) => [
                  <Table.Tr key={group.en}>
                    <Table.Td colSpan={2}>
                      <Text fw={700} size="sm">
                        {group[language]}
                      </Text>
                    </Table.Td>
                  </Table.Tr>,
                  ...agents.map((agent) => (
                    <Table.Tr key={agent.name.en}>
                      <Table.Td>
                        <Text size="sm">{agent.name[language]}</Text>
                      </Table.Td>
                      <Table.Td>
                        {agent.dose ? (
                          <Group gap={4} wrap="wrap">
                            <Text size="sm">{agent.dose[language]}</Text>
                            {agent.source && (
                              <Anchor
                                href={agent.source.url}
                                target="_blank"
                                rel="noreferrer"
                                size="xs"
                                title={agent.source.name}
                              >
                                {t('febrileNeutropenia.label')}
                              </Anchor>
                            )}
                            {agent.regimenId && (
                              <Anchor
                                component={Link}
                                to={`${routes.calculator}?regimen=${agent.regimenId}`}
                                size="xs"
                                fw={600}
                              >
                                {t('febrileNeutropenia.calculate')} →
                              </Anchor>
                            )}
                          </Group>
                        ) : (
                          <Text size="xs" c="dimmed">
                            {t('febrileNeutropenia.noDose')}
                          </Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  )),
                ])}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
          <Text size="xs" c="dimmed">
            {t('febrileNeutropenia.renal')}
          </Text>
        </Stack>
      </Card>

      <Card withBorder component="section">
        <Stack gap={6}>
          <Title order={3} size="h4">
            {t('febrileNeutropenia.courses')}
          </Title>
          <Text size="xs" c="dimmed">
            {t('febrileNeutropenia.coursesHint')}
          </Text>
          <CatalogGate>
            {(catalog) => (
              <TreatmentTree catalog={catalog} diseaseId={FEBRILE_NEUTROPENIA_DISEASE} />
            )}
          </CatalogGate>
        </Stack>
      </Card>

      <Stack gap={2}>
        <Text size="xs" c="dimmed">
          {t('febrileNeutropenia.source')}{' '}
          <Anchor href={GUIDELINE.url} target="_blank" rel="noreferrer" size="xs">
            {GUIDELINE.name}
          </Anchor>
        </Text>
        <Text size="xs" c="dimmed">
          {t('febrileNeutropenia.definitionSource')}{' '}
          <Anchor
            href={NEUTROPENIA_DEFINITION.source.url}
            target="_blank"
            rel="noreferrer"
            size="xs"
          >
            {NEUTROPENIA_DEFINITION.source.name}
          </Anchor>
        </Text>
      </Stack>
    </Stack>
  )
}
