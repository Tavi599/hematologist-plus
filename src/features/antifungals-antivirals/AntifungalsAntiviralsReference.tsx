import {
  Anchor,
  Badge,
  Card,
  Collapse,
  Group,
  List,
  Popover,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import type { CatalogIndex } from '../../lib/catalog-index'
import { TOPIC_ORDER } from '../antibacterials/classes'
import {
  CLASSES,
  DISCREPANCIES,
  REGISTER_CHECKED_ON,
  REGISTER_URL,
  SOURCES,
  type AfavClass,
  type AfavDrug,
  type Fact,
  type Group as AgentGroup,
  type SourceId,
} from './agents'

function Fold({
  title,
  children,
  defaultOpen = false,
  id,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
  id?: string
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card withBorder component="section" id={id} style={{ scrollMarginTop: 60 }}>
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

/** The facts of one list grouped under their topic; a fact from another source names it. */
function FactList({ facts, main }: { facts: Fact[]; main: SourceId | undefined }) {
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
                <List.Item key={fact.text}>
                  {fact.text}
                  {fact.src !== undefined && fact.src !== main && (
                    <Text span size="xs" c="dimmed">
                      {' '}
                      [{SOURCES[fact.src].tag}]
                    </Text>
                  )}
                </List.Item>
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
function narrow(cls: AfavClass, query: string): AfavClass | null {
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

function SourceLine({ ids }: { ids: SourceId[] }) {
  const { t } = useTranslation()
  return (
    <Text size="xs" c="dimmed">
      {t('afav.sources')}{' '}
      {ids.map((id, index) => (
        <span key={id}>
          {index > 0 && '; '}
          <Anchor href={SOURCES[id].url} target="_blank" rel="noreferrer" size="xs">
            {SOURCES[id].label}
          </Anchor>{' '}
          ({t('afav.checkedOn')} {SOURCES[id].checkedOn})
        </span>
      ))}
    </Text>
  )
}

/** What the catalog or the State Register says about the drug, as a badge. */
function DrugBadge({ drug, catalog }: { drug: AfavDrug; catalog: CatalogIndex }) {
  const { t } = useTranslation()
  if (drug.drugId !== undefined) {
    const row = catalog.drugs.get(drug.drugId)
    return row ? (
      <Badge size="xs" variant="light" tt="none">
        {t('afav.inCatalog')}: {t(`availability.${row.availability}`)}
      </Badge>
    ) : (
      <Badge size="xs" variant="light" color="gray" tt="none">
        {t('afav.notInCatalog')}
      </Badge>
    )
  }
  if (drug.register === undefined) return null
  const current = drug.register.status === 'current'
  return (
    <Popover width={280} position="bottom" withArrow shadow="md">
      <Popover.Target>
        <Badge
          component="button"
          type="button"
          size="xs"
          variant="light"
          color={current ? 'gray' : 'orange'}
          tt="none"
          styles={{
            root: { cursor: 'pointer', height: 'auto', maxWidth: '100%' },
            label: { whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip' },
          }}
        >
          {t(current ? 'afav.registeredNoCard' : 'afav.unregistered')}
        </Badge>
      </Popover.Target>
      <Popover.Dropdown>
        <Text size="xs">{drug.register.note}</Text>
        <Text size="xs" c="dimmed" mt={4}>
          <Anchor href={REGISTER_URL} target="_blank" rel="noreferrer" size="xs">
            {t('afav.register')}
          </Anchor>
          , {t('afav.checkedOn')} {REGISTER_CHECKED_ON}
        </Text>
      </Popover.Dropdown>
    </Popover>
  )
}

/** The element id of a class card, which a `?class=` link scrolls to. */
const classAnchor = (id: string) => `afav-class-${id}`

function ClassCard({
  cls,
  catalog,
  forceOpen,
}: {
  cls: AfavClass
  catalog: CatalogIndex
  forceOpen: boolean
}) {
  const { t } = useTranslation()
  const main = cls.sources[0]
  return (
    <Fold title={cls.title} defaultOpen={forceOpen} id={classAnchor(cls.id)}>
      {cls.facts.length > 0 && (
        <Stack gap={4}>
          {cls.drugs.length > 0 && (
            <Text size="sm" fw={600}>
              {t('afav.classFacts')}
            </Text>
          )}
          <FactList facts={cls.facts} main={main} />
        </Stack>
      )}
      {cls.drugs.map((drug) => (
        <Stack gap={4} key={drug.name}>
          <Group gap={6}>
            <Text size="sm" fw={700}>
              {drug.name}
            </Text>
            <DrugBadge drug={drug} catalog={catalog} />
          </Group>
          <FactList facts={drug.facts} main={main} />
        </Stack>
      ))}
      <SourceLine ids={cls.sources} />
    </Fold>
  )
}

/** Every fact marked as mattering for a haematology patient, by class. */
function HemeSummary() {
  const { t } = useTranslation()
  const rows = CLASSES.flatMap((cls) => {
    const own = [
      ...cls.facts,
      ...cls.drugs.flatMap((drug) =>
        drug.facts.map((fact) => ({ ...fact, text: `${drug.name}: ${fact.text}` })),
      ),
    ].filter((fact) => fact.heme)
    return own.length > 0 ? [{ cls, facts: own }] : []
  })
  return (
    <Fold title={t('afav.hemeTitle')}>
      <Text size="xs" c="dimmed">
        {t('afav.hemeHint')}
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
    <Fold title={t('afav.discrepanciesTitle')}>
      <Text size="xs" c="dimmed">
        {t('afav.discrepanciesHint')}
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
                    {t('afav.catalogSide')}
                  </Text>
                  <Text size="sm">{item.catalog.text}</Text>
                  <Text size="xs" c="dimmed">
                    {item.catalog.source}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="xs" fw={700} c="dimmed">
                    {SOURCES[item.other.src].tag}
                  </Text>
                  <Text size="sm">{item.other.text}</Text>
                  <Anchor
                    href={SOURCES[item.other.src].url}
                    target="_blank"
                    rel="noreferrer"
                    size="xs"
                  >
                    {SOURCES[item.other.src].label}
                  </Anchor>
                  <Text size="xs" c="dimmed">
                    {t('afav.checkedOn')} {SOURCES[item.other.src].checkedOn}
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

const GROUPS: AgentGroup[] = ['antifungal', 'antiviral']

/**
 * The antifungal and antiviral reference: a search box, the haematology summary, the classes as
 * folded cards under two headings (the one named in `?class=` opens at once) and the list of
 * places where a source and the catalog differ.
 */
export function AntifungalsAntiviralsReference({
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

  // A link from another page (`?class=`) lands on its card, not on the top of a long page.
  useEffect(() => {
    if (linked === undefined) return
    document.getElementById(classAnchor(linked))?.scrollIntoView({ block: 'start' })
  }, [linked])

  return (
    <Stack gap="sm">
      <TextInput
        aria-label={t('afav.search')}
        placeholder={t('afav.search')}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      {needle === '' && <HemeSummary />}
      {GROUPS.map((group) => {
        const own = shown.filter((cls) => cls.group === group)
        if (own.length === 0) return null
        return (
          <Stack gap="sm" key={group}>
            <Title order={2} size="h3" mt="xs">
              {t(`afav.group.${group}`)}
            </Title>
            {own.map((cls) => (
              <ClassCard
                key={`${cls.id}-${needle}`}
                cls={cls}
                catalog={catalog}
                forceOpen={needle !== '' || cls.id === linked}
              />
            ))}
          </Stack>
        )
      })}
      {needle !== '' && shown.length === 0 && (
        <Text size="sm" c="dimmed">
          {t('afav.searchNone')}
        </Text>
      )}
      {needle === '' && <Discrepancies />}
    </Stack>
  )
}
