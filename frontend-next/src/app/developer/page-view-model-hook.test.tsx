import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'

import { useDeveloperPageViewModel } from './page-view-model-hook'

const useDeveloperPreferencesMock = vi.fn()
const useDeveloperInteractionStateMock = vi.fn()
const useAgentWebSocketMock = vi.fn()
const useDeveloperCoreResourcesMock = vi.fn()
const useDeveloperPageEffectsMock = vi.fn()
const useDeveloperInteractionHandlersMock = vi.fn()
const useDeveloperDerivedStateMock = vi.fn()
const getRootBackgroundClassMock = vi.fn()
const useDeveloperCardPropsMock = vi.fn()
const useDeveloperDashboardLayoutMock = vi.fn()

vi.mock('./page-preferences-hook', () => ({
  useDeveloperPreferences: () => useDeveloperPreferencesMock(),
}))

vi.mock('./page-interaction-state-hook', () => ({
  useDeveloperInteractionState: () => useDeveloperInteractionStateMock(),
}))

vi.mock('@/hooks/use-agent-websocket', () => ({
  useAgentWebSocket: (args: unknown) => useAgentWebSocketMock(args),
}))

vi.mock('./page-core-resources-hook', () => ({
  useDeveloperCoreResources: (args: unknown) => useDeveloperCoreResourcesMock(args),
}))

vi.mock('./page-effects-hook', () => ({
  useDeveloperPageEffects: (args: unknown) => useDeveloperPageEffectsMock(args),
}))

vi.mock('./page-interaction-handlers-hook', () => ({
  useDeveloperInteractionHandlers: (args: unknown) => useDeveloperInteractionHandlersMock(args),
}))

vi.mock('./page-derived-state-hook', () => ({
  useDeveloperDerivedState: (args: unknown) => useDeveloperDerivedStateMock(args),
}))

vi.mock('./page-ui-logic', () => ({
  getRootBackgroundClass: (theme: unknown) => getRootBackgroundClassMock(theme),
}))

vi.mock('./page-card-props-hook', () => ({
  useDeveloperCardProps: (args: unknown) => useDeveloperCardPropsMock(args),
}))

vi.mock('./page-layout-hook', () => ({
  useDeveloperDashboardLayout: (args: unknown) => useDeveloperDashboardLayoutMock(args),
}))

describe('useDeveloperPageViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useDeveloperPreferencesMock.mockReturnValue({
      theme: 'dark',
      setTheme: vi.fn(),
      viewMode: 'simple',
      setViewMode: vi.fn(),
    })

    useDeveloperInteractionStateMock.mockReturnValue({
      command: 'ping',
      setCommand: vi.fn(),
      commandResult: '',
      setCommandResult: vi.fn(),
      taskPrompt: 'task',
      setTaskPrompt: vi.fn(),
      chatInput: 'hello',
      setChatInput: vi.fn(),
      showAllActivities: false,
      setShowAllActivities: vi.fn(),
      liveActivities: [],
      setLiveActivities: vi.fn(),
      chatMessages: [{ role: 'assistant', content: 'hi', ts: '2026-03-07T00:00:00.000Z' }],
      setChatMessages: vi.fn(),
      activeModel: { provider: 'ai_hp', model_name: 'model-a' },
      setActiveModel: vi.fn(),
      chatEndRef: { current: null },
    })

    useAgentWebSocketMock.mockReturnValue({
      status: 'connected',
      lastMessage: { type: 'core.activity', data: { kind: 'info' } },
    })

    useDeveloperCoreResourcesMock.mockReturnValue({
      status: { ts: '2026-03-07T00:00:00.000Z' },
      statusLoading: false,
      refetchStatus: vi.fn(),
      agentsData: [],
      agentsLoading: false,
      refetchAgents: vi.fn(),
      activityData: [],
      snapshotsData: [],
      modelsData: undefined,
      refetchModels: vi.fn(),
      failoverStatusData: undefined,
      refetchFailoverStatus: vi.fn(),
      checksLastData: undefined,
      refetchChecksLast: vi.fn(),
      missionAuditData: undefined,
      refetchMissionAudit: vi.fn(),
      operatorReadinessData: {
        ok: true,
        score: 97,
        status: 'ready',
        status_fa: 'آماده',
        summary: 'operator-ready',
        next_action: 'next-step',
        done_count: 6,
        total: 6,
      },
      refetchOperatorReadiness: vi.fn(),
      selfCompletionData: undefined,
      taskGraphData: undefined,
      runCommandMutation: { isPending: false },
      sendTaskMutation: { isPending: false },
      startAgentMutation: { isPending: false },
      stopAgentMutation: { isPending: false },
      snapshotMutation: { isPending: false },
      runSelfCompletionMutation: { isPending: false },
      runAiHpBootstrapMutation: { isPending: false },
      runFailoverCheckMutation: { isPending: false },
      activateModelMutation: { isPending: false },
      quickStabilizeMutation: { isPending: false },
      runChecksMutation: { isPending: false },
      chatMutation: { isPending: false },
    })

    useDeveloperInteractionHandlersMock.mockReturnValue({
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
    })

    useDeveloperDerivedStateMock.mockReturnValue({
      snapshots: [],
      agents: [],
      visibleActivities: [],
      mergedActivities: [{ id: 1 }],
      preferredLocalModels: [],
      allLocalModels: [],
      quickRecommendedModel: { provider: 'ai_hp', model_name: 'model-a' },
      healthScore: 90,
      topDisplayState: {
        viewModeBannerProps: { mode: 'simple' },
        simpleHintDisplayItems: [{ id: 'hint' }],
        summaryTileDisplayItems: [{ id: 'summary' }],
      },
    })

    getRootBackgroundClassMock.mockReturnValue('bg-root')

    useDeveloperCardPropsMock.mockReturnValue({
      headerCardProps: { id: 'header' },
      coreStatusCardProps: { id: 'core' },
      selfImprovementCardProps: { id: 'improvement' },
      footerBarProps: { id: 'footer' },
      selfCompletionCardProps: { id: 'self-completion' },
      smartControlCenterCardProps: { id: 'smart' },
      modelSelectionCardProps: { id: 'model' },
      agentMonitorCardProps: { id: 'agent' },
      taskGraphCardProps: { id: 'task' },
      manualPanelCardProps: { id: 'manual' },
      activityFeedCardProps: { id: 'activity' },
      memoryLogsCardProps: { id: 'memory' },
      chatCardProps: { id: 'chat' },
    })

    useDeveloperDashboardLayoutMock.mockReturnValue({
      gridClassName: 'grid',
      columns: [[], []],
    })
  })

  it('composes the full page view-model from specialized hooks', () => {
    const { result } = renderHook(() => useDeveloperPageViewModel())

    expect(useAgentWebSocketMock).toHaveBeenCalledTimes(1)
    expect(useDeveloperPageEffectsMock).toHaveBeenCalledTimes(1)
    expect(getRootBackgroundClassMock).toHaveBeenCalledWith('dark')

    const cardArgs = useDeveloperCardPropsMock.mock.calls[0][0] as { mergedActivityCount: number }
    expect(cardArgs.mergedActivityCount).toBe(1)
    expect((cardArgs as any).operatorReadinessData?.status_fa).toBe('آماده')
    expect((cardArgs as any).operatorReadinessData?.next_action).toBe('next-step')

    expect(result.current.rootBackground).toBe('bg-root')
    expect(result.current.theme).toBe('dark')
    expect(result.current.dashboardLayout.gridClassName).toBe('grid')
    expect(result.current.headerCardProps).toEqual({ id: 'header' })
    expect(result.current.smartControlCenterCardProps).toEqual({ id: 'smart' })
    expect(result.current.footerBarProps).toEqual({ id: 'footer' })
    expect(result.current.viewModeBannerProps).toEqual({ mode: 'simple' })
    expect(result.current.simpleHintDisplayItems).toEqual([{ id: 'hint' }])
    expect(result.current.summaryTileDisplayItems).toEqual([{ id: 'summary' }])
  })
})
