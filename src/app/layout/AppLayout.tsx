import { AppShell, Container, Group, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router'

import { routes } from '../routes'
import classes from './AppLayout.module.css'
import { LanguageSwitcher } from './LanguageSwitcher'
import { SessionBadge } from './SessionBadge'
import { PwaUpdatePrompt } from './PwaUpdatePrompt'

export function AppLayout() {
  const { t } = useTranslation()

  const navItems = [
    { to: routes.calculator, label: t('nav.calculator') },
    { to: routes.diseases, label: t('nav.diseases') },
    { to: routes.sources, label: t('nav.sources') },
    { to: routes.proposals, label: t('nav.proposals') },
  ]

  return (
    <AppShell header={{ height: 60 }} footer={{ height: { base: 52, sm: 36 } }} padding="md">
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="lg" wrap="nowrap">
              <Text fw={700} c="red.8" size="lg" visibleFrom="sm">
                {t('app.name')}
              </Text>
              <nav aria-label="main">
                <Group gap={4} wrap="nowrap">
                  {navItems.map((item) => (
                    <NavLink key={item.to} to={item.to} className={classes.link}>
                      {item.label}
                    </NavLink>
                  ))}
                </Group>
              </nav>
            </Group>
            <Group gap="xs" wrap="nowrap">
              <SessionBadge />
              <LanguageSwitcher />
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          <Outlet />
        </Container>
      </AppShell.Main>

      <AppShell.Footer>
        <Container size="xl" h="100%">
          <Group h="100%" align="center">
            <Text size="xs" c="dimmed">
              {t('app.disclaimer')}
            </Text>
          </Group>
        </Container>
      </AppShell.Footer>

      <PwaUpdatePrompt />
    </AppShell>
  )
}
