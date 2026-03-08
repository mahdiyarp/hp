import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'

import { useDeveloperInteractionHandlers } from './page-interaction-handlers-hook'

const executeChatSendMock = vi.fn((args?: unknown) => args)
const executeCommandRunMock = vi.fn((args?: unknown) => args)
const executeTaskSendMock = vi.fn((args?: unknown) => args)
const executeModelSwitchMock = vi.fn((args?: unknown) => args)
const executeAgentToggleMock = vi.fn((args?: unknown) => args)
const runGroupedRefetchMock = vi.fn((args?: unknown) => args)

vi.mock('./page-handler-logic', () => ({
  executeChatSend: (args?: unknown) => executeChatSendMock(args),
  executeCommandRun: (args?: unknown) => executeCommandRunMock(args),
  executeTaskSend: (args?: unknown) => executeTaskSendMock(args),
  executeModelSwitch: (args?: unknown) => executeModelSwitchMock(args),
  executeAgentToggle: (args?: unknown) => executeAgentToggleMock(args),
}))

vi.mock('./page-orchestration-logic', () => ({
  runGroupedRefetch: (args?: unknown) => runGroupedRefetchMock(args),
}))

describe('useDeveloperInteractionHandlers', () => {
  beforeEach(() => {
    executeChatSendMock.mockClear()
    executeCommandRunMock.mockClear()
    executeTaskSendMock.mockClear()
    executeModelSwitchMock.mockClear()
    executeAgentToggleMock.mockClear()
    runGroupedRefetchMock.mockClear()
  })

  it('wires interaction handlers to execution helpers and mutations', () => {
    const chatMutation = { mutate: vi.fn(), isPending: false }
    const runCommandMutation = { mutate: vi.fn(), isPending: false }
    const sendTaskMutation = { mutate: vi.fn(), isPending: false }
    const activateModelMutation = { mutate: vi.fn(), isPending: false }
    const startAgentMutation = { mutate: vi.fn(), isPending: false }
    const stopAgentMutation = { mutate: vi.fn(), isPending: false }
    const runSelfCompletionMutation = { mutate: vi.fn(), isPending: false }
    const runAiHpBootstrapMutation = { mutate: vi.fn(), isPending: false }
    const runFailoverCheckMutation = { mutate: vi.fn(), isPending: false }
    const snapshotMutation = { mutate: vi.fn(), isPending: false }
    const quickStabilizeMutation = { mutate: vi.fn(), isPending: false }
    const runChecksMutation = { mutate: vi.fn(), isPending: false }
    const refetchStatus = vi.fn()
    const refetchAgents = vi.fn()
    const refetchModels = vi.fn()
    const refetchFailoverStatus = vi.fn()
    const refetchChecksLast = vi.fn()
    const refetchMissionAudit = vi.fn()
    const refetchOperatorReadiness = vi.fn()
    const setChatMessages = vi.fn()
    const setChatInput = vi.fn()
    const setTaskPrompt = vi.fn()
    const setActiveModel = vi.fn()

    const { result } = renderHook(() =>
      useDeveloperInteractionHandlers({
        chatInput: 'hello',
        taskPrompt: 'run task',
        command: 'ping',
        activeModel: { provider: 'ai_hp', model_name: 'qwen3.5:9b' },
        chatMutation,
        runCommandMutation,
        sendTaskMutation,
        activateModelMutation,
        startAgentMutation,
        stopAgentMutation,
        refetchStatus,
        refetchAgents,
        refetchModels,
        refetchFailoverStatus,
        refetchChecksLast,
        refetchMissionAudit,
        refetchOperatorReadiness,
        setChatMessages,
        setChatInput,
        setTaskPrompt,
        setActiveModel,
        runSelfCompletionMutation,
        runAiHpBootstrapMutation,
        runFailoverCheckMutation,
        snapshotMutation,
        quickStabilizeMutation,
        runChecksMutation,
      }),
    )

    result.current.handleChatSend()
    result.current.handleRunCommand()
    result.current.handleSendTask()
    result.current.handleSwitchModel('ai_hp', 'gemma3:4b')
    result.current.handleRefreshAll()
    result.current.handleToggleAgent('agent-1', false)
    result.current.runSelfCompletion()
    result.current.runAiHpBootstrap()
    result.current.runFailoverCheck()
    result.current.createSnapshot()
    result.current.quickStabilize()
    result.current.runChecks()
    result.current.runDeepChecks()

    expect(executeChatSendMock).toHaveBeenCalledTimes(1)
    expect(executeCommandRunMock).toHaveBeenCalledTimes(1)
    expect(executeTaskSendMock).toHaveBeenCalledTimes(1)
    expect(executeModelSwitchMock).toHaveBeenCalledTimes(1)
    expect(executeAgentToggleMock).toHaveBeenCalledTimes(1)
    expect(runGroupedRefetchMock).toHaveBeenCalledWith([
      refetchStatus,
      refetchAgents,
      refetchModels,
      refetchFailoverStatus,
      refetchChecksLast,
      refetchMissionAudit,
      refetchOperatorReadiness,
    ])

    const chatArgs = executeChatSendMock.mock.calls[0]?.[0] as { mutateChat: (message: string) => void } | undefined
    chatArgs?.mutateChat('x')
    expect(chatMutation.mutate).toHaveBeenCalledWith('x')

    const modelArgs = executeModelSwitchMock.mock.calls[0]?.[0] as
      | { activateModel: (model: { provider: string; model_name: string }) => void }
      | undefined
    modelArgs?.activateModel({ provider: 'ai_hp', model_name: 'gemma3:4b' })
    expect(activateModelMutation.mutate).toHaveBeenCalledWith({ provider: 'ai_hp', model_name: 'gemma3:4b' })

    const toggleArgs = executeAgentToggleMock.mock.calls[0]?.[0] as
      | { startAgent: (id: string) => void; stopAgent: (id: string) => void }
      | undefined
    toggleArgs?.startAgent('agent-x')
    toggleArgs?.stopAgent('agent-y')
    expect(startAgentMutation.mutate).toHaveBeenCalledWith('agent-x')
    expect(stopAgentMutation.mutate).toHaveBeenCalledWith('agent-y')

    expect(runSelfCompletionMutation.mutate).toHaveBeenCalledTimes(1)
    expect(runAiHpBootstrapMutation.mutate).toHaveBeenCalledTimes(1)
    expect(runFailoverCheckMutation.mutate).toHaveBeenCalledTimes(1)
    expect(snapshotMutation.mutate).toHaveBeenCalledTimes(1)
    expect(quickStabilizeMutation.mutate).toHaveBeenCalledTimes(1)
    expect(runChecksMutation.mutate).toHaveBeenNthCalledWith(1, 'quick')
    expect(runChecksMutation.mutate).toHaveBeenNthCalledWith(2, 'deep')
  })
})
