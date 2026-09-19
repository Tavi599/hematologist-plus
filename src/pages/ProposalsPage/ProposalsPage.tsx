import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { SignInPanel } from '../../features/auth/SignInPanel'
import { useSessionUser } from '../../lib/auth'
import { formatDate } from '../../lib/format'
import { currentLanguage, type DynamicTranslate } from '../../lib/i18n'
import { useCreateProposal, useDecideProposal, useIsAdmin, useProposals } from '../../lib/proposals'
import {
  PROPOSAL_KINDS,
  PROPOSAL_STATUSES,
  proposalDraftSchema,
  type Proposal,
  type ProposalKind,
  type ProposalStatus,
} from '../../schemas/proposals'

const STATUS_COLOR: Record<ProposalStatus, string> = {
  new: 'blue',
  accepted: 'teal',
  in_progress: 'yellow',
  done: 'green',
  declined: 'gray',
}

/** Where colleagues ask for what the catalog is missing, and the owner answers. */
export function ProposalsPage() {
  const { t } = useTranslation()
  const { user, loading } = useSessionUser()

  return (
    <Stack>
      <Title order={1}>{t('proposals.title')}</Title>
      <Text c="dimmed">{t('proposals.intro')}</Text>
      {user === null ? (
        loading ? null : (
          <SignInPanel reason={t('proposals.signInReason')} />
        )
      ) : (
        <SignedIn />
      )}
    </Stack>
  )
}

function SignedIn() {
  const { t } = useTranslation()
  const { user } = useSessionUser()
  const isAdmin = useIsAdmin(user).data ?? false
  const proposals = useProposals(user)

  return (
    <>
      <ProposalForm />
      {proposals.isError && <Alert color="red">{(proposals.error as Error).message}</Alert>}
      <Stack gap="sm">
        <Title order={2} size="h4">
          {isAdmin ? t('proposals.listAll') : t('proposals.listMine')}
        </Title>
        {proposals.data?.length === 0 && <Text c="dimmed">{t('proposals.empty')}</Text>}
        {proposals.data?.map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} isAdmin={isAdmin} />
        ))}
      </Stack>
    </>
  )
}

function ProposalForm() {
  const { t } = useTranslation()
  const tu = t as unknown as DynamicTranslate
  const { user } = useSessionUser()
  const create = useCreateProposal(user)
  const [kind, setKind] = useState<ProposalKind>('regimen')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const draft = proposalDraftSchema.safeParse({ kind, title, body })

  const submit = () => {
    if (!draft.success) return
    create.mutate(draft.data, {
      onSuccess: () => {
        setTitle('')
        setBody('')
      },
    })
  }

  return (
    <Card withBorder component="section">
      <Stack gap="sm">
        <Title order={2} size="h4">
          {t('proposals.newTitle')}
        </Title>
        <Alert color="yellow" variant="light">
          {t('proposals.noPatientData')}
        </Alert>
        <Select
          label={t('proposals.kind')}
          allowDeselect={false}
          data={PROPOSAL_KINDS.map((value) => ({ value, label: tu(`proposals.kinds.${value}`) }))}
          value={kind}
          onChange={(value) => setKind((value as ProposalKind | null) ?? 'other')}
          w={220}
        />
        <TextInput
          label={t('proposals.subject')}
          value={title}
          onChange={(event) => setTitle(event.currentTarget.value)}
          maxLength={200}
        />
        <Textarea
          label={t('proposals.body')}
          description={t('proposals.bodyHint')}
          rows={4}
          maxLength={5000}
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
        />
        {create.isError && <Alert color="red">{(create.error as Error).message}</Alert>}
        {create.isSuccess && <Alert color="green">{t('proposals.sent')}</Alert>}
        <Group>
          <Button onClick={submit} disabled={!draft.success || create.isPending}>
            {t('proposals.send')}
          </Button>
        </Group>
      </Stack>
    </Card>
  )
}

function ProposalCard({ proposal, isAdmin }: { proposal: Proposal; isAdmin: boolean }) {
  const { t } = useTranslation()
  const tu = t as unknown as DynamicTranslate
  const language = currentLanguage()
  const decide = useDecideProposal()
  const [status, setStatus] = useState<ProposalStatus>(proposal.status)
  const [note, setNote] = useState(proposal.decision_note ?? '')

  return (
    <Card withBorder>
      <Stack gap="xs">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Text fw={500}>{proposal.title}</Text>
          <Group gap="xs">
            <Badge variant="light">{tu(`proposals.kinds.${proposal.kind}`)}</Badge>
            <Badge color={STATUS_COLOR[proposal.status]}>
              {tu(`proposals.statuses.${proposal.status}`)}
            </Badge>
          </Group>
        </Group>
        <Text size="xs" c="dimmed">
          {proposal.author_email} · {formatDate(proposal.created_at.slice(0, 10), language)}
        </Text>
        <Text style={{ whiteSpace: 'pre-wrap' }}>{proposal.body}</Text>
        {proposal.decision_note && !isAdmin && (
          <Alert color="blue" variant="light" title={t('proposals.decision')}>
            {proposal.decision_note}
          </Alert>
        )}
        {isAdmin && (
          <Group align="flex-end" wrap="wrap" gap="sm">
            <Select
              label={t('proposals.status')}
              allowDeselect={false}
              w={200}
              data={PROPOSAL_STATUSES.map((value) => ({
                value,
                label: tu(`proposals.statuses.${value}`),
              }))}
              value={status}
              onChange={(value) => setStatus((value as ProposalStatus | null) ?? 'new')}
            />
            <TextInput
              label={t('proposals.decision')}
              style={{ flex: 1, minWidth: 220 }}
              value={note}
              onChange={(event) => setNote(event.currentTarget.value)}
            />
            <Button
              variant="light"
              loading={decide.isPending}
              onClick={() => decide.mutate({ id: proposal.id, status, note })}
            >
              {t('proposals.save')}
            </Button>
          </Group>
        )}
      </Stack>
    </Card>
  )
}
