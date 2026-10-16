import { ActionIcon, Kbd, Modal, Stack, Text, TextInput, UnstyledButton } from '@mantine/core'
import { useDisclosure, useHotkeys } from '@mantine/hooks'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { currentLanguage } from '../../lib/i18n'
import { useCatalog } from '../../lib/use-catalog'
import classes from './GlobalSearch.module.css'
import { buildSearchIndex, searchCatalog, type SearchEntry, type SearchKind } from './search-index'

const KINDS: SearchKind[] = ['regimen', 'disease', 'drug']

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4.3-4.3" />
    </svg>
  )
}

/**
 * One field for the whole catalog, in the header of every page: a regimen by its name, a regimen
 * by a drug in it, a disease by its name or by its ICD-10 code. The physician who remembers only
 * "BV-IGEV" or only "даратумумаб" gets there without walking the disease list.
 *
 * The index is built once per catalog and language, not per keystroke: five hundred regimens with
 * their drugs are too many to walk through on every letter typed.
 */
export function GlobalSearch() {
  const { t } = useTranslation()
  const [opened, modal] = useDisclosure(false)

  useHotkeys([['mod+K', () => modal.open()]])

  return (
    <>
      <ActionIcon
        variant="default"
        size="md"
        aria-label={t('search.open')}
        onClick={modal.open}
        title={t('search.open')}
      >
        <SearchIcon />
      </ActionIcon>
      <Modal
        opened={opened}
        onClose={modal.close}
        title={t('search.title')}
        size="lg"
        // The field is the whole point of the window: it takes the caret as the window opens.
        trapFocus
      >
        {opened && <SearchBody onDone={modal.close} />}
      </Modal>
    </>
  )
}

function SearchBody({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation()
  const language = currentLanguage()
  const navigate = useNavigate()
  const catalog = useCatalog()
  const [query, setQuery] = useState('')

  const index = useMemo(
    () => (catalog.data === undefined ? [] : buildSearchIndex(catalog.data, language)),
    [catalog.data, language],
  )
  const found = useMemo(() => searchCatalog(index, query), [index, query])

  const flat = KINDS.flatMap((kind) => found[kind].shown)
  const nothing = query.trim().length >= 2 && flat.length === 0

  const go = (entry: SearchEntry) => {
    onDone()
    void navigate(entry.to)
  }

  return (
    <Stack gap="sm">
      <TextInput
        data-autofocus
        label={t('search.field')}
        placeholder={t('search.placeholder')}
        value={query}
        onChange={(event) => setQuery(event.currentTarget.value)}
        onKeyDown={(event) => {
          // Enter on the field takes the first result: the fastest path for someone who typed
          // the name of the course in full.
          if (event.key === 'Enter' && flat[0] !== undefined) {
            event.preventDefault()
            go(flat[0])
          }
        }}
      />
      {catalog.data === undefined && <Text c="dimmed">{t('search.loading')}</Text>}
      {nothing && <Text c="dimmed">{t('search.notFound')}</Text>}
      {KINDS.map((kind) => {
        const group = found[kind]
        if (group.shown.length === 0) return null
        return (
          <Stack key={kind} gap={4}>
            <Text fw={600} size="sm" c="dimmed">
              {t(`search.kind.${kind}`)}
            </Text>
            {group.shown.map((entry) => (
              <UnstyledButton key={entry.key} className={classes.hit} onClick={() => go(entry)}>
                <Text size="sm" fw={500}>
                  {entry.title}
                </Text>
                {entry.subtitle !== '' && (
                  <Text size="xs" c="dimmed">
                    {entry.subtitle}
                  </Text>
                )}
              </UnstyledButton>
            ))}
            {group.total > group.shown.length && (
              <Text size="xs" c="dimmed">
                {t('search.more', { count: group.total - group.shown.length })}
              </Text>
            )}
          </Stack>
        )
      })}
      {query.trim().length < 2 && (
        <Text size="xs" c="dimmed">
          {t('search.hint')}
          {/* A phone has no Ctrl: the shortcut is only worth saying where it works. */}
          <Text span visibleFrom="sm">
            {' '}
            {t('search.hotkey')} <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd>
          </Text>
        </Text>
      )}
    </Stack>
  )
}
