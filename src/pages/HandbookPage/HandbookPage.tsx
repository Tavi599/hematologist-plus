import {
  Accordion,
  Alert,
  Anchor,
  Badge,
  Card,
  Group,
  Loader,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'

import { routes } from '../../app/routes'
import { chapterProgress, type HandbookIndex } from '../../features/handbook/handbook'
import { searchHandbook } from '../../features/handbook/handbook-search'
import { useHandbookIndex } from '../../features/handbook/use-handbook'
import { currentLanguage } from '../../lib/i18n'

/** The handbook's front door: the nine parts, their chapters, and a way in by keyword. */
export function HandbookPage() {
  const { t } = useTranslation()
  const { data, isPending, error } = useHandbookIndex()

  return (
    <Stack>
      <Title order={1}>{t('handbook.title')}</Title>
      {isPending ? <Loader size="sm" /> : null}
      {error ? (
        <Alert color="red" variant="light" title={t('handbook.loadFailedTitle')}>
          {t('handbook.loadFailed')}
        </Alert>
      ) : null}
      {data ? <HandbookIndexView index={data} /> : null}
    </Stack>
  )
}

function HandbookIndexView({ index }: { index: HandbookIndex }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const hits = useMemo(() => searchHandbook(index, query, language), [index, query, language])

  const titleOf = (number: number, titleEn: string): string => {
    const uk = index.front.chapters[String(number)]
    return language === 'uk' && uk ? uk : titleEn
  }
  const partTitleOf = (roman: string, titleEn: string): string => {
    const uk = index.front.parts[roman]
    return language === 'uk' && uk ? uk : titleEn
  }
  const translatedChapters = index.chapters.filter(
    (c) => index.front.chapters[String(c.number)],
  ).length
  // The body of the book is translated chapter by chapter, so the list says
  // both how many chapters are finished and how much of the whole book that is.
  const body = index.chapters.reduce(
    (acc, c) => {
      const progress = chapterProgress(index, c.number)
      if (!progress) return acc
      return {
        blocks: acc.blocks + progress.blocks,
        translated: acc.translated + progress.translated,
        done: acc.done + (progress.translated >= progress.blocks ? 1 : 0),
      }
    },
    { blocks: 0, translated: 0, done: 0 },
  )

  return (
    <Stack>
      <Text c="dimmed">{t('handbook.intro')}</Text>

      <Card withBorder radius="md">
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            {index.book.title}
          </Text>
          <Text size="xs" c="dimmed">
            {index.book.edition} · {index.book.publisher} · ISBN {index.book.isbn}
          </Text>
          <Text size="xs" c="dimmed">
            {index.book.copyright} ·{' '}
            <Anchor href={index.book.licence_url} target="_blank" rel="noreferrer" size="xs">
              {index.book.licence}
            </Anchor>{' '}
            ·{' '}
            <Anchor href={index.book.url} target="_blank" rel="noreferrer" size="xs">
              {index.book.doi}
            </Anchor>
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {t('handbook.changesTitle')}
          </Text>
          {(language === 'uk' ? index.book.changes_uk : index.book.changes_en).map((change) => (
            <Text key={change} size="xs" c="dimmed">
              — {change}
            </Text>
          ))}
        </Stack>
      </Card>

      <TextInput
        label={t('handbook.searchLabel')}
        description={t('handbook.searchHint')}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        placeholder={t('handbook.searchPlaceholder')}
      />

      {query.trim() ? (
        <Card withBorder radius="md">
          {hits.length === 0 ? (
            <Text c="dimmed" size="sm">
              {t('handbook.searchEmpty')}
            </Text>
          ) : (
            <Stack gap={2}>
              <Text size="xs" c="dimmed">
                {t('handbook.searchFound', { count: hits.length })}
              </Text>
              {hits.map((hit, i) => (
                <UnstyledButton
                  key={`${hit.kind}-${hit.chapter}-${hit.blockId ?? i}`}
                  onClick={() => {
                    if (hit.chapter === null) return
                    void navigate(
                      hit.blockId
                        ? `${routes.handbookChapter(hit.chapter)}?block=${hit.blockId}`
                        : routes.handbookChapter(hit.chapter),
                    )
                  }}
                  disabled={hit.chapter === null}
                  p={4}
                >
                  <Group gap="xs" wrap="nowrap" align="baseline">
                    <Badge size="xs" variant="light" tt="none">
                      {t(`handbook.hit.${hit.kind}` as 'handbook.hit.chapter')}
                    </Badge>
                    <Text size="sm">{hit.label}</Text>
                    <Text size="xs" c="dimmed">
                      {hit.context}
                    </Text>
                  </Group>
                </UnstyledButton>
              ))}
            </Stack>
          )}
        </Card>
      ) : null}

      <Tabs defaultValue="parts">
        <Tabs.List>
          <Tabs.Tab value="parts">{t('handbook.tabParts')}</Tabs.Tab>
          <Tabs.Tab value="abbreviations">
            {t('handbook.tabAbbreviations')} ({index.abbreviations.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="parts" pt="sm">
          <Text size="xs" c="dimmed" mb={2}>
            {t('handbook.progress', {
              done: translatedChapters,
              total: index.chapters.length,
            })}
          </Text>
          {body.blocks ? (
            <Text size="xs" c="dimmed" mb="xs">
              {t('handbook.bodyProgress', {
                chapters: body.done,
                total: index.chapters.length,
                percent: Math.round((body.translated / body.blocks) * 100),
              })}
            </Text>
          ) : null}
          <Accordion variant="separated" multiple defaultValue={index.parts.map((p) => p.roman)}>
            {index.parts.map((part) => {
              const chapters = index.chapters.filter((c) => c.part === part.roman)
              const partDone = chapters.filter((c) => {
                const progress = chapterProgress(index, c.number)
                return progress && progress.translated >= progress.blocks
              }).length
              return (
                <Accordion.Item key={part.roman} value={part.roman}>
                  <Accordion.Control>
                    <Group gap="xs" wrap="nowrap">
                      <Badge variant="light" size="sm">
                        {part.roman}
                      </Badge>
                      <Text fw={600}>{partTitleOf(part.roman, part.title_en)}</Text>
                      <Text size="xs" c="dimmed">
                        {t('handbook.chapterCount', { count: chapters.length })}
                      </Text>
                      {partDone ? (
                        <Badge size="xs" variant="light" color="teal" tt="none">
                          {t('handbook.partTranslated', {
                            done: partDone,
                            total: chapters.length,
                          })}
                        </Badge>
                      ) : null}
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    <Stack gap={2}>
                      {chapters.map((chapter) => (
                        <Group key={chapter.number} gap="xs" wrap="nowrap" align="baseline">
                          <Text size="sm" c="dimmed" w={28} ta="right">
                            {chapter.number}
                          </Text>
                          <Anchor
                            component={Link}
                            to={routes.handbookChapter(chapter.number)}
                            size="sm"
                          >
                            {titleOf(chapter.number, chapter.title_en)}
                          </Anchor>
                          <ChapterMark index={index} number={chapter.number} />
                        </Group>
                      ))}
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              )
            })}
          </Accordion>
        </Tabs.Panel>

        <Tabs.Panel value="abbreviations" pt="sm">
          <Abbreviations index={index} />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

/**
 * The small mark next to a chapter: finished, partly translated, or untouched.
 * Without `progress.json` — an installed copy older than it — the mark falls
 * back to whether the chapter's title is translated, which is all the older
 * code knew, instead of claiming a finished chapter is untranslated.
 */
function ChapterMark({ index, number }: { index: HandbookIndex; number: number }) {
  const { t } = useTranslation()
  const progress = chapterProgress(index, number)

  if (!progress) {
    if (index.front.chapters[String(number)]) return null
    return (
      <Badge size="xs" variant="light" color="gray" tt="none">
        {t('handbook.untranslated')}
      </Badge>
    )
  }
  if (progress.translated === 0) {
    return (
      <Badge size="xs" variant="light" color="gray" tt="none">
        {t('handbook.untranslated')}
      </Badge>
    )
  }
  if (progress.translated >= progress.blocks) {
    return (
      <Badge size="xs" variant="light" color="teal" tt="none">
        {t('handbook.translationReady')}
      </Badge>
    )
  }
  return (
    <Badge size="xs" variant="light" color="yellow" tt="none">
      {t('handbook.translationPartly', {
        // A chapter one block short must not read as finished.
        percent: Math.min(99, Math.round((progress.translated / progress.blocks) * 100)),
      })}
    </Badge>
  )
}

function Abbreviations({ index }: { index: HandbookIndex }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const rows = index.abbreviations.filter(
    (a) =>
      !needle ||
      a.abbr.toLowerCase().includes(needle) ||
      a.en.toLowerCase().includes(needle) ||
      (index.front.abbreviations[a.abbr] ?? '').toLowerCase().includes(needle),
  )

  return (
    <Stack gap="xs">
      <TextInput
        label={t('handbook.abbrSearch')}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      <Table striped withTableBorder fz="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={110}>{t('handbook.abbr')}</Table.Th>
            <Table.Th>{t('handbook.abbrMeaning')}</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => {
            const uk = index.front.abbreviations[row.abbr]
            return (
              <Table.Tr key={row.abbr}>
                <Table.Td>
                  <Text fw={600} size="sm">
                    {row.abbr}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {uk ? <Text size="sm">{uk}</Text> : null}
                  <Text size="xs" c="dimmed" lang="en">
                    {row.en}
                  </Text>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </Stack>
  )
}
