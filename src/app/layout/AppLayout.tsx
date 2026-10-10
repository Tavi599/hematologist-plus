import { AppShell, Burger, Container, Group, Menu, Text } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation } from 'react-router'

import { routes } from '../routes'
import classes from './AppLayout.module.css'
import { LanguageSwitcher } from './LanguageSwitcher'
import { SessionBadge } from './SessionBadge'
import { ThemeToggle } from './ThemeToggle'
import { PwaUpdatePrompt } from './PwaUpdatePrompt'

export function AppLayout() {
  const { t } = useTranslation()
  const [menuOpened, menu] = useDisclosure(false)
  const { pathname } = useLocation()

  const navItems = [
    { to: routes.calculator, label: t('nav.calculator') },
    { to: routes.need, label: t('nav.need') },
    { to: routes.diseases, label: t('nav.diseases') },
    { to: routes.sources, label: t('nav.sources') },
    { to: routes.proposals, label: t('nav.proposals') },
  ]

  return (
    <AppShell header={{ height: 48 }} footer={{ height: { base: 52, sm: 32 } }} padding="sm">
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between" wrap="nowrap">
            <Group gap="lg" wrap="nowrap" className={classes.navGroup}>
              <Text fw={700} size="lg" visibleFrom="sm" className={classes.brand}>
                {t('app.name')}
              </Text>
              {/* On a phone the five sections do not fit in a row: a menu shows them all, with
                  the current one named beside it, instead of a bar cut off at the edge. */}
              <Menu opened={menuOpened} onChange={menu.toggle} position="bottom-start">
                <Menu.Target>
                  <Group gap={6} wrap="nowrap" hiddenFrom="sm" style={{ cursor: 'pointer' }}>
                    <Burger size="sm" opened={menuOpened} aria-label={t('nav.menu')} />
                    <Text fw={600} size="sm">
                      {navItems.find((item) => pathname.startsWith(item.to))?.label ??
                        t('app.name')}
                    </Text>
                  </Group>
                </Menu.Target>
                <Menu.Dropdown>
                  {navItems.map((item) => (
                    <Menu.Item key={item.to} component={Link} to={item.to}>
                      {item.label}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
              <nav aria-label="main" className={classes.nav}>
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
              <ThemeToggle />
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
