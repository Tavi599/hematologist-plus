import { Accordion, Stack, Tabs, Text, TextInput, Title } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { GENERAL_SCORES } from '../../features/scores/general'
import { RISK_SCORES } from '../../features/scores/risk'
import { ScoreCard } from '../../features/scores/ScoreCard'
import type { Score } from '../../features/scores/types'
import { currentLanguage } from '../../lib/i18n'

/**
 * Formulas and scores a haematologist reaches for beside the dose calculator: the everyday
 * formulas in one tab, risk and prognostic scores in the other. Each opens on its own and
 * names the publication its cut-offs were checked against.
 */
export function ScoresPage() {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const matches = (score: Score) =>
    needle === '' ||
    [score.title.uk, score.title.en, score.purpose.uk, score.purpose.en].some((text) =>
      text.toLowerCase().includes(needle),
    )

  const list = (scores: Score[]) => {
    const shown = scores.filter(matches)
    if (shown.length === 0) return <Text c="dimmed">{t('scores.none')}</Text>
    return (
      <Accordion variant="separated" multiple chevronPosition="right">
        {shown.map((score) => (
          <Accordion.Item key={score.id} value={score.id}>
            <Accordion.Control>
              <Text fw={600}>{score.title[language]}</Text>
              <Text size="xs" c="dimmed">
                {score.purpose[language]}
              </Text>
            </Accordion.Control>
            <Accordion.Panel>
              <ScoreCard score={score} />
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    )
  }

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
      <Tabs defaultValue="general" keepMountedMode="display-none">
        <Tabs.List>
          <Tabs.Tab value="general">
            {t('scores.general')} · {GENERAL_SCORES.filter(matches).length}
          </Tabs.Tab>
          <Tabs.Tab value="risk">
            {t('scores.risk')} · {RISK_SCORES.filter(matches).length}
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="general" pt="sm">
          {list(GENERAL_SCORES)}
        </Tabs.Panel>
        <Tabs.Panel value="risk" pt="sm">
          {list(RISK_SCORES)}
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}
