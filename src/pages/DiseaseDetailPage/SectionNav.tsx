import { Affix, Button, Group, Transition } from '@mantine/core'
import { useWindowScroll } from '@mantine/hooks'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import classes from './SectionNav.module.css'

export interface NavSection {
  /** Id of the element on the page the item scrolls to. */
  id: string
  label: string
}

/** Below this the reader is still at the top and needs no way back to it. */
const BACK_TO_TOP_AFTER = 800
/** How far under the window top a section counts as the one being read: header plus this bar. */
const READING_LINE = 120

/**
 * The page's own sections in a bar that stays under the header: a disease page runs to dozens of
 * screens, and the reader jumps between lines of treatment and the article instead of scrolling.
 * The section being read is marked, so the bar also says where on the page the reader is.
 */
export function SectionNav({
  sections,
  onSelect,
  allOpen,
  onToggleAll,
}: {
  sections: readonly NavSection[]
  /** Called before the scroll, so a folded line can open first. */
  onSelect?: (id: string) => void
  allOpen: boolean
  onToggleAll: () => void
}) {
  const { t } = useTranslation()
  const [scroll, scrollTo] = useWindowScroll()
  const bar = useRef<HTMLDivElement>(null)

  // The last section whose top has passed the reading line is the one on screen.
  let active: string | undefined
  for (const section of sections) {
    const element = document.getElementById(section.id)
    if (element && element.getBoundingClientRect().top <= READING_LINE) active = section.id
  }
  if (scroll.y === 0) active = undefined

  // On a phone the bar scrolls sideways; the marked section is kept in sight.
  useEffect(() => {
    const container = bar.current
    const button = container?.querySelector<HTMLElement>('[data-active="true"]')
    if (!container || !button) return
    const shown = container.getBoundingClientRect()
    const marked = button.getBoundingClientRect()
    if (marked.left < shown.left || marked.right > shown.right)
      container.scrollLeft += marked.left - shown.left - 16
  }, [active])

  const select = (id: string) => {
    onSelect?.(id)
    // After the opened line has rendered, or the scroll stops short of where it now is.
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  return (
    <>
      <nav aria-label={t('diseaseDetail.sections')} className={classes.bar}>
        <Group gap={4} wrap="nowrap" ref={bar} className={classes.scroller}>
          {sections.map((section) => (
            <Button
              key={section.id}
              size="compact-sm"
              variant={section.id === active ? 'light' : 'subtle'}
              color={section.id === active ? undefined : 'gray'}
              data-active={section.id === active}
              aria-current={section.id === active ? 'location' : undefined}
              onClick={() => select(section.id)}
              className={classes.item}
            >
              {section.label}
            </Button>
          ))}
          <Button
            size="compact-sm"
            variant="default"
            onClick={onToggleAll}
            className={classes.item}
            ml="auto"
          >
            {allOpen ? t('diseaseDetail.collapseAll') : t('diseaseDetail.expandAll')}
          </Button>
        </Group>
      </nav>
      <Affix position={{ bottom: 72, right: 16 }}>
        <Transition transition="slide-up" mounted={scroll.y > BACK_TO_TOP_AFTER}>
          {(style) => (
            <Button
              style={style}
              size="sm"
              variant="filled"
              radius="xl"
              onClick={() => scrollTo({ y: 0 })}
              aria-label={t('diseaseDetail.backToTop')}
              title={t('diseaseDetail.backToTop')}
            >
              ↑
            </Button>
          )}
        </Transition>
      </Affix>
    </>
  )
}
