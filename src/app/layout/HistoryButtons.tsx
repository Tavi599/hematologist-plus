import { ActionIcon, Group, Tooltip } from '@mantine/core'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useNavigationType } from 'react-router'

import { readTrail, stepTrail, writeTrail, type Trail } from './history-trail'

function Arrow({ back }: { back: boolean }) {
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
      <path d={back ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}

/**
 * Back and forward, as in a browser. Installed as an app the page opens in a window with no
 * browser bar, so without these the only way back was through the menu from the start.
 */
export function HistoryButtons() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const type = useNavigationType()
  const [trail, setTrail] = useState<Trail>(() => stepTrail(readTrail(), location.key, type))

  // A navigation moves the trail during render, the way React suggests for state derived from props.
  const next = stepTrail(trail, location.key, type)
  if (next !== trail) setTrail(next)

  useEffect(() => writeTrail(trail), [trail])

  const canBack = trail.pos > 0
  const canForward = trail.pos < trail.keys.length - 1

  return (
    <Group gap={4} wrap="nowrap">
      <Tooltip label={t('nav.back')}>
        <ActionIcon
          variant="default"
          size="md"
          aria-label={t('nav.back')}
          disabled={!canBack}
          onClick={() => void navigate(-1)}
        >
          <Arrow back />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={t('nav.forward')}>
        <ActionIcon
          variant="default"
          size="md"
          aria-label={t('nav.forward')}
          disabled={!canForward}
          onClick={() => void navigate(1)}
        >
          <Arrow back={false} />
        </ActionIcon>
      </Tooltip>
    </Group>
  )
}
