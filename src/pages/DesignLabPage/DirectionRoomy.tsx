import { Box, Card, Stack, Text, TextInput } from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

import { routes } from '../../app/routes'
import { ScoreCard } from '../../features/scores/ScoreCard'
import { currentLanguage } from '../../lib/i18n'
import classes from './design-lab.module.css'
import { useDiseaseGroups, useScoreGroups } from './design-lab-data'
import type { DirectionProps } from './direction-props'

/**
 * C · tiles: built for a phone in the ward first. Touch targets are whole tiles, the search box
 * is full width, and a score opens into a card instead of a row that has to be aimed at.
 */
export function DirectionRoomy({ catalog, search, onSearch, section }: DirectionProps) {
  const { t } = useTranslation()

  return (
    <Stack gap="md" className={`${classes.lab} ${classes.roomy}`}>
      <TextInput
        size="md"
        radius="xl"
        placeholder={section === 'diseases' ? t('diseases.searchPlaceholder') : t('scores.search')}
        value={search}
        onChange={(event) => onSearch(event.currentTarget.value)}
      />
      {section === 'diseases' ? (
        <RoomyDiseases catalog={catalog} search={search} />
      ) : (
        <RoomyScores search={search} />
      )}
    </Stack>
  )
}

function RoomyDiseases({ catalog, search }: Pick<DirectionProps, 'catalog' | 'search'>) {
  const { t } = useTranslation()
  const groups = useDiseaseGroups(catalog, search)

  if (groups.length === 0) return <Text c="dimmed">{t('diseases.notFound')}</Text>

  return (
    <Stack gap="lg">
      {groups.map((group) => (
        <Stack key={group.key} gap="xs">
          <h2 className={classes.groupTitle}>
            {t(`diseases.group.${group.key}`)} · {group.entries.length}
          </h2>
          <div className={classes.tiles}>
            {group.entries.map((entry) => (
              <Link key={entry.id} to={routes.disease(entry.id)} className={classes.tile}>
                {entry.code !== null && <span className={classes.tileCode}>{entry.code}</span>}
                <span className={classes.tileName}>{entry.name}</span>
                {entry.summary !== '' && (
                  <span className={classes.tileSummary}>{entry.summary}</span>
                )}
              </Link>
            ))}
          </div>
        </Stack>
      ))}
    </Stack>
  )
}

function RoomyScores({ search }: Pick<DirectionProps, 'search'>) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const groups = useScoreGroups(search)
  const [opened, setOpened] = useState<string | null>(null)

  if (groups.length === 0) return <Text c="dimmed">{t('scores.none')}</Text>

  return (
    <Stack gap="lg">
      {groups.map((group) => (
        <Stack key={group.area?.id ?? 'general'} gap="xs">
          <h2 className={classes.groupTitle}>
            {group.area ? group.area.title[language] : t('scores.forAll')}
          </h2>
          <div className={classes.tiles}>
            {group.scores.map((score) => (
              <Box
                key={score.id}
                component="button"
                type="button"
                className={classes.tile}
                style={{ cursor: 'pointer', textAlign: 'left', font: 'inherit' }}
                onClick={() => setOpened(opened === score.id ? null : score.id)}
              >
                <span className={classes.tileName}>{score.title[language]}</span>
                <span className={classes.tileSummary}>{score.purpose[language]}</span>
              </Box>
            ))}
          </div>
          {group.scores.some((score) => score.id === opened) && (
            <Card withBorder radius="lg" padding="md">
              <ScoreCard score={group.scores.find((score) => score.id === opened)!} />
            </Card>
          )}
        </Stack>
      ))}
    </Stack>
  )
}
