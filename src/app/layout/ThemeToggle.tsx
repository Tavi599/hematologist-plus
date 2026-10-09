import { ActionIcon, Tooltip, useMantineColorScheme, type MantineColorScheme } from '@mantine/core'
import { useTranslation } from 'react-i18next'

/** The order the button walks through: follow the system, then force light, then force dark. */
const NEXT: Record<MantineColorScheme, MantineColorScheme> = {
  auto: 'light',
  light: 'dark',
  dark: 'auto',
}

function SunIcon() {
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  )
}

function AutoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
    </svg>
  )
}

const ICONS: Record<MantineColorScheme, () => React.JSX.Element> = {
  auto: AutoIcon,
  light: SunIcon,
  dark: MoonIcon,
}

/**
 * Light, dark or the system's choice. Mantine keeps the choice in localStorage; the script in
 * index.html applies it before the first paint, so a dark-theme user never sees a white flash.
 */
export function ThemeToggle() {
  const { t } = useTranslation()
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const Icon = ICONS[colorScheme]
  const label = t('theme.switch', {
    current: t(`theme.${colorScheme}`),
    next: t(`theme.${NEXT[colorScheme]}`),
  })

  return (
    <Tooltip label={label}>
      <ActionIcon
        variant="default"
        size="md"
        aria-label={label}
        onClick={() => setColorScheme(NEXT[colorScheme])}
      >
        <Icon />
      </ActionIcon>
    </Tooltip>
  )
}
