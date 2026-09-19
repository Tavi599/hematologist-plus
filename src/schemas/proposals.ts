import { z } from 'zod'

import { nonEmptyTextSchema } from './common'

/** What a colleague is asking for. */
export const PROPOSAL_KINDS = ['regimen', 'drug', 'disease', 'article', 'bug', 'other'] as const
export const proposalKindSchema = z.enum(PROPOSAL_KINDS)

/** Where the proposal stands; only the owner of the project moves it. */
export const PROPOSAL_STATUSES = ['new', 'accepted', 'in_progress', 'done', 'declined'] as const
export const proposalStatusSchema = z.enum(PROPOSAL_STATUSES)

/**
 * A row of `public.proposals`. A colleague reads their own rows, the owner reads them all;
 * see the RLS policies in the migration. Nothing about a patient may be written here.
 */
export const proposalRowSchema = z.object({
  id: z.uuid(),
  created_at: z.string(),
  author_id: z.uuid(),
  author_email: nonEmptyTextSchema,
  kind: proposalKindSchema,
  title: nonEmptyTextSchema,
  body: nonEmptyTextSchema,
  status: proposalStatusSchema,
  decision_note: z.string().nullable(),
  decided_at: z.string().nullable(),
})

export type Proposal = z.infer<typeof proposalRowSchema>
export type ProposalKind = (typeof PROPOSAL_KINDS)[number]
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number]

/** What the form sends; the rest of the row is filled by the database and the session. */
export const proposalDraftSchema = z.object({
  kind: proposalKindSchema,
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(10).max(5000),
})

export type ProposalDraft = z.infer<typeof proposalDraftSchema>
