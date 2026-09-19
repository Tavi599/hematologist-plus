import { Alert, Button, Card, Group, PasswordInput, Stack, Text, TextInput } from '@mantine/core'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { signIn } from '../../lib/auth'

/** Sign-in for the department: the only thing behind it is the article text. */
export function SignInPanel() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    signIn(email.trim(), password)
      .catch((cause: unknown) => setError((cause as Error).message))
      .finally(() => setBusy(false))
  }

  return (
    <Card withBorder component="section">
      <form onSubmit={submit}>
        <Stack gap="sm">
          <Text fw={500}>{t('auth.title')}</Text>
          <Text size="sm" c="dimmed">
            {t('auth.hint')}
          </Text>
          {error !== null && (
            <Alert color="red" variant="light">
              {error}
            </Alert>
          )}
          <Group align="flex-end" wrap="wrap">
            <TextInput
              label={t('auth.email')}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
            />
            <PasswordInput
              label={t('auth.password')}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
            />
            <Button type="submit" loading={busy}>
              {t('auth.signIn')}
            </Button>
          </Group>
        </Stack>
      </form>
    </Card>
  )
}
