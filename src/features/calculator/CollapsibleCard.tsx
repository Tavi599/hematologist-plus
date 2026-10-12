import { Card, Group, Text, UnstyledButton } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useState, type ReactNode } from 'react'

interface CollapsibleCardProps {
  title: string
  /** Shown beside the title while the section is closed, e.g. how many rows it holds. */
  hint?: string
  defaultOpen?: boolean
  /** Opens the section whenever it changes: a link elsewhere on the page asks to see it. */
  openRequest?: number
  /** Anchor id of the section, so a link elsewhere on the page can scroll to it. */
  id?: string
  children: ReactNode
}

/**
 * A section that is rarely needed: closed it is one line, open it is the whole form. The content
 * stays mounted when closed, so what was typed in is not lost by folding the section away.
 */
export function CollapsibleCard({
  title,
  hint,
  defaultOpen = false,
  openRequest,
  id,
  children,
}: CollapsibleCardProps) {
  const [opened, { toggle, open }] = useDisclosure(defaultOpen)
  // A request seen once is answered once; folding the section again afterwards is the reader's.
  const [seenRequest, setSeenRequest] = useState(openRequest)
  if (openRequest !== seenRequest) {
    setSeenRequest(openRequest)
    open()
  }

  return (
    <Card withBorder component="section" id={id}>
      <UnstyledButton onClick={toggle} aria-expanded={opened} w="100%">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Text fw={600} size="sm" component="h2" m={0}>
              {title}
            </Text>
            {hint && !opened && (
              <Text size="xs" c="dimmed">
                {hint}
              </Text>
            )}
          </Group>
          <Text size="xs" c="dimmed" aria-hidden>
            {opened ? '▲' : '▼'}
          </Text>
        </Group>
      </UnstyledButton>
      <div hidden={!opened} style={{ paddingTop: 'var(--mantine-spacing-xs)' }}>
        {children}
      </div>
    </Card>
  )
}
