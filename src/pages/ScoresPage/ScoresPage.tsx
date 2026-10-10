import { Accordion, Badge, Group, Stack, Tabs, Text, TextInput, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'

import { areaOf, RISK_AREAS, scoreById } from '../../features/scores/areas'
import { GENERAL_SCORES } from '../../features/scores/general'
import { RISK_SCORES } from '../../features/scores/risk'
import { ScoreCard } from '../../features/scores/ScoreCard'
import type { Score } from '../../features/scores/types'
import { currentLanguage } from '../../lib/i18n'

/**
 * Formulas and scores a haematologist reaches for beside the dose calculator: the everyday
 * formulas in one tab, risk and prognostic scores in the other, grouped by the disease each was
 * built on. A link from a disease page (`?score=…`) opens its score straight away.
 */
export function ScoresPage() {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [searchParams] = useSearchParams()
  const linked = searchParams.get('score')
  const linkedScore = linked ? scoreById(linked) : undefined

  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<string | null>(linkedScore?.section ?? 'general')
  const [opened, setOpened] = useState<string[]>(linkedScore ? [linkedScore.id] : [])

  // The linked score opens with the page (the state above starts with it); here it is only
  // brought into view once it has rendered.
  useEffect(() => {
    if (!linkedScore) return
    // After the panel has opened and the page settled; earlier the browser's own scroll wins.
    const timer = window.setTimeout(
      () => document.getElementById(`score-${linkedScore.id}`)?.scrollIntoView({ block: 'start' }),
      300,
    )
    return () => window.clearTimeout(timer)
  }, [linkedScore])

  const needle = query.trim().toLowerCase()
  const matches = (score: Score) =>
    needle === '' ||
    [
      score.title.uk,
      score.title.en,
      score.purpose.uk,
      score.purpose.en,
      areaOf(score.id)?.title.uk ?? '',
      areaOf(score.id)?.title.en ?? '',
    ].some((text) => text.toLowerCase().includes(needle))

  const accordion = (scores: Score[]) => (
    <Accordion
      variant="separated"
      multiple
      chevronPosition="right"
      value={opened}
      onChange={setOpened}
    >
      {scores.filter(matches).map((score) => {
        const area = areaOf(score.id)
        return (
          <Accordion.Item
            key={score.id}
            value={score.id}
            id={`score-${score.id}`}
            // Lands below the application header, not behind it.
            style={{ scrollMarginTop: 60 }}
          >
            <Accordion.Control>
              <Group gap="xs" wrap="wrap">
                <Text fw={600}>{score.title[language]}</Text>
                <Badge size="sm" variant="light" color={area ? 'grape' : 'gray'} tt="none">
                  {area ? area.title[language] : t('scores.forAll')}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                {score.purpose[language]}
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <ScoreCard score={score} />
            </Accordion.Panel>
          </Accordion.Item>
        )
      })}
    </Accordion>
  )

  const generalShown = GENERAL_SCORES.filter(matches)
  const areasShown = RISK_AREAS.map((area) => ({
    area,
    scores: area.scoreIds
      .map((id) => RISK_SCORES.find((score) => score.id === id)!)
      .filter(matches),
  })).filter((entry) => entry.scores.length > 0)
  const riskCount = areasShown.reduce((sum, entry) => sum + entry.scores.length, 0)

  return (
    <Stack gap="sm">
      <Title order={1}>{t('scores.title')}</Title>
      <Text size="sm" c="dimmed">
        {t('scores.lead')}
      </Text>
      <TextInput
        placeholder={t('scores.search')}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        maw={420}
      />
      <Tabs value={tab} onChange={setTab} keepMountedMode="display-none">
        <Tabs.List>
          <Tabs.Tab value="general">
            {t('scores.general')} · {generalShown.length}
          </Tabs.Tab>
          <Tabs.Tab value="risk">
            {t('scores.risk')} · {riskCount}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="general" pt="sm">
          {generalShown.length === 0 ? (
            <Text c="dimmed">{t('scores.none')}</Text>
          ) : (
            accordion(GENERAL_SCORES)
          )}
        </Tabs.Panel>
        <Tabs.Panel value="risk" pt="sm">
          {areasShown.length === 0 ? (
            <Text c="dimmed">{t('scores.none')}</Text>
          ) : (
            <Stack gap="lg">
              {areasShown.map(({ area, scores }) => (
                <Stack key={area.id} gap="xs">
                  <Title order={2} size="h4">
                    {area.title[language]}
                  </Title>
                  {accordion(scores)}
                </Stack>
              ))}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
