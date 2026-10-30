import { SegmentedControl, Tooltip } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { HANDBOOK_VIEWS, type HandbookView } from './handbook-view'

/**
 * Ukrainian / original / both. `onBeforeChange` is called before the text is
 * replaced, so the page can note which paragraph the reader is on. It is called
 * on mousedown rather than on the change itself: clicking focuses the radio
 * button, and the browser scrolls a newly focused control into view — by the
 * time the change event arrives, the page has already jumped and there is no
 * reading place left to note.
 */
export function HandbookViewSwitch({
  value,
  onChange,
  onBeforeChange,
}: {
  value: HandbookView
  onChange: (value: HandbookView) => void
  onBeforeChange?: () => void
}) {
  const { t } = useTranslation()
  return (
    <Tooltip label={t('handbook.viewHint')} withArrow multiline w={260}>
      <SegmentedControl
        size="xs"
        value={value}
        onMouseDownCapture={() => onBeforeChange?.()}
        onKeyDownCapture={() => onBeforeChange?.()}
        onChange={(next) => {
          onBeforeChange?.()
          onChange(next as HandbookView)
        }}
        data={HANDBOOK_VIEWS.map((view) => ({
          value: view,
          label: t(`handbook.view.${view}` as 'handbook.view.uk'),
        }))}
        aria-label={t('handbook.viewLabel')}
      />
    </Tooltip>
  )
}
