import {
  Anchor,
  Badge,
  Card,
  Collapse,
  Group,
  List,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { CatalogIndex } from '../../lib/catalog-index'
import {
  CHECKED_ON,
  CLASSES,
  DISCREPANCIES,
  MSD_BASE,
  TOPIC_ORDER,
  type AbxClass,
  type Fact,
} from './classes'

function Fold({
  title,
  children,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card withBorder component="section">
      <UnstyledButton
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        w="100%"
        style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}
      >
        <Title order={3} size="h4">
          {title}
        </Title>
        <Text c="dimmed" aria-hidden>
          {open ? '▴' : '▾'}
        </Text>
      </UnstyledButton>
      <Collapse expanded={open}>
        <Stack gap="xs" pt={6}>
          {children}
        </Stack>
      </Collapse>
    </Card>
  )
}

/** The facts of one list grouped under their topic, in the fixed topic order. */
function FactList({ facts }: { facts: Fact[] }) {
  const { t } = useTranslation()
  return (
    <Stack gap={6}>
      {TOPIC_ORDER.map((topic) => {
        const own = facts.filter((fact) => fact.topic === topic)
        if (own.length === 0) return null
        return (
          <Stack gap={2} key={topic}>
            <Text size="xs" fw={700} c="dimmed" tt="uppercase">
              {t(`antibacterials.topic.${topic}`)}
            </Text>
            <List size="sm" spacing={2}>
              {own.map((fact) => (
                <List.Item key={fact.text}>{fact.text}</List.Item>
              ))}
            </List>
          </Stack>
        )
      })}
    </Stack>
  )
}

function matches(text: string, query: string): boolean {
  return text.toLowerCase().includes(query)
}

/** A class with only the drugs and facts that contain the query; null when none does. */
function narrow(cls: AbxClass, query: string): AbxClass | null {
  if (query === '') return cls
  if (matches(cls.title, query)) return cls
  const facts = cls.facts.filter((fact) => matches(fact.text, query))
  const drugs = cls.drugs.flatMap((drug) => {
    if (matches(drug.name, query)) return [drug]
    const own = drug.facts.filter((fact) => matches(fact.text, query))
    return own.length > 0 ? [{ ...drug, facts: own }] : []
  })
  return facts.length + drugs.length > 0 ? { ...cls, facts, drugs } : null
}

function SourceLine({ cls }: { cls: AbxClass }) {
  const { t } = useTranslation()
  return (
    <Text size="xs" c="dimmed">
      {t('antibacterials.sourcePages')}{' '}
      {cls.pages.map((page, index) => (
        <span key={page}>
          {index > 0 && '; '}
          <Anchor href={`${MSD_BASE}/${page}`} target="_blank" rel="noreferrer" size="xs">
            MSD: {page}
          </Anchor>
        </span>
      ))}
      , {t('antibacterials.checkedOn')} {CHECKED_ON}
    </Text>
  )
}

function ClassCard({
  cls,
  catalog,
  forceOpen,
}: {
  cls: AbxClass
  catalog: CatalogIndex
  forceOpen: boolean
}) {
  const { t } = useTranslation()
  return (
    <Fold title={cls.title} defaultOpen={forceOpen}>
      {cls.facts.length > 0 && (
        <Stack gap={4}>
          {cls.drugs.length > 0 && (
            <Text size="sm" fw={600}>
              {t('antibacterials.classFacts')}
            </Text>
          )}
          <FactList facts={cls.facts} />
        </Stack>
      )}
      {cls.drugs.map((drug) => {
        const row = drug.drugId === undefined ? undefined : catalog.drugs.get(drug.drugId)
        return (
          <Stack gap={4} key={drug.name}>
            <Group gap={6}>
              <Text size="sm" fw={700}>
                {drug.name}
              </Text>
              {row ? (
                <Badge size="xs" variant="light" tt="none">
                  {t('antibacterials.inCatalog')}: {t(`availability.${row.availability}`)}
                </Badge>
              ) : drug.drugId === undefined ? null : (
                <Badge size="xs" variant="light" color="gray" tt="none">
                  {t('antibacterials.notInCatalog')}
                </Badge>
              )}
            </Group>
            <FactList facts={drug.facts} />
          </Stack>
        )
      })}
      <SourceLine cls={cls} />
    </Fold>
  )
}

/** Every fact marked as mattering for a haematology patient, by class. */
function HemeSummary() {
  const { t } = useTranslation()
  const rows = CLASSES.flatMap((cls) => {
    const own = [...cls.facts, ...cls.drugs.flatMap((drug) => drug.facts)].filter(
      (fact) => fact.heme,
    )
    return own.length > 0 ? [{ cls, facts: own }] : []
  })
  return (
    <Fold title={t('antibacterials.hemeTitle')}>
      <Text size="xs" c="dimmed">
        {t('antibacterials.hemeHint')}
      </Text>
      {rows.map(({ cls, facts }) => (
        <Stack gap={2} key={cls.id}>
          <Text size="sm" fw={700}>
            {cls.title}
          </Text>
          <List size="sm" spacing={2}>
            {facts.map((fact) => (
              <List.Item key={fact.text}>{fact.text}</List.Item>
            ))}
          </List>
        </Stack>
      ))}
    </Fold>
  )
}

function Discrepancies() {
  const { t } = useTranslation()
  return (
    <Fold title={t('antibacterials.discrepanciesTitle')}>
      <Text size="xs" c="dimmed">
        {t('antibacterials.discrepanciesHint')}
      </Text>
      <Table.ScrollContainer minWidth={560}>
        <Table striped withTableBorder verticalSpacing={6}>
          <Table.Tbody>
            {DISCREPANCIES.map((item) => (
              <Table.Tr key={item.id}>
                <Table.Td w="22%">
                  <Text size="sm" fw={600}>
                    {item.topic}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" fw={700} c="dimmed">
                    {t('antibacterials.catalogSide')}
                  </Text>
                  <Text size="sm">{item.catalog.text}</Text>
                  <Text size="xs" c="dimmed">
                    {item.catalog.source}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" fw={700} c="dimmed">
                    {t('antibacterials.msdSide')}
                  </Text>
                  <Text size="sm">{item.msd.text}</Text>
                  <Anchor
                    href={`${MSD_BASE}/${item.msd.page}`}
                    target="_blank"
                    rel="noreferrer"
                    size="xs"
                  >
                    MSD: {item.msd.page}
                  </Anchor>
                  <Text size="xs" c="dimmed">
                    {t('antibacterials.checkedOn')} {CHECKED_ON}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Fold>
  )
}

/**
 * The antibacterial reference: a search box, the haematology summary, the classes as folded
 * cards (the one named in `?class=` opens at once) and the list of places where the source and
 * the catalog differ.
 */
export function AntibacterialsReference({
  catalog,
  linked,
}: {
  catalog: CatalogIndex
  linked?: string
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const shown = CLASSES.flatMap((cls) => {
    const narrowed = narrow(cls, needle)
    return narrowed ? [narrowed] : []
  })

  return (
    <Stack gap="sm">
      <TextInput
        aria-label={t('antibacterials.search')}
        placeholder={t('antibacterials.search')}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      {needle === '' && <HemeSummary />}
      {shown.map((cls) => (
        <ClassCard
          key={`${cls.id}-${needle}`}
          cls={cls}
          catalog={catalog}
          forceOpen={needle !== '' || cls.id === linked}
        />
      ))}
      {needle !== '' && shown.length === 0 && (
        <Text size="sm" c="dimmed">
          {t('antibacterials.searchNone')}
        </Text>
      )}
      {needle === '' && <Discrepancies />}
    </Stack>
  )
}
