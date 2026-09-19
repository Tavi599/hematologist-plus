import { Anchor, Table, Text, Title } from '@mantine/core'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Article Markdown. Tables and lists are what the articles use most, so they get Mantine styling;
 * raw HTML stays disabled (react-markdown does not render it by default).
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: text }) => (
            <Title order={2} size="h3">
              {text}
            </Title>
          ),
          h2: ({ children: text }) => (
            <Title order={3} size="h4">
              {text}
            </Title>
          ),
          p: ({ children: text }) => <Text>{text}</Text>,
          a: ({ href, children: text }) => (
            <Anchor href={href} target="_blank" rel="noreferrer">
              {text}
            </Anchor>
          ),
          table: ({ children: content }) => (
            <Table.ScrollContainer minWidth={420}>
              <Table withTableBorder withColumnBorders>
                {content}
              </Table>
            </Table.ScrollContainer>
          ),
          thead: ({ children: content }) => <Table.Thead>{content}</Table.Thead>,
          tbody: ({ children: content }) => <Table.Tbody>{content}</Table.Tbody>,
          tr: ({ children: content }) => <Table.Tr>{content}</Table.Tr>,
          th: ({ children: content }) => <Table.Th>{content}</Table.Th>,
          td: ({ children: content }) => <Table.Td>{content}</Table.Td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
