import { Alert, Button, Code, Container, Stack, Text } from '@mantine/core'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { withTranslation, type WithTranslation } from 'react-i18next'

import { clearPersistedCatalog } from '../lib/query-persistence'

interface State {
  error: Error | null
}

/**
 * Last line of defence: a crash inside the tree would otherwise leave a blank page, with no way
 * for the physician to tell whether the tool is broken or the data is. The saved offline copy is
 * the usual suspect after an update, so recovery offers to drop it and start over.
 */
class ErrorBoundary extends Component<WithTranslation & { children: ReactNode }, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // No patient data is ever in these messages; the calculation runs on component state only.
    console.error('Unhandled error', error, info.componentStack)
  }

  override render(): ReactNode {
    const { error } = this.state
    const { t } = this.props
    if (!error) return this.props.children

    return (
      <Container size="sm" py="xl">
        <Alert color="red" title={t('error.title')}>
          <Stack gap="sm" align="flex-start">
            <Text size="sm">{t('error.body')}</Text>
            <Code block>{error.message}</Code>
            <Button
              onClick={() => {
                void clearPersistedCatalog().finally(() => window.location.reload())
              }}
            >
              {t('error.reset')}
            </Button>
          </Stack>
        </Alert>
      </Container>
    )
  }
}

export const AppErrorBoundary = withTranslation()(ErrorBoundary)
