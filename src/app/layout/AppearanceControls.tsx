import { ActionIcon, Menu, Tooltip } from '@mantine/core'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'

import { PALETTES, useLayout, usePalette, type Palette } from '../../lib/appearance'
import { routes } from '../routes'

/** The colour each palette is recognised by in its menu; the accent of its light theme. */
const SWATCH: Record<Palette, string> = {
  neutral: '#868e96',
  blue: '#1b5a9c',
  sage: '#2b6a5c',
  red: '#c92a2a',
}

function PaletteIcon() {
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
      <path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.5-.2-.8-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4-4-7.4-9-7.4z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" />
      <circle cx="10" cy="7" r="1" fill="currentColor" />
      <circle cx="14.5" cy="7" r="1" fill="currentColor" />
    </svg>
  )
}

function TableIcon() {
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
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function TilesIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function Swatch({ palette }: { palette: Palette }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        borderRadius: '50%',
        background: SWATCH[palette],
      }}
    />
  )
}

/** The palette for every page: an icon that opens the list of palettes. */
export function PaletteMenu() {
  const { t } = useTranslation()
  const [palette, setPalette] = usePalette()
  const label = t('appearance.palette', { current: t(`appearance.paletteName.${palette}`) })

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Tooltip label={label}>
          <ActionIcon variant="default" size="md" aria-label={label}>
            <PaletteIcon />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        {PALETTES.map((key) => (
          <Menu.Item
            key={key}
            leftSection={<Swatch palette={key} />}
            onClick={() => setPalette(key)}
            fw={key === palette ? 700 : undefined}
            aria-current={key === palette ? 'true' : undefined}
          >
            {t(`appearance.paletteName.${key}`)}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}

/**
 * Table or tiles for the reference lists. Shown only on the pages it changes, so a press never
 * seems to do nothing.
 */
export function LayoutToggle() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [layout, setLayout] = useLayout()
  if (pathname !== routes.diseases && pathname !== routes.scores) return null

  const next = layout === 'table' ? 'tiles' : 'table'
  const label = t('appearance.layout', {
    current: t(`appearance.layoutName.${layout}`),
    next: t(`appearance.layoutName.${next}`),
  })

  return (
    <Tooltip label={label}>
      <ActionIcon variant="default" size="md" aria-label={label} onClick={() => setLayout(next)}>
        {layout === 'table' ? <TableIcon /> : <TilesIcon />}
      </ActionIcon>
    </Tooltip>
  )
}
