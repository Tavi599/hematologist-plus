import { act, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '../../lib/i18n'
import { renderWithProviders } from '../../test/render'
import type { Proposal } from '../../schemas/proposals'
import { ProposalsPage } from './ProposalsPage'

const state = vi.hoisted(() => ({
  user: null as { id: string; email: string } | null,
  isAdmin: false,
  proposals: [] as Proposal[],
}))

vi.mock('../../lib/auth', () => ({
  useSessionUser: () => ({ user: state.user, loading: false }),
  signIn: vi.fn(),
  isAuthConfigured: true,
}))

vi.mock('../../lib/proposals', () => ({
  useIsAdmin: () => ({ data: state.isAdmin }),
  useProposals: () => ({ data: state.proposals, isError: false, error: null }),
  useCreateProposal: () => ({ mutate: vi.fn(), isError: false, isSuccess: false }),
  useDecideProposal: () => ({ mutate: vi.fn(), isPending: false }),
}))

const proposal: Proposal = {
  id: '11111111-1111-4111-8111-111111111111',
  created_at: '2026-09-20T08:00:00Z',
  author_id: '22222222-2222-4222-8222-222222222222',
  author_email: 'colleague@example.com',
  kind: 'regimen',
  title: 'Додати DHAP',
  body: 'Потрібна схема DHAP для рецидиву.',
  status: 'new',
  decision_note: null,
  decided_at: null,
}

describe('ProposalsPage', () => {
  beforeEach(async () => {
    await act(() => i18n.changeLanguage('uk'))
    state.user = null
    state.isAdmin = false
    state.proposals = []
  })

  it('asks for a sign-in before anything can be sent', () => {
    renderWithProviders(<ProposalsPage />)
    expect(screen.getByText(/увійдіть акаунтом відділення/i)).toBeInTheDocument()
    expect(screen.queryByLabelText('Опис')).not.toBeInTheDocument()
  })

  it('warns that patient data must not be written', () => {
    state.user = { id: 'u1', email: 'colleague@example.com' }
    renderWithProviders(<ProposalsPage />)
    expect(screen.getByText(/Не вписуйте сюди дані пацієнтів/)).toBeInTheDocument()
    expect(screen.getByLabelText('Опис')).toBeInTheDocument()
    expect(screen.getByText('Мої пропозиції')).toBeInTheDocument()
  })

  it('gives the decision controls to the owner only', () => {
    state.user = { id: 'u1', email: 'colleague@example.com' }
    state.proposals = [proposal]
    const { unmount } = renderWithProviders(<ProposalsPage />)
    expect(screen.getByText('Додати DHAP')).toBeInTheDocument()
    expect(screen.queryAllByLabelText('Статус')).toHaveLength(0)
    unmount()

    state.isAdmin = true
    renderWithProviders(<ProposalsPage />)
    expect(screen.getByText('Усі пропозиції')).toBeInTheDocument()
    expect(screen.getAllByLabelText('Статус').length).toBeGreaterThan(0)
  })
})
