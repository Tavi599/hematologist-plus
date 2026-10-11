import { Accordion, Alert, Anchor, Badge, Group, List, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { routes } from '../../app/routes'
import type { CatalogIndex } from '../../lib/catalog-index'
import { currentLanguage } from '../../lib/i18n'
import {
  RISK_COLOR,
  RISK_LABELS,
  RISK_SHORT,
  SECONDARY_IMMUNODEFICIENCY,
  SOURCES,
  risksOf,
  therapyRisksFor,
  type TherapyRisk,
} from './therapy-risks'

/**
 * Main drugs of the regimens, the ones a mark is decided by; a reference card has no items, so
 * the drugs it names count instead.
 */
function mainDrugs(catalog: CatalogIndex, regimenIds: readonly string[]): string[] {
  return regimenIds.flatMap((id) => [
    ...(catalog.itemsByRegimen.get(id) ?? [])
      .filter((item) => item.role === 'main')
      .map((item) => item.drug_id),
    ...(catalog.regimens.get(id)?.reference?.drugs ?? []).flatMap((drug) =>
      drug.drug_id ? [drug.drug_id] : [],
    ),
  ])
}

/**
 * One line under a regimen in the tree: the infections its drugs bring, in short; hovering names
 * the drug groups behind them.
 */
export function InfectionRiskMark({
  catalog,
  regimenIds,
}: {
  catalog: CatalogIndex
  regimenIds: readonly string[]
}) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const entries = therapyRisksFor(mainDrugs(catalog, regimenIds))
  if (entries.length === 0) return null
  return (
    <Text size="xs" c="violet.8" title={entries.map((entry) => entry.therapy[language]).join('; ')}>
      {t('immunodeficiency.mark')} ·{' '}
      {risksOf(entries)
        .map((risk) => RISK_SHORT[risk][language])
        .join(' · ')}
    </Text>
  )
}

/**
 * In the calculator: each drug group of the course that brings infections, its risks, and what
 * the guidelines advise, folded so the dose table stays in view.
 */
export function TherapyRiskAlert({ entries }: { entries: readonly TherapyRisk[] }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  if (entries.length === 0) return null
  return (
    <Alert color="violet" title={t('immunodeficiency.alertTitle')}>
      <Accordion multiple variant="default" chevronPosition="left">
        {entries.map((entry) => (
          <Accordion.Item key={entry.id} value={entry.id}>
            <Accordion.Control py={4}>
              <Group gap={6}>
                <Text size="sm" fw={600}>
                  {entry.therapy[language]}
                </Text>
                {entry.risks.map((risk) => (
                  <Badge key={risk} size="xs" variant="light" color={RISK_COLOR[risk]} tt="none">
                    {RISK_LABELS[risk][language]}
                  </Badge>
                ))}
              </Group>
            </Accordion.Control>
            <Accordion.Panel>
              <List size="sm" spacing={2}>
                {entry.measures.map((measure) => (
                  <List.Item key={measure.text.en}>
                    {measure.text[language]}{' '}
                    <Text component="span" size="xs" c="dimmed">
                      ({SOURCES[measure.source].short}
                      {measure.grade ? `, ${measure.grade}` : ''})
                    </Text>
                  </List.Item>
                ))}
              </List>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
      <Anchor component={Link} to={routes.disease(SECONDARY_IMMUNODEFICIENCY)} size="xs">
        {t('immunodeficiency.more')} →
      </Anchor>
    </Alert>
  )
}
