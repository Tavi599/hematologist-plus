import { Anchor, Stack, Text } from '@mantine/core'
import { useTranslation } from 'react-i18next'

import { articleHeadings } from './headings'

/**
 * The contents of the article on screen. The links scroll rather than navigate: the site runs on
 * a hash router, where an ordinary `#section` link would be read as a change of page.
 */
export function ArticleContents({ markdown }: { markdown: string }) {
  const { t } = useTranslation()
  const headings = articleHeadings(markdown)
  // One heading is a title, not a contents.
  if (headings.length < 2) return null

  return (
    <Stack gap={2} component="nav" aria-label={t('diseaseDetail.contents')}>
      <Text size="sm" fw={600}>
        {t('diseaseDetail.contents')}
      </Text>
      {headings.map((heading) => (
        <Anchor
          key={`${heading.id}-${heading.text}`}
          component="button"
          type="button"
          size="sm"
          ta="left"
          ml={(heading.level - 1) * 12}
          onClick={() =>
            document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          {heading.text}
        </Anchor>
      ))}
    </Stack>
  )
}
