import {
  Alert,
  Anchor,
  Badge,
  Box,
  Card,
  Group,
  List,
  Loader,
  Progress,
  Spoiler,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router'

import { routes } from '../../app/routes'
import { HandbookBlocks } from '../../features/handbook/HandbookBlocks'
import { HandbookViewSwitch } from '../../features/handbook/HandbookViewSwitch'
import { findInChapter } from '../../features/handbook/handbook-search'
import { translatedShare, type LoadedChapter } from '../../features/handbook/handbook'
import { useHandbookView } from '../../features/handbook/handbook-view'
import { useKeepReadingPlace } from '../../features/handbook/reading-place'

import classes from './HandbookChapterPage.module.css'
import { useHandbookChapter, useHandbookIndex } from '../../features/handbook/use-handbook'
import { currentLanguage } from '../../lib/i18n'

/** One chapter of the handbook, in Ukrainian, in the original, or in both at once. */
export function HandbookChapterPage() {
  const { t } = useTranslation()
  const { number } = useParams()
  const parsed = Number(number)
  const chapterNumber = Number.isInteger(parsed) && parsed >= 1 && parsed <= 200 ? parsed : null
  const { data, isPending, error } = useHandbookChapter(chapterNumber)

  if (chapterNumber === null)
    return (
      <Alert color="red" variant="light" title={t('handbook.noSuchChapterTitle')}>
        {t('handbook.noSuchChapter')}
      </Alert>
    )

  return (
    <Stack>
      <Anchor component={Link} to={routes.handbook} size="sm">
        ← {t('handbook.title')}
      </Anchor>
      {isPending ? <Loader size="sm" /> : null}
      {error ? (
        <Alert color="red" variant="light" title={t('handbook.loadFailedTitle')}>
          {t('handbook.loadFailed')}
        </Alert>
      ) : null}
      {data ? <Chapter loaded={data} /> : null}
    </Stack>
  )
}

function Chapter({ loaded }: { loaded: LoadedChapter }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const [view, setView] = useHandbookView()
  const keepPlace = useKeepReadingPlace(view)
  const [query, setQuery] = useState('')
  const [params, setParams] = useSearchParams()
  const index = useHandbookIndex()

  const { chapter, translation } = loaded
  const share = translatedShare(loaded)
  const hits = useMemo(
    () => findInChapter(chapter.blocks, translation.blocks, query),
    [chapter.blocks, translation.blocks, query],
  )
  const contents = chapter.blocks.filter((b) => b.type === 'h2' || b.type === 'h3')
  // The chapter's own file may not be translated yet, but every chapter title
  // is: they are translated together with the table of contents.
  const titleUk =
    translation.title?.trim() || index.data?.front.chapters[String(chapter.number)]?.trim() || null
  const partTitle = index.data?.parts.find((p) => p.roman === chapter.part)

  // A search result or a link into a section opens the chapter at that block.
  const wanted = params.get('block')
  useEffect(() => {
    if (!wanted) return
    const target = document.getElementById(`b-${wanted}`)
    if (!target) return
    target.scrollIntoView({ block: 'start' })
    const next = new URLSearchParams(params)
    next.delete('block')
    setParams(next, { replace: true })
  }, [wanted, params, setParams])

  return (
    <Stack gap="sm">
      <Box>
        <Group gap="xs" align="baseline" wrap="wrap">
          <Badge variant="light">{t('handbook.chapterNumber', { number: chapter.number })}</Badge>
          {partTitle ? (
            <Text size="xs" c="dimmed">
              {partTitle.roman}.{' '}
              {(language === 'uk' && index.data?.front.parts[partTitle.roman]) ||
                partTitle.title_en}
            </Text>
          ) : null}
          {chapter.page_printed !== null ? (
            <Text size="xs" c="dimmed">
              {t('handbook.printedPage', { page: chapter.page_printed })}
            </Text>
          ) : null}
        </Group>
        <Title order={1} size="h2" mt={4}>
          {view === 'en' ? chapter.title_en : (titleUk ?? chapter.title_en)}
        </Title>
        {view !== 'en' && titleUk ? (
          <Text c="dimmed" lang="en">
            {chapter.title_en}
          </Text>
        ) : null}
        <Text size="sm" c="dimmed" mt={4}>
          {chapter.authors}
        </Text>
        {chapter.doi ? (
          <Anchor
            href={`https://doi.org/${chapter.doi}`}
            target="_blank"
            rel="noreferrer"
            size="xs"
          >
            {chapter.doi}
          </Anchor>
        ) : null}
      </Box>

      <Card withBorder radius="md" padding="sm" className={classes.tools}>
        <Group justify="space-between" wrap="wrap" gap="sm">
          <HandbookViewSwitch value={view} onChange={setView} onBeforeChange={keepPlace} />
          <TextInput
            size="xs"
            placeholder={t('handbook.inChapterSearch')}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            aria-label={t('handbook.inChapterSearch')}
            style={{ flex: '1 1 220px' }}
          />
        </Group>
        {query.trim() ? (
          <Text size="xs" c="dimmed" mt={6}>
            {t('handbook.inChapterFound', { count: hits.size })}
          </Text>
        ) : null}
        <Box mt="xs">
          <Group gap="xs" wrap="nowrap">
            <Progress value={share * 100} size="sm" style={{ flex: 1 }} />
            <Text size="xs" c="dimmed">
              {t('handbook.translatedShare', { percent: Math.round(share * 100) })}
            </Text>
          </Group>
        </Box>
      </Card>

      {contents.length > 1 ? (
        <Card withBorder radius="md" padding="sm">
          <Text fw={600} size="sm" mb={4}>
            {t('handbook.contents')}
          </Text>
          <Spoiler maxHeight={120} showLabel={t('handbook.showAll')} hideLabel={t('handbook.hide')}>
            <Stack gap={0}>
              {contents.map((heading) => (
                <UnstyledButton
                  key={heading.id}
                  onClick={() =>
                    document.getElementById(`b-${heading.id}`)?.scrollIntoView({ block: 'start' })
                  }
                  pl={heading.type === 'h3' ? 'md' : 0}
                >
                  <Text size="sm" c="dimmed" component="span">
                    {heading.num ? `${heading.num} ` : ''}
                  </Text>
                  <Text size="sm" component="span">
                    {translation.blocks[heading.id]?.trim() || heading.en}
                  </Text>
                </UnstyledButton>
              ))}
            </Stack>
          </Spoiler>
        </Card>
      ) : null}

      <Box>
        <HandbookBlocks
          blocks={chapter.blocks}
          translation={translation}
          view={view}
          hits={query.trim() ? hits : undefined}
        />
      </Box>

      {chapter.references.length ? (
        <Card withBorder radius="md" padding="sm">
          <Text fw={600} size="sm" mb="xs">
            {t('handbook.references', { count: chapter.references.length })}
          </Text>
          <Spoiler maxHeight={80} showLabel={t('handbook.showAll')} hideLabel={t('handbook.hide')}>
            <List type="unordered" spacing={4} fz="xs">
              {chapter.references.map((reference) => (
                <List.Item key={reference} lang="en">
                  {reference}
                </List.Item>
              ))}
            </List>
          </Spoiler>
        </Card>
      ) : null}

      {chapter.affiliations ? (
        <Text size="xs" c="dimmed" lang="en">
          {chapter.affiliations}
        </Text>
      ) : null}
    </Stack>
  )
}
