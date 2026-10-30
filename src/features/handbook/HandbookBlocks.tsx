import { Badge, Box, Card, Group, List, Table, Text, Title } from '@mantine/core'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { HandbookBlock, HandbookTranslation } from './handbook'
import type { HandbookView } from './handbook-view'
import classes from './HandbookBlocks.module.css'

interface Props {
  blocks: HandbookBlock[]
  translation: HandbookTranslation
  view: HandbookView
  /** Block ids the in-chapter search matched. */
  hits?: Set<string>
}

/**
 * A chapter's text, rendered block by block.
 *
 * Every block carries `data-block-id`: that is what the table of contents
 * scrolls to, what the search highlights, and what keeps the reader's place
 * when the language changes.
 */
export function HandbookBlocks({ blocks, translation, view, hits }: Props) {
  const groups = groupBlocks(blocks)
  return (
    <>
      {groups.map((group, i) =>
        group.kind === 'list' ? (
          <List key={group.blocks[0]?.id ?? i} spacing={4} withPadding mb="sm">
            {group.blocks.map((block) => (
              <List.Item key={block.id}>
                <Anchored block={block} hits={hits}>
                  <Bilingual block={block} translation={translation} view={view} />
                </Anchored>
              </List.Item>
            ))}
          </List>
        ) : (
          <Anchored key={group.block.id} block={group.block} hits={hits}>
            <OneBlock block={group.block} translation={translation} view={view} />
          </Anchored>
        ),
      )}
    </>
  )
}

type Group = { kind: 'list'; blocks: HandbookBlock[] } | { kind: 'single'; block: HandbookBlock }

/** Consecutive list items are one list, so the bullets line up as in the book. */
function groupBlocks(blocks: HandbookBlock[]): Group[] {
  const out: Group[] = []
  for (const block of blocks) {
    const last = out[out.length - 1]
    if (block.type === 'li' && last?.kind === 'list') last.blocks.push(block)
    else if (block.type === 'li') out.push({ kind: 'list', blocks: [block] })
    else out.push({ kind: 'single', block })
  }
  return out
}

function Anchored({
  block,
  hits,
  children,
}: {
  block: HandbookBlock
  hits?: Set<string>
  children: ReactNode
}) {
  return (
    <Box
      data-block-id={block.id}
      id={`b-${block.id}`}
      className={`${classes.block} ${hits?.has(block.id) ? classes.hit : ''}`}
    >
      {children}
    </Box>
  )
}

function OneBlock({
  block,
  translation,
  view,
}: {
  block: HandbookBlock
  translation: HandbookTranslation
  view: HandbookView
}) {
  if (block.type === 'h2' || block.type === 'h3' || block.type === 'h4') {
    const order = block.type === 'h2' ? 2 : block.type === 'h3' ? 3 : 4
    return (
      <Title order={order} size={order === 2 ? 'h3' : order === 3 ? 'h4' : 'h5'} mt="lg" mb="xs">
        {block.num ? (
          <Text span c="dimmed" mr={6}>
            {block.num}
          </Text>
        ) : null}
        <Bilingual block={block} translation={translation} view={view} inline />
      </Title>
    )
  }

  if (block.type === 'table')
    return <TableBlock block={block} translation={translation} view={view} />

  if (block.type === 'figure')
    return (
      <Card withBorder padding="xs" mb="sm" bg="var(--mantine-color-body)">
        <Bilingual block={block} translation={translation} view={view} size="sm" />
      </Card>
    )

  if (block.type === 'aside')
    return (
      <Card withBorder padding="sm" mb="sm" radius="md">
        <Bilingual block={block} translation={translation} view={view} size="sm" />
      </Card>
    )

  return (
    <Box mb="sm">
      <Bilingual block={block} translation={translation} view={view} />
    </Box>
  )
}

function TableBlock({
  block,
  translation,
  view,
}: {
  block: HandbookBlock
  translation: HandbookTranslation
  view: HandbookView
}) {
  const { t } = useTranslation()
  const ukRows = translation.rows[block.id]
  const rows = view === 'en' ? block.rows_en : (ukRows ?? block.rows_en)
  const header = rows?.[0]
  const body = rows?.slice(1) ?? []

  return (
    <Card withBorder padding="sm" mb="md" radius="md">
      <Group gap="xs" mb="xs" wrap="nowrap" align="flex-start">
        <Badge variant="light" size="sm">
          {t('handbook.table')} {block.num}
        </Badge>
        <Box style={{ flex: 1 }}>
          <Bilingual block={block} translation={translation} view={view} size="sm" />
        </Box>
      </Group>
      {rows && header ? (
        <>
          <Box className={classes.tableWrap}>
            <Table striped withTableBorder withColumnBorders fz="xs">
              <Table.Thead>
                <Table.Tr>
                  {header.map((cell, i) => (
                    <Table.Th key={i} className={classes.cell}>
                      {cell}
                    </Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {body.map((row, r) => (
                  <Table.Tr key={r}>
                    {row.map((cell, c) => (
                      <Table.Td key={c} className={classes.cell}>
                        {cell}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Box>
          {view !== 'en' && !ukRows ? (
            <Text size="xs" c="dimmed" mt={4}>
              {t('handbook.tableUntranslated')}
            </Text>
          ) : null}
        </>
      ) : (
        <Text size="xs" c="dimmed">
          {t('handbook.tableNotRead')}
        </Text>
      )}
    </Card>
  )
}

/**
 * One block's text in the chosen language. In `uk` an untranslated block still
 * shows its English — a gap in the translation must never look like a gap in
 * the book — and says so. In `both` the Ukrainian comes first and the original
 * sits right under it.
 */
function Bilingual({
  block,
  translation,
  view,
  inline = false,
  size,
}: {
  block: HandbookBlock
  translation: HandbookTranslation
  view: HandbookView
  inline?: boolean
  size?: 'sm' | 'xs'
}) {
  const { t } = useTranslation()
  const uk = translation.blocks[block.id]?.trim() || null

  if (view === 'en')
    return (
      <Text span={inline} size={size}>
        {block.en}
      </Text>
    )

  if (view === 'uk')
    return uk ? (
      <Text span={inline} size={size}>
        {uk}
      </Text>
    ) : (
      <Text span={inline} size={size}>
        {block.en}
        <Badge ml={6} size="xs" variant="light" color="gray" tt="none">
          {t('handbook.untranslated')}
        </Badge>
      </Text>
    )

  // both
  return (
    <>
      {uk ? (
        <Text span={inline} size={size}>
          {uk}
        </Text>
      ) : null}
      <Box className={uk ? classes.original : undefined}>
        <Text span={inline} size={size ?? 'sm'} c="dimmed" lang="en">
          {block.en}
        </Text>
      </Box>
    </>
  )
}
