import { describe, expect, it } from 'vitest'

import { articleHeadings, headingId, headingText } from './headings'

describe('articleHeadings', () => {
  it('reads the headings of an article in the order they are written', () => {
    const markdown = [
      '# Діагностика',
      'текст',
      '## Лабораторні дані',
      '### Кістковий мозок',
      '#### Проточна цитометрія',
      '## Лікування',
    ].join('\n')

    expect(articleHeadings(markdown)).toEqual([
      { level: 1, text: 'Діагностика', id: 'діагностика' },
      { level: 2, text: 'Лабораторні дані', id: 'лабораторні-дані' },
      { level: 3, text: 'Кістковий мозок', id: 'кістковий-мозок' },
      { level: 2, text: 'Лікування', id: 'лікування' },
    ])
  })

  it('does not take a comment in a code block for a heading', () => {
    const markdown = ['# Схема', '```', '# це код, а не заголовок', '```', '## Дози'].join('\n')
    expect(articleHeadings(markdown).map((heading) => heading.text)).toEqual(['Схема', 'Дози'])
  })

  it('finds nothing in an article with no headings', () => {
    expect(articleHeadings('просто абзац тексту')).toEqual([])
  })

  it('strips the emphasis and the punctuation a heading is written with', () => {
    expect(headingId('**Лікування:** перша лінія')).toBe('лікування-перша-лінія')
    expect(headingId('???')).toBe('section')
  })
})

describe('headingText', () => {
  it('reads the text out of whatever the renderer hands it', () => {
    expect(headingText('Діагностика')).toBe('Діагностика')
    expect(headingText(['Перша ', { props: { children: 'лінія' } }])).toBe('Перша лінія')
    expect(headingText(null)).toBe('')
  })
})
