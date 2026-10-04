import { Card, Group, Text, UnstyledButton } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import type { ReactNode } from 'react'

interface CollapsibleCardProps {
  title: string
  /** Shown beside the title while the section is closed, e.g. how many rows it holds. */
  hint?: string
  defaultOpen?: boolean
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
  children,
}: CollapsibleCardProps) {
  const [opened, { toggle }] = useDisclosure(defaultOpen)

  return (
    <Card withBorder component="section">
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
