import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'

import { useDeveloperCoreMutations } from './page-core-mutations-hook'

const useMutationMock = vi.fn((options?: unknown) => ({ mutate: vi.fn(), isPending: false, options }))

vi.mock('@tanstack/react-query', () => ({
  useMutation: (options?: unknown) => useMutationMock(options),
}))

describe('useDeveloperCoreMutations', () => {
  beforeEach(() => {
    useMutationMock.mockClear()
  })

  it('registers all expected mutation configs', () => {
    const refetchStatus = vi.fn()
    const refetchAgents = vi.fn()
    const refetchModels = vi.fn()
    const refetchFailoverStatus = vi.fn()
    const refetchChecksLast = vi.fn()
    const refetchMissionAudit = vi.fn()
    const refetchOperatorReadiness = vi.fn()

    renderHook(() =>
      useDeveloperCoreMutations({
        setCommandResult: vi.fn(),
        setTaskPrompt: vi.fn(),
        setChatMessages: vi.fn(),
        refetchStatus,
        refetchAgents,
        refetchModels,
        refetchFailoverStatus,
        refetchChecksLast,
        refetchMissionAudit,
        refetchOperatorReadiness,
      }),
    )

    expect(useMutationMock).toHaveBeenCalledTimes(12)

    const mutationFns = useMutationMock.mock.calls
      .map((call) => call[0])
      .filter((config): config is { mutationFn: unknown; onSuccess?: () => void } => {
        if (typeof config !== 'object' || config === null) return false
        return 'mutationFn' in config
      })
    expect(mutationFns.every((entry) => typeof entry.mutationFn === 'function')).toBe(true)

    const sendTaskConfig = mutationFns[1] as { onSuccess?: () => void }
    expect(typeof sendTaskConfig.onSuccess).toBe('function')
  })

  it('clears task prompt and refetches status on sendTask success', () => {
    const setCommandResult = vi.fn()
    const setTaskPrompt = vi.fn()
    const refetchStatus = vi.fn()

    renderHook(() =>
      useDeveloperCoreMutations({
        setCommandResult,
        setTaskPrompt,
        setChatMessages: vi.fn(),
        refetchStatus,
        refetchAgents: vi.fn(),
        refetchModels: vi.fn(),
        refetchFailoverStatus: vi.fn(),
        refetchChecksLast: vi.fn(),
        refetchMissionAudit: vi.fn(),
        refetchOperatorReadiness: vi.fn(),
      }),
    )

    const sendTaskConfig = useMutationMock.mock.calls[1]?.[0] as
      | { onSuccess?: (res: unknown) => void }
      | undefined
    sendTaskConfig?.onSuccess?.({ ok: true, action: 'run_task', description: 'sync', queued: true })

    expect(setTaskPrompt).toHaveBeenCalledWith('')
    expect(setCommandResult).toHaveBeenCalledWith(expect.stringContaining('نتیجه دستور Core:'))
    expect(setCommandResult).toHaveBeenCalledWith(expect.stringContaining('action: run_task'))
    expect(refetchStatus).toHaveBeenCalledTimes(1)
  })

  it('reports sendTask error through command result setter', () => {
    const setCommandResult = vi.fn()

    renderHook(() =>
      useDeveloperCoreMutations({
        setCommandResult,
        setTaskPrompt: vi.fn(),
        setChatMessages: vi.fn(),
        refetchStatus: vi.fn(),
        refetchAgents: vi.fn(),
        refetchModels: vi.fn(),
        refetchFailoverStatus: vi.fn(),
        refetchChecksLast: vi.fn(),
        refetchMissionAudit: vi.fn(),
        refetchOperatorReadiness: vi.fn(),
      }),
    )

    const sendTaskConfig = useMutationMock.mock.calls[1]?.[0] as
      | { onError?: (err: unknown) => void }
      | undefined
    sendTaskConfig?.onError?.(new Error('task failed'))

    expect(setCommandResult).toHaveBeenCalledWith('task failed')
  })

  it('reports fallback errors for agent and model operation mutations', () => {
    const setCommandResult = vi.fn()

    renderHook(() =>
      useDeveloperCoreMutations({
        setCommandResult,
        setTaskPrompt: vi.fn(),
        setChatMessages: vi.fn(),
        refetchStatus: vi.fn(),
        refetchAgents: vi.fn(),
        refetchModels: vi.fn(),
        refetchFailoverStatus: vi.fn(),
        refetchChecksLast: vi.fn(),
        refetchMissionAudit: vi.fn(),
        refetchOperatorReadiness: vi.fn(),
      }),
    )

    const startAgentConfig = useMutationMock.mock.calls[2]?.[0] as
      | { onError?: (err: unknown) => void }
      | undefined
    const stopAgentConfig = useMutationMock.mock.calls[3]?.[0] as
      | { onError?: (err: unknown) => void }
      | undefined
    const snapshotConfig = useMutationMock.mock.calls[4]?.[0] as
      | { onError?: (err: unknown) => void }
      | undefined
    const selfCompletionConfig = useMutationMock.mock.calls[5]?.[0] as
      | { onError?: (err: unknown) => void }
      | undefined
    const activateModelConfig = useMutationMock.mock.calls[6]?.[0] as
      | { onError?: (err: unknown) => void }
      | undefined

    startAgentConfig?.onError?.({})
    stopAgentConfig?.onError?.({})
    snapshotConfig?.onError?.({})
    selfCompletionConfig?.onError?.({})
    activateModelConfig?.onError?.({})

    expect(setCommandResult).toHaveBeenNthCalledWith(1, 'خطا در شروع agent')
    expect(setCommandResult).toHaveBeenNthCalledWith(2, 'خطا در توقف agent')
    expect(setCommandResult).toHaveBeenNthCalledWith(3, 'خطا در ایجاد Snapshot')
    expect(setCommandResult).toHaveBeenNthCalledWith(4, 'خطا در اجرای self-completion')
    expect(setCommandResult).toHaveBeenNthCalledWith(5, 'خطا در فعال سازی مدل')
  })

  it('reports success output for start stop and activate model mutations', () => {
    const setCommandResult = vi.fn()
    const refetchAgents = vi.fn()
    const refetchStatus = vi.fn()
    const refetchModels = vi.fn()
    const refetchFailoverStatus = vi.fn()
    const refetchMissionAudit = vi.fn()
    const refetchOperatorReadiness = vi.fn()

    renderHook(() =>
      useDeveloperCoreMutations({
        setCommandResult,
        setTaskPrompt: vi.fn(),
        setChatMessages: vi.fn(),
        refetchStatus,
        refetchAgents,
        refetchModels,
        refetchFailoverStatus,
        refetchChecksLast: vi.fn(),
        refetchMissionAudit,
        refetchOperatorReadiness,
      }),
    )

    const startAgentConfig = useMutationMock.mock.calls[2]?.[0] as
      | { onSuccess?: (res: unknown, agentId: string) => void }
      | undefined
    const stopAgentConfig = useMutationMock.mock.calls[3]?.[0] as
      | { onSuccess?: (res: unknown, agentId: string) => void }
      | undefined
    const activateModelConfig = useMutationMock.mock.calls[6]?.[0] as
      | { onSuccess?: (res: unknown, payload: { provider: string; model_name: string }) => void }
      | undefined

    startAgentConfig?.onSuccess?.({}, 'agent-a')
    stopAgentConfig?.onSuccess?.({}, 'agent-b')
    activateModelConfig?.onSuccess?.({}, { provider: 'ollama', model_name: 'qwen3.5:9b' })

    expect(setCommandResult).toHaveBeenCalledWith(expect.stringContaining('action: start_agent'))
    expect(setCommandResult).toHaveBeenCalledWith(expect.stringContaining('action: stop_agent'))
    expect(setCommandResult).toHaveBeenCalledWith(expect.stringContaining('action: switch_model'))
    expect(setCommandResult).toHaveBeenCalledWith(expect.stringContaining('ollama / qwen3.5:9b'))

    expect(refetchAgents).toHaveBeenCalledTimes(2)
    expect(refetchStatus).toHaveBeenCalledTimes(1)
    expect(refetchModels).toHaveBeenCalledTimes(1)
    expect(refetchFailoverStatus).toHaveBeenCalledTimes(1)
    expect(refetchMissionAudit).toHaveBeenCalledTimes(1)
    expect(refetchOperatorReadiness).toHaveBeenCalledTimes(1)
  })

  it('runs checks callbacks and chat callbacks', () => {
    const setCommandResult = vi.fn()
    const setChatMessages = vi.fn()
    const refetchStatus = vi.fn()
    const refetchModels = vi.fn()
    const refetchFailoverStatus = vi.fn()
    const refetchChecksLast = vi.fn()
    const refetchMissionAudit = vi.fn()
    const refetchOperatorReadiness = vi.fn()

    renderHook(() =>
      useDeveloperCoreMutations({
        setCommandResult,
        setTaskPrompt: vi.fn(),
        setChatMessages,
        refetchStatus,
        refetchAgents: vi.fn(),
        refetchModels,
        refetchFailoverStatus,
        refetchChecksLast,
        refetchMissionAudit,
        refetchOperatorReadiness,
      }),
    )

    const runCommandConfig = useMutationMock.mock.calls[0]?.[0] as
      | { onSuccess?: (res: unknown) => void }
      | undefined
    runCommandConfig?.onSuccess?.({ ok: true, action: 'switch_model', provider: 'ollama', model: 'qwen3.5:9b' })

    const failoverCheckConfig = useMutationMock.mock.calls[8]?.[0] as
      | { onSuccess?: (res: unknown) => void }
      | undefined
    failoverCheckConfig?.onSuccess?.({
      online_healthy: true,
      failover_active: false,
      current_provider: 'ollama',
      current_model: 'qwen3.5:9b',
    })

    const quickStabilizeConfig = useMutationMock.mock.calls[9]?.[0] as
      | { onSuccess?: (res: unknown) => void }
      | undefined
    quickStabilizeConfig?.onSuccess?.({ ok: false, error: 'Unknown action: health_check' })

    const snapshotConfig = useMutationMock.mock.calls[4]?.[0] as
      | { onSuccess?: (res: unknown) => void }
      | undefined
    snapshotConfig?.onSuccess?.({ ok: true, snapshot: { id: 'snap-1' } })

    const selfCompletionConfig = useMutationMock.mock.calls[5]?.[0] as
      | { onSuccess?: (res: unknown) => void }
      | undefined
    selfCompletionConfig?.onSuccess?.({ ok: true, tasks_completed: 3, issues_found: 0, snapshot: { id: 'sc-1' } })

    const runChecksConfig = useMutationMock.mock.calls[10]?.[0] as
      | { onSuccess?: (res: unknown) => void }
      | undefined
    runChecksConfig?.onSuccess?.({ ok: true })

    const chatConfig = useMutationMock.mock.calls[11]?.[0] as
      | { onSuccess?: (res: unknown) => void; onError?: () => void }
      | undefined
    chatConfig?.onSuccess?.({ data: { reply: 'ok' } })
    chatConfig?.onError?.()

    expect(setCommandResult).toHaveBeenCalledTimes(6)
    expect(refetchChecksLast).toHaveBeenCalledTimes(1)
    expect(refetchStatus).toHaveBeenCalledTimes(5)
    expect(refetchModels).toHaveBeenCalledTimes(1)
    expect(refetchFailoverStatus).toHaveBeenCalledTimes(1)
    expect(refetchMissionAudit).toHaveBeenCalledTimes(5)
    expect(refetchOperatorReadiness).toHaveBeenCalledTimes(5)
    expect(setChatMessages).toHaveBeenCalledTimes(2)
    expect(setCommandResult).toHaveBeenCalledWith(expect.stringContaining('نتیجه دستور Core:'))
    expect(setCommandResult).toHaveBeenCalledWith(expect.stringContaining('نتیجه Health Re-check:'))
    expect(setCommandResult).toHaveBeenCalledWith(expect.stringContaining('نتیجه پایدارسازی سریع:'))
    expect(setCommandResult).toHaveBeenCalledWith(expect.stringContaining('نتیجه Snapshot:'))
    expect(setCommandResult).toHaveBeenCalledWith(expect.stringContaining('نتیجه اجرای خودتکمیل:'))
    expect(setCommandResult).toHaveBeenCalledWith(expect.stringContaining('نتیجه اجرای چک‌ها:'))
  })

  it('reports failover check error through command result setter', () => {
    const setCommandResult = vi.fn()

    renderHook(() =>
      useDeveloperCoreMutations({
        setCommandResult,
        setTaskPrompt: vi.fn(),
        setChatMessages: vi.fn(),
        refetchStatus: vi.fn(),
        refetchAgents: vi.fn(),
        refetchModels: vi.fn(),
        refetchFailoverStatus: vi.fn(),
        refetchChecksLast: vi.fn(),
        refetchMissionAudit: vi.fn(),
        refetchOperatorReadiness: vi.fn(),
      }),
    )

    const failoverCheckConfig = useMutationMock.mock.calls[8]?.[0] as
      | { onError?: (err: unknown) => void }
      | undefined
    failoverCheckConfig?.onError?.(new Error('network down'))

    expect(setCommandResult).toHaveBeenCalledWith('network down')
  })
})
