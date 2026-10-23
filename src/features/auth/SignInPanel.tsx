import { Alert, Button, Card, PasswordInput, Stack, Text, TextInput } from '@mantine/core'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import { signIn } from '../../lib/auth'

/**
 * Sign-in for the department: article text and the proposals window are behind it. `bare` drops
 * the card and the heading for a dialog that carries its own.
 */
export function SignInPanel({ reason, bare = false }: { reason?: string; bare?: boolean } = {}) {
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

  const form = (
    <form onSubmit={submit}>
      <Stack gap="sm" maw={420}>
        {!bare && <Text fw={500}>{t('auth.title')}</Text>}
        <Text size="sm" c="dimmed">
          {reason ?? t('auth.hint')}
        </Text>
        {error !== null && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}
        <TextInput
          label={t('auth.email')}
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
          data-autofocus
        />
        <PasswordInput
          label={t('auth.password')}
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
        />
        <Button type="submit" loading={busy} style={{ alignSelf: 'flex-start' }}>
          {t('auth.signIn')}
        </Button>
      </Stack>
    </form>
  )

  if (bare) return form
  return (
    <Card withBorder component="section">
      {form}
    </Card>
  )
}
