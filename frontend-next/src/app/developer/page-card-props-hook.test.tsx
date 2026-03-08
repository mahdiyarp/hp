import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'

import { useDeveloperCardProps } from './page-card-props-hook'

const buildSmartControlPendingStateMock = vi.fn(() => ({ selfCompletionPending: false }))
const isAgentTogglePendingMock = vi.fn(() => false)

const buildHeaderCardPropsMock = vi.fn(() => ({ kind: 'header' }))
const buildCoreStatusCardPropsMock = vi.fn(() => ({ kind: 'core' }))
const buildSelfImprovementCardPropsMock = vi.fn(() => ({ kind: 'improvement' }))
const buildFooterBarPropsMock = vi.fn(() => ({ kind: 'footer' }))
const buildSelfCompletionCardPropsMock = vi.fn(() => ({ kind: 'self-completion' }))
const buildSmartControlCenterCardPropsMock = vi.fn(() => ({ kind: 'smart-center' }))
const buildModelSelectionCardPropsMock = vi.fn(() => ({ kind: 'model-selection' }))
const buildAgentMonitorCardPropsMock = vi.fn(() => ({ kind: 'agent-monitor' }))
const buildTaskGraphCardPropsMock = vi.fn(() => ({ kind: 'task-graph' }))
const buildManualPanelCardPropsMock = vi.fn(() => ({ kind: 'manual-panel' }))

const buildActivityFeedCardPropsMock = vi.fn(() => ({ kind: 'activity-feed' }))
const buildMemoryLogsCardPropsMock = vi.fn(() => ({ kind: 'memory-logs' }))
const buildChatCardPropsMock = vi.fn(() => ({ kind: 'chat' }))

vi.mock('./page-pending-logic', () => ({
  buildSmartControlPendingState: (args: unknown) => buildSmartControlPendingStateMock(args),
  isAgentTogglePending: (start: boolean, stop: boolean) => isAgentTogglePendingMock(start, stop),
}))

vi.mock('./page-section-props-logic', () => ({
  buildHeaderCardProps: (args: unknown) => buildHeaderCardPropsMock(args),
  buildCoreStatusCardProps: (theme: unknown, status: unknown) => buildCoreStatusCardPropsMock(theme, status),
  buildSelfImprovementCardProps: (theme: unknown, data: unknown) => buildSelfImprovementCardPropsMock(theme, data),
  buildFooterBarProps: (theme: unknown, ts: unknown) => buildFooterBarPropsMock(theme, ts),
  buildSelfCompletionCardProps: (theme: unknown, data: unknown, pending: unknown, run: unknown) =>
    buildSelfCompletionCardPropsMock(theme, data, pending, run),
  buildSmartControlCenterCardProps: (args: unknown) => buildSmartControlCenterCardPropsMock(args),
  buildModelSelectionCardProps: (args: unknown) => buildModelSelectionCardPropsMock(args),
  buildAgentMonitorCardProps: (theme: unknown, agents: unknown, loading: unknown, pending: unknown, toggle: unknown) =>
    buildAgentMonitorCardPropsMock(theme, agents, loading, pending, toggle),
  buildTaskGraphCardProps: (theme: unknown, taskGraph: unknown) => buildTaskGraphCardPropsMock(theme, taskGraph),
  buildManualPanelCardProps: (args: unknown) => buildManualPanelCardPropsMock(args),
}))

vi.mock('./page-card-props-logic', () => ({
  buildActivityFeedCardProps: (theme: unknown, activities: unknown, count: unknown, showAll: unknown, toggle: unknown) =>
    buildActivityFeedCardPropsMock(theme, activities, count, showAll, toggle),
  buildMemoryLogsCardProps: (theme: unknown, snapshots: unknown, pending: unknown, create: unknown) =>
    buildMemoryLogsCardPropsMock(theme, snapshots, pending, create),
  buildChatCardProps: (theme: unknown, messages: unknown, pending: unknown, input: unknown, setInput: unknown, send: unknown, endRef: unknown) =>
    buildChatCardPropsMock(theme, messages, pending, input, setInput, send, endRef),
}))

describe('useDeveloperCardProps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds all card props via dedicated builder functions', () => {
    const args = {
      theme: 'dark' as const,
      status: { status: 'online' } as any,
      statusLoading: false,
      wsConnected: true,
      statusTs: '2026-03-07T00:00:00.000Z',
      selfCompletionData: { status: 'idle' } as any,
      healthScore: 90,
      quickRecommendedModel: { provider: 'ai_hp', model_name: 'qwen3.5:9b' },
      modelsData: undefined,
      failoverStatus: undefined,
      preferredLocalModels: [],
      allLocalModels: [],
      activeModel: null,
      activatingModel: false,
      aiHpBootstrapPending: false,
      failoverCheckPending: false,
      agents: [],
      agentsLoading: false,
      startAgentPending: false,
      stopAgentPending: false,
      taskGraphData: undefined,
      taskPrompt: '',
      setTaskPrompt: vi.fn(),
      sendTaskPending: false,
      onSendTask: vi.fn(),
      command: 'ping',
      setCommand: vi.fn(),
      commandPending: false,
      onRunCommand: vi.fn(),
      commandResult: '',
      visibleActivities: [],
      mergedActivityCount: 0,
      showAllActivities: false,
      onToggleShowAllActivities: vi.fn(),
      snapshots: [],
      snapshotPending: false,
      chatMessages: [{ role: 'assistant' as const, content: 'hi', ts: '2026-03-07T00:00:00.000Z' }],
      chatPending: false,
      chatInput: '',
      setChatInput: vi.fn(),
      onSendChat: vi.fn(),
      chatEndRef: { current: null },
      runSelfCompletionPending: false,
      quickStabilizePending: false,
      runChecksPending: false,
      checksLastData: undefined,
      missionAuditData: undefined,
      operatorReadinessData: undefined,
      onToggleTheme: vi.fn(),
      onRefreshAll: vi.fn(),
      onRunSelfCompletion: vi.fn(),
      onSwitchRecommendedModel: vi.fn(),
      onCreateSnapshot: vi.fn(),
      onQuickStabilize: vi.fn(),
      onRunChecks: vi.fn(),
      onRunDeepChecks: vi.fn(),
      onOpenAdvanced: vi.fn(),
      onRunAiHpBootstrap: vi.fn(),
      onRunFailoverCheck: vi.fn(),
      onSwitchModel: vi.fn(),
      onToggleAgent: vi.fn(),
    }

    const { result } = renderHook(() => useDeveloperCardProps(args))

    expect(buildSmartControlPendingStateMock).toHaveBeenCalledTimes(1)
    expect(isAgentTogglePendingMock).toHaveBeenCalledWith(false, false)

    expect(result.current.headerCardProps).toEqual({ kind: 'header' })
    expect(result.current.coreStatusCardProps).toEqual({ kind: 'core' })
    expect(result.current.selfImprovementCardProps).toEqual({ kind: 'improvement' })
    expect(result.current.footerBarProps).toEqual({ kind: 'footer' })
    expect(result.current.selfCompletionCardProps).toEqual({ kind: 'self-completion' })
    expect(result.current.smartControlCenterCardProps).toEqual({ kind: 'smart-center' })
    expect(result.current.modelSelectionCardProps).toEqual({ kind: 'model-selection' })
    expect(result.current.agentMonitorCardProps).toEqual({ kind: 'agent-monitor' })
    expect(result.current.taskGraphCardProps).toEqual({ kind: 'task-graph' })
    expect(result.current.manualPanelCardProps).toEqual({ kind: 'manual-panel' })
    expect(result.current.activityFeedCardProps).toEqual({ kind: 'activity-feed' })
    expect(result.current.memoryLogsCardProps).toEqual({ kind: 'memory-logs' })
    expect(result.current.chatCardProps).toEqual({ kind: 'chat' })
  })
})
