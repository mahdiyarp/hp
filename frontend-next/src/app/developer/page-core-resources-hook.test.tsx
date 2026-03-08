import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'

import { formatFailoverCheckResult } from './page-mutation-logic'
import { useDeveloperCoreResources } from './page-core-resources-hook'

const queriesReturn = {
  status: { status: 'online' },
  statusLoading: false,
  refetchStatus: vi.fn(),
  agentsData: { agents: [] },
  agentsLoading: false,
  refetchAgents: vi.fn(),
  activityData: { activities: [] },
  snapshotsData: { snapshots: [] },
  modelsData: undefined,
  refetchModels: vi.fn(),
  failoverStatusData: undefined,
  refetchFailoverStatus: vi.fn(),
  checksLastData: undefined,
  refetchChecksLast: vi.fn(),
  missionAuditData: undefined,
  refetchMissionAudit: vi.fn(),
  operatorReadinessData: undefined,
  refetchOperatorReadiness: vi.fn(),
  selfCompletionData: undefined,
  taskGraphData: undefined,
}

const mutationsReturn = {
  runCommandMutation: { mutate: vi.fn(), isPending: false },
  sendTaskMutation: { mutate: vi.fn(), isPending: false },
  startAgentMutation: { mutate: vi.fn(), isPending: false },
  stopAgentMutation: { mutate: vi.fn(), isPending: false },
  snapshotMutation: { mutate: vi.fn(), isPending: false },
  runSelfCompletionMutation: { mutate: vi.fn(), isPending: false },
  activateModelMutation: { mutate: vi.fn(), isPending: false },
  runAiHpBootstrapMutation: { mutate: vi.fn(), isPending: false },
  runFailoverCheckMutation: { mutate: vi.fn(), isPending: false },
  quickStabilizeMutation: { mutate: vi.fn(), isPending: false },
  runChecksMutation: { mutate: vi.fn(), isPending: false },
  chatMutation: { mutate: vi.fn(), isPending: false },
}

const useDeveloperCoreQueriesMock = vi.fn(() => queriesReturn)
const useDeveloperCoreMutationsMock = vi.fn((_input: unknown) => {
  return mutationsReturn
})

vi.mock('./page-core-queries-hook', () => ({
  useDeveloperCoreQueries: () => useDeveloperCoreQueriesMock(),
}))

vi.mock('./page-core-mutations-hook', () => ({
  useDeveloperCoreMutations: (input: unknown) => useDeveloperCoreMutationsMock(input),
}))

describe('useDeveloperCoreResources', () => {
  beforeEach(() => {
    useDeveloperCoreQueriesMock.mockClear()
    useDeveloperCoreMutationsMock.mockClear()
  })

  it('combines query and mutation resources and wires refetch callbacks', () => {
    const setCommandResult = vi.fn()
    const setTaskPrompt = vi.fn()
    const setChatMessages = vi.fn()

    const { result } = renderHook(() =>
      useDeveloperCoreResources({
        setCommandResult,
        setTaskPrompt,
        setChatMessages,
      }),
    )

    expect(useDeveloperCoreQueriesMock).toHaveBeenCalledTimes(1)
    expect(useDeveloperCoreMutationsMock).toHaveBeenCalledTimes(1)
    expect(useDeveloperCoreMutationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        setCommandResult,
        setTaskPrompt,
        setChatMessages,
        refetchStatus: expect.any(Function),
        refetchAgents: expect.any(Function),
        refetchModels: expect.any(Function),
        refetchFailoverStatus: expect.any(Function),
        refetchChecksLast: expect.any(Function),
        refetchMissionAudit: expect.any(Function),
        refetchOperatorReadiness: expect.any(Function),
      }),
    )

    const mutationInput = useDeveloperCoreMutationsMock.mock.calls[0]?.[0] as
      | {
          refetchStatus: () => void
          refetchAgents: () => void
          refetchModels: () => void
          refetchFailoverStatus: () => void
          refetchChecksLast: () => void
          refetchMissionAudit: () => void
          refetchOperatorReadiness: () => void
        }
      | undefined

    mutationInput?.refetchStatus()
    mutationInput?.refetchAgents()
    mutationInput?.refetchModels()
    mutationInput?.refetchFailoverStatus()
    mutationInput?.refetchChecksLast()
    mutationInput?.refetchMissionAudit()
    mutationInput?.refetchOperatorReadiness()

    expect(queriesReturn.refetchStatus).toHaveBeenCalledTimes(1)
    expect(queriesReturn.refetchAgents).toHaveBeenCalledTimes(1)
    expect(queriesReturn.refetchModels).toHaveBeenCalledTimes(1)
    expect(queriesReturn.refetchFailoverStatus).toHaveBeenCalledTimes(1)
    expect(queriesReturn.refetchChecksLast).toHaveBeenCalledTimes(1)
    expect(queriesReturn.refetchMissionAudit).toHaveBeenCalledTimes(1)
    expect(queriesReturn.refetchOperatorReadiness).toHaveBeenCalledTimes(1)

    expect(result.current.status).toEqual({ status: 'online' })
    expect(result.current.runCommandMutation).toBe(mutationsReturn.runCommandMutation)
  })

  it('formats failover check summary for operator-facing output', () => {
    const output = formatFailoverCheckResult({
      online_healthy: true,
      failover_active: false,
      current_provider: 'ollama',
      current_model: 'qwen3.5:9b',
    })

    expect(output).toContain('نتیجه Health Re-check:')
    expect(output).toContain('سلامت آنلاین: سالم')
  })

  it('covers additional failover formatter branches used by core quality gate', () => {
    const failoverActive = formatFailoverCheckResult({
      data: {
        online_healthy: false,
        failover_active: true,
        current_provider: 'ai_hp',
        current_model: 'fallback-model',
        original_provider: 'openrouter',
        original_model: 'openrouter/auto',
      },
    })
    expect(failoverActive).toContain('وضعیت failover: فعال')
    expect(failoverActive).toContain('مدل اصلی ثبت شده: openrouter / openrouter/auto')

    const recoveredOnline = formatFailoverCheckResult({
      online_healthy: true,
      failover_active: true,
      current_provider: 'ollama',
      current_model: 'fallback-model',
    })
    expect(recoveredOnline).toContain('مسیر آنلاین سالم شده است')

    expect(formatFailoverCheckResult({ ok: true })).toBe('{\n  "ok": true\n}')
    expect(formatFailoverCheckResult(null)).toBe('null')
  })
})
