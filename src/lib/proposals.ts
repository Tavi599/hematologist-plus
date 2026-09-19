import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  proposalRowSchema,
  type Proposal,
  type ProposalDraft,
  type ProposalStatus,
} from '../schemas/proposals'
import type { SessionUser } from './auth'
import { supabase } from './supabase'

/** Never persisted to IndexedDB: proposals belong to the session that is signed in. */
export const PROPOSALS_QUERY_ROOT = 'proposals'

/**
 * Whether the signed-in user may review proposals. The answer comes from the database, not from
 * the fact of being signed in: membership of `admins` is granted by hand.
 */
export function useIsAdmin(user: SessionUser | null) {
  return useQuery({
    queryKey: [PROPOSALS_QUERY_ROOT, 'admin', user?.id ?? null],
    enabled: user !== null && supabase !== null,
    gcTime: 0,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase!.from('admins').select('user_id').limit(1)
      if (error) throw new Error(error.message)
      return data.length > 0
    },
  })
}

/**
 * The proposals this user may see: their own, or all of them for the owner of the project.
 * Which of the two it is comes from the row-level policy, not from the query.
 */
export function useProposals(user: SessionUser | null) {
  return useQuery({
    queryKey: [PROPOSALS_QUERY_ROOT, 'list', user?.id ?? null],
    enabled: user !== null && supabase !== null,
    gcTime: 0,
    queryFn: async (): Promise<Proposal[]> => {
      const { data, error } = await supabase!
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data.map((row) => proposalRowSchema.parse(row))
    },
  })
}

export function useCreateProposal(user: SessionUser | null) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (draft: ProposalDraft) => {
      if (!supabase || !user) throw new Error('Not signed in')
      const { error } = await supabase
        .from('proposals')
        .insert({ ...draft, author_id: user.id, author_email: user.email })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: [PROPOSALS_QUERY_ROOT] }),
  })
}

export interface Decision {
  id: string
  status: ProposalStatus
  note: string
}

/** Only an admin can do this; for anyone else the row simply does not update. */
export function useDecideProposal() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, note }: Decision) => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { error } = await supabase
        .from('proposals')
        .update({
          status,
          decision_note: note.trim() === '' ? null : note.trim(),
          decided_at: new Date().toISOString(),
        })
        .eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => client.invalidateQueries({ queryKey: [PROPOSALS_QUERY_ROOT] }),
  })
}
