/**
 * The contents of an article: its own headings, in the order they are written.
 *
 * An article on a nosology runs to several screens — diagnosis, staging, treatment, course — and
 * the physician usually wants one of them, not the whole thing. The list is built from the
 * Markdown itself, so an article that gains a section gains a line in its contents with it.
 */

export interface Heading {
  /** 1 for `#`, 2 for `##`, 3 for `###`; deeper headings are left out of the contents. */
  level: number
  text: string
  /** Id of the rendered heading the contents scrolls to. */
  id: string
}

const HEADING = /^(#{1,3})\s+(.+?)\s*#*$/
const FENCE = /^\s*(```|~~~)/

export function articleHeadings(markdown: string): Heading[] {
  const headings: Heading[] = []
  let fenced = false

  for (const line of markdown.split('\n')) {
    if (FENCE.test(line)) {
      fenced = !fenced
      continue
    }
    if (fenced) continue
    const match = HEADING.exec(line)
    if (!match) continue

    const text = match[2]!.trim()
    // Two sections written with the same heading share an id, and the contents takes the reader
    // to the first of them. An article does not usually have two, and a wrong anchor is a worse
    // answer than the obvious one.
    headings.push({ level: match[1]!.length, text, id: headingId(text) })
  }
  return headings
}

/**
 * The id a heading is reached by. Ukrainian headings keep their letters: the id is never shown,
 * and a transliteration would only make two different headings collide more often.
 */
export function headingId(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[*_`~]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\p{L}\p{N}-]/gu, '') || 'section'
  )
}

/** The text of a rendered heading, whatever React handed its children as. */
export function headingText(children: unknown): string {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(headingText).join('')
  if (children !== null && typeof children === 'object' && 'props' in children) {
    return headingText((children as { props: { children?: unknown } }).props.children)
  }
  return ''
}
