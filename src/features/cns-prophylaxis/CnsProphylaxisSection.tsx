import { Accordion, Alert, Anchor, Card, List, Stack, Table, Text, Title } from '@mantine/core'

import { currentLanguage } from '../../lib/i18n'
import { localize } from '../../lib/localized'
import {
  GAPS,
  GAPS_TITLE,
  LEAD,
  SOURCES_TITLE,
  SOURCES,
  TITLE,
  TOPICS,
  type Block,
} from './content'

function sourceLink(pmid?: string, doi?: string, url?: string) {
  if (pmid) return { href: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`, label: `PMID ${pmid}` }
  if (doi) return { href: `https://doi.org/${doi}`, label: `DOI ${doi}` }
  if (url) return { href: url, label: 'URL' }
  return null
}

/** Intrathecal prophylaxis of CNS involvement: indications by disease, doses, safety, cases. */
export function CnsProphylaxisSection() {
  const language = currentLanguage()
  const text = (field: Parameters<typeof localize>[0]) => localize(field, language)

  const renderBlock = (block: Block, index: number) => {
    switch (block.kind) {
      case 'text':
        return (
          <Text key={index} size="sm">
            {text(block.text)}
          </Text>
        )
      case 'warning':
        return (
          <Alert key={index} color="yellow" variant="light">
            <Text size="sm">{text(block.text)}</Text>
          </Alert>
        )
      case 'list':
        return (
          <List key={index} size="sm" spacing={4}>
            {block.items.map((item, i) => (
              <List.Item key={i}>{text(item)}</List.Item>
            ))}
          </List>
        )
      case 'table':
        return (
          <Table.ScrollContainer key={index} minWidth={520}>
            <Table striped withTableBorder verticalSpacing={6}>
              <Table.Thead>
                <Table.Tr>
                  {block.head.map((cell, i) => (
                    <Table.Th key={i}>{text(cell)}</Table.Th>
                  ))}
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {block.rows.map((row, r) => (
                  <Table.Tr key={r}>
                    {row.map((cell, c) => (
                      <Table.Td key={c}>
                        <Text size="sm">{text(cell)}</Text>
                      </Table.Td>
                    ))}
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )
    }
  }

  return (
    <Card withBorder component="section">
      <Stack gap="sm">
        <Title order={2} size="h3">
          {text(TITLE)}
        </Title>
        <Text size="sm" c="dimmed">
          {text(LEAD)}
        </Text>

        <Accordion variant="separated" multiple chevronPosition="right">
          {TOPICS.map((topic) => (
            <Accordion.Item key={topic.id} value={topic.id}>
              <Accordion.Control>
                <Text fw={600}>{text(topic.title)}</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">{topic.blocks.map(renderBlock)}</Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
          <Accordion.Item value="gaps">
            <Accordion.Control>
              <Text fw={600}>{text(GAPS_TITLE)}</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <List size="sm" spacing={4}>
                {GAPS.map((gap, i) => (
                  <List.Item key={i}>{text(gap)}</List.Item>
                ))}
              </List>
            </Accordion.Panel>
          </Accordion.Item>
          <Accordion.Item value="sources">
            <Accordion.Control>
              <Text fw={600}>{text(SOURCES_TITLE)}</Text>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap={6}>
                {SOURCES.map((source) => {
                  const link = sourceLink(source.pmid, source.doi, source.url)
                  return (
                    <Text key={source.id} size="sm">
                      {source.citation}
                      {link && (
                        <>
                          {' — '}
                          <Anchor href={link.href} target="_blank" rel="noreferrer">
                            {link.label}
                          </Anchor>
                        </>
                      )}
                      {' · '}
                      <Text span c="dimmed">
                        {text(source.design)}
                      </Text>
                    </Text>
                  )
                })}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      </Stack>
    </Card>
  )
}
