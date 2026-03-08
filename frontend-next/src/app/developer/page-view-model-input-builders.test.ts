import { createRef } from 'react'

import { describe, expect, it, vi } from 'vitest'

import {
  buildDeveloperCardPropsArgsFromContext,
  buildDeveloperCoreResourcesInput,
  buildDeveloperDerivedStateInput,
  buildDeveloperInteractionHandlersInput,
  buildDeveloperPageEffectsInput,
} from './page-view-model-input-builders'

describe('buildDeveloperCoreResourcesInput', () => {
  it('preserves setter wiring for core resources hook', () => {
    const setCommandResult = vi.fn()
    const setTaskPrompt = vi.fn()
    const setChatMessages = vi.fn()

    const input = buildDeveloperCoreResourcesInput({
      setCommandResult,
      setTaskPrompt,
      setChatMessages,
    })

    expect(input.setCommandResult).toBe(setCommandResult)
    expect(input.setTaskPrompt).toBe(setTaskPrompt)
    expect(input.setChatMessages).toBe(setChatMessages)
  })
})

describe('buildDeveloperPageEffectsInput', () => {
  it('maps websocket/effect dependencies without mutation', () => {
    const setLiveActivities = vi.fn()
    const setActiveModel = vi.fn()
    const chatMessages = [{ role: 'assistant', content: 'ok', ts: '2026-03-07T00:00:00.000Z' }] as const
    const chatEndRef = createRef<{ scrollIntoView: (options?: ScrollIntoViewOptions) => void }>()

    const input = buildDeveloperPageEffectsInput({
      liveWsLastMessage: {
        type: 'event',
        data: { event_type: 'core.activity', kind: 'system', title: 'ok', detail: 'ok' },
        timestamp: '2026-03-07T00:00:00.000Z',
      },
      status: undefined,
      setLiveActivities,
      setActiveModel,
      chatMessages: [...chatMessages],
      chatEndRef,
    })

    expect(input.liveWsLastMessage?.type).toBe('event')
    expect(input.setLiveActivities).toBe(setLiveActivities)
    expect(input.setActiveModel).toBe(setActiveModel)
    expect(input.chatMessages).toHaveLength(1)
    expect(input.chatEndRef).toBe(chatEndRef)
  })
})

describe('buildDeveloperInteractionHandlersInput', () => {
  it('passes handler dependencies through as-is', () => {
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

    const chatMutation = { mutate: vi.fn(), isPending: false }
    const runCommandMutation = { mutate: vi.fn(), isPending: true }
    const sendTaskMutation = { mutate: vi.fn(), isPending: false }
    const activateModelMutation = { mutate: vi.fn(), isPending: false }
    const startAgentMutation = { mutate: vi.fn(), isPending: false }
    const stopAgentMutation = { mutate: vi.fn(), isPending: false }
    const runSelfCompletionMutation = { mutate: vi.fn(), isPending: false }
    const runAiHpBootstrapMutation = { mutate: vi.fn(), isPending: false }
    const runFailoverCheckMutation = { mutate: vi.fn(), isPending: false }
    const snapshotMutation = { mutate: vi.fn(), isPending: false }
    const quickStabilizeMutation = { mutate: vi.fn(), isPending: false }

    const input = buildDeveloperInteractionHandlersInput({
      chatInput: 'hello',
      taskPrompt: 'do x',
      command: 'ping',
      activeModel: null,
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
      runChecksMutation: { mutate: vi.fn(), isPending: false },
    })

    expect(input.command).toBe('ping')
    expect(input.runCommandMutation).toBe(runCommandMutation)
    expect(input.refetchModels).toBe(refetchModels)
    expect(input.refetchFailoverStatus).toBe(refetchFailoverStatus)
    expect(input.refetchChecksLast).toBe(refetchChecksLast)
    expect(input.refetchMissionAudit).toBe(refetchMissionAudit)
    expect(input.refetchOperatorReadiness).toBe(refetchOperatorReadiness)
    expect(input.runFailoverCheckMutation).toBe(runFailoverCheckMutation)
    expect(input.quickStabilizeMutation).toBe(quickStabilizeMutation)
  })
})

describe('buildDeveloperDerivedStateInput', () => {
  it('returns derived-state input shape with the same references', () => {
    const input = buildDeveloperDerivedStateInput({
      status: undefined,
      modelsData: undefined,
      selfCompletionData: undefined,
      activityData: { activities: [] },
      snapshotsData: { snapshots: [] },
      agentsData: { agents: [] },
      liveActivities: [],
      showAllActivities: false,
      wsStatus: 'connected',
      theme: 'dark',
      viewMode: 'simple',
    })

    expect(input.wsStatus).toBe('connected')
    expect(input.theme).toBe('dark')
    expect(input.viewMode).toBe('simple')
    expect(input.activityData?.activities).toEqual([])
  })
})

describe('buildDeveloperCardPropsArgsFromContext', () => {
  it('maps grouped context objects into card-props args shape', () => {
    const preferences = {
      theme: 'dark',
      setTheme: vi.fn(),
      viewMode: 'simple',
      setViewMode: vi.fn(),
    }

    const interactionState = {
      command: 'ping',
      setCommand: vi.fn(),
      commandResult: 'ok',
      setCommandResult: vi.fn(),
      taskPrompt: 'task',
      setTaskPrompt: vi.fn(),
      chatInput: 'hello',
      setChatInput: vi.fn(),
      showAllActivities: false,
      setShowAllActivities: vi.fn(),
      liveActivities: [],
      setLiveActivities: vi.fn(),
      chatMessages: [],
      setChatMessages: vi.fn(),
      activeModel: null,
      setActiveModel: vi.fn(),
      chatEndRef: { current: null },
    }

    const coreResources = {
      status: undefined,
      statusLoading: false,
      refetchStatus: vi.fn(),
      agentsData: { agents: [] },
      agentsLoading: false,
      refetchAgents: vi.fn(),
      activityData: { activities: [] },
      snapshotsData: { snapshots: [] },
      modelsData: undefined,
      failoverStatusData: undefined,
      refetchModels: vi.fn(),
      refetchFailoverStatus: vi.fn(),
      selfCompletionData: undefined,
      taskGraphData: undefined,
      runCommandMutation: { mutate: vi.fn(), isPending: false },
      sendTaskMutation: { mutate: vi.fn(), isPending: false },
      startAgentMutation: { mutate: vi.fn(), isPending: false },
      stopAgentMutation: { mutate: vi.fn(), isPending: false },
      snapshotMutation: { mutate: vi.fn(), isPending: false },
      runSelfCompletionMutation: { mutate: vi.fn(), isPending: false },
      runAiHpBootstrapMutation: { mutate: vi.fn(), isPending: false },
      runFailoverCheckMutation: { mutate: vi.fn(), isPending: false },
      activateModelMutation: { mutate: vi.fn(), isPending: false },
      quickStabilizeMutation: { mutate: vi.fn(), isPending: false },
      runChecksMutation: { mutate: vi.fn(), isPending: false },
      checksLastData: undefined,
      missionAuditData: undefined,
      operatorReadinessData: {
        ok: true,
        score: 98,
        status: 'ready',
        status_fa: 'آماده',
        summary: 'ready-summary',
        next_action: 'next-action',
        done_count: 6,
        total: 6,
      },
      chatMutation: { mutate: vi.fn(), isPending: false },
    }

    const interactionHandlers = {
      handleChatSend: vi.fn(),
      handleRunCommand: vi.fn(),
      handleSendTask: vi.fn(),
      handleSwitchModel: vi.fn(),
      handleRefreshAll: vi.fn(),
      handleToggleAgent: vi.fn(),
      runSelfCompletion: vi.fn(),
      createSnapshot: vi.fn(),
      quickStabilize: vi.fn(),
      runChecks: vi.fn(),
      runDeepChecks: vi.fn(),
      runAiHpBootstrap: vi.fn(),
      runFailoverCheck: vi.fn(),
    }

    const derivedState = {
      snapshots: [],
      agents: [],
      visibleActivities: [],
      mergedActivities: [{ id: 1 }],
      preferredLocalModels: [],
      allLocalModels: [],
      quickRecommendedModel: { provider: 'ai_hp', model_name: 'qwen3.5:9b' },
      healthScore: 88,
      topDisplayState: {
        viewModeBannerProps: { mode: 'simple' },
        simpleHintDisplayItems: [],
        summaryTileDisplayItems: [],
      },
    }

    const result = buildDeveloperCardPropsArgsFromContext({
      preferences: preferences as unknown as Parameters<typeof buildDeveloperCardPropsArgsFromContext>[0]['preferences'],
      interactionState: interactionState as unknown as Parameters<typeof buildDeveloperCardPropsArgsFromContext>[0]['interactionState'],
      coreResources: coreResources as unknown as Parameters<typeof buildDeveloperCardPropsArgsFromContext>[0]['coreResources'],
      interactionHandlers: interactionHandlers as unknown as Parameters<typeof buildDeveloperCardPropsArgsFromContext>[0]['interactionHandlers'],
      derivedState: derivedState as unknown as Parameters<typeof buildDeveloperCardPropsArgsFromContext>[0]['derivedState'],
      liveWsStatus: 'connected',
    })

    expect(result.theme).toBe('dark')
    expect(result.liveWsStatus).toBe('connected')
    expect(result.healthScore).toBe(88)
    expect(result.mergedActivities).toEqual([{ id: 1 }])
    expect(result.handleRunCommand).toBe(interactionHandlers.handleRunCommand)
    expect(result.runDeepChecks).toBe(interactionHandlers.runDeepChecks)
    expect(result.runFailoverCheck).toBe(interactionHandlers.runFailoverCheck)
    expect(result.missionAuditData).toBeUndefined()
    expect(result.operatorReadinessData?.status_fa).toBe('آماده')
    expect(result.operatorReadinessData?.next_action).toBe('next-action')
    expect(result.setViewMode).toBe(preferences.setViewMode)
  })
})
