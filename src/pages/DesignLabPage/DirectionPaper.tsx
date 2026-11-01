import { Box, Stack, Text, TextInput } from '@mantine/core'
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
 * B · paper: the reference book the department already has on the shelf. A serif face, rules
 * instead of borders, codes in the margin, no badges and no cards. Nothing carries colour.
 */
export function DirectionPaper({ catalog, search, onSearch, section }: DirectionProps) {
  const { t } = useTranslation()

  return (
    <Stack gap="md" className={`${classes.lab} ${classes.paper}`}>
      <TextInput
        size="xs"
        maw={360}
        variant="unstyled"
        style={{ borderBottom: '1px solid var(--line)' }}
        placeholder={section === 'diseases' ? t('diseases.searchPlaceholder') : t('scores.search')}
        value={search}
        onChange={(event) => onSearch(event.currentTarget.value)}
      />
      {section === 'diseases' ? (
        <PaperDiseases catalog={catalog} search={search} />
      ) : (
        <PaperScores search={search} />
      )}
    </Stack>
  )
}

function PaperDiseases({ catalog, search }: Pick<DirectionProps, 'catalog' | 'search'>) {
  const { t } = useTranslation()
  const groups = useDiseaseGroups(catalog, search)

  if (groups.length === 0) return <Text c="dimmed">{t('diseases.notFound')}</Text>

  return (
    <Stack gap="lg">
      {groups.map((group) => (
        <section key={group.key}>
          <h2 className={classes.groupTitle}>{t(`diseases.group.${group.key}`)}</h2>
          {group.entries.map((entry) => (
            <div key={entry.id} className={classes.entry}>
              <div className={classes.entryCode}>{entry.code ?? ''}</div>
              <div>
                <Link to={routes.disease(entry.id)} className={classes.entryLink}>
                  {entry.name}
                </Link>
                {entry.summary !== '' && (
                  <div className={classes.entrySummary}>{entry.summary}</div>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}
    </Stack>
  )
}

function PaperScores({ search }: Pick<DirectionProps, 'search'>) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const groups = useScoreGroups(search)
  const [opened, setOpened] = useState<string | null>(null)

  if (groups.length === 0) return <Text c="dimmed">{t('scores.none')}</Text>

  return (
    <Stack gap="lg">
      {groups.map((group) => (
        <section key={group.area?.id ?? 'general'}>
          <h2 className={classes.groupTitle}>
            {group.area ? group.area.title[language] : t('scores.forAll')}
          </h2>
          {group.scores.map((score) => (
            <div key={score.id} className={classes.entry}>
              <div className={classes.entryCode}>
                {opened === score.id ? t('designLab.close') : t('designLab.open')}
              </div>
              <div>
                <Box
                  component="button"
                  type="button"
                  bg="transparent"
                  p={0}
                  className={classes.entryLink}
                  style={{ border: 'none', font: 'inherit', cursor: 'pointer', textAlign: 'left' }}
                  onClick={() => setOpened(opened === score.id ? null : score.id)}
                >
                  {score.title[language]}
                </Box>
                <div className={classes.entrySummary}>{score.purpose[language]}</div>
                {opened === score.id && (
                  <Box pt="sm">
                    <ScoreCard score={score} />
                  </Box>
                )}
              </div>
            </div>
          ))}
        </section>
      ))}
    </Stack>
  )
}
