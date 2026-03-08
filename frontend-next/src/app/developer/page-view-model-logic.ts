import type { Dispatch, SetStateAction } from 'react'

import type { useDeveloperCardProps } from './page-card-props-hook'
import type { useDeveloperDashboardLayout } from './page-layout-hook'

type DeveloperCardPropsInput = Parameters<typeof useDeveloperCardProps>[0]
type DeveloperCardProps = ReturnType<typeof useDeveloperCardProps>
type DeveloperLayoutInput = Parameters<typeof useDeveloperDashboardLayout>[0]

type BuildDeveloperCardPropsInputArgs = Omit<
  DeveloperCardPropsInput,
  | 'wsConnected'
  | 'activatingModel'
  | 'onSendTask'
  | 'onSendChat'
  | 'onRunCommand'
  | 'mergedActivityCount'
  | 'onToggleShowAllActivities'
  | 'onToggleTheme'
  | 'onRefreshAll'
  | 'onRunSelfCompletion'
  | 'onSwitchRecommendedModel'
  | 'onCreateSnapshot'
  | 'onQuickStabilize'
  | 'onRunChecks'
  | 'onRunDeepChecks'
  | 'onRunFailoverCheck'
  | 'onOpenAdvanced'
  | 'onRunAiHpBootstrap'
  | 'onSwitchModel'
  | 'onToggleAgent'
> & {
  liveWsStatus: 'connected' | 'disconnected' | 'connecting'
  activateModelPending: boolean
  aiHpBootstrapPending: boolean
  failoverCheckPending: boolean
  handleSendTask: DeveloperCardPropsInput['onSendTask']
  handleRunCommand: DeveloperCardPropsInput['onRunCommand']
  handleChatSend: DeveloperCardPropsInput['onSendChat']
  mergedActivities: Array<unknown>
  setShowAllActivities: Dispatch<SetStateAction<boolean>>
  setTheme: Dispatch<SetStateAction<'dark' | 'light'>>
  handleRefreshAll: DeveloperCardPropsInput['onRefreshAll']
  runSelfCompletion: DeveloperCardPropsInput['onRunSelfCompletion']
  handleSwitchModel: DeveloperCardPropsInput['onSwitchModel']
  createSnapshot: DeveloperCardPropsInput['onCreateSnapshot']
  quickStabilize: DeveloperCardPropsInput['onQuickStabilize']
  runChecks: DeveloperCardPropsInput['onRunChecks']
  runDeepChecks: DeveloperCardPropsInput['onRunDeepChecks']
  runAiHpBootstrap: DeveloperCardPropsInput['onRunAiHpBootstrap']
  runFailoverCheck: DeveloperCardPropsInput['onRunFailoverCheck']
  setViewMode: Dispatch<SetStateAction<'simple' | 'advanced'>>
  handleToggleAgent: DeveloperCardPropsInput['onToggleAgent']
}

type BuildDeveloperLayoutInputArgs = {
  viewMode: DeveloperLayoutInput['viewMode']
  cardProps: DeveloperCardProps
}

export function buildDeveloperCardPropsInput(args: BuildDeveloperCardPropsInputArgs): DeveloperCardPropsInput {
  const {
    theme,
    status,
    statusLoading,
    liveWsStatus,
    selfCompletionData,
    healthScore,
    quickRecommendedModel,
    modelsData,
    failoverStatus,
    preferredLocalModels,
    allLocalModels,
    activeModel,
    activateModelPending,
    aiHpBootstrapPending,
    failoverCheckPending,
    agents,
    agentsLoading,
    startAgentPending,
    stopAgentPending,
    taskGraphData,
    taskPrompt,
    setTaskPrompt,
    sendTaskPending,
    handleSendTask,
    command,
    setCommand,
    commandPending,
    handleRunCommand,
    commandResult,
    visibleActivities,
    mergedActivities,
    showAllActivities,
    setShowAllActivities,
    snapshots,
    snapshotPending,
    chatMessages,
    chatPending,
    chatInput,
    setChatInput,
    handleChatSend,
    chatEndRef,
    runSelfCompletionPending,
    quickStabilizePending,
    runChecksPending,
    checksLastData,
    missionAuditData,
    operatorReadinessData,
    setTheme,
    handleRefreshAll,
    runSelfCompletion,
    handleSwitchModel,
    createSnapshot,
    quickStabilize,
    runChecks,
    runDeepChecks,
    runAiHpBootstrap,
    runFailoverCheck,
    setViewMode,
    handleToggleAgent,
  } = args

  return {
    theme,
    status,
    statusLoading,
    wsConnected: liveWsStatus === 'connected',
    statusTs: status?.ts,
    selfCompletionData,
    healthScore,
    quickRecommendedModel,
    modelsData,
    failoverStatus,
    preferredLocalModels,
    allLocalModels,
    activeModel,
    activatingModel: activateModelPending,
    aiHpBootstrapPending,
    failoverCheckPending,
    agents,
    agentsLoading,
    startAgentPending,
    stopAgentPending,
    taskGraphData,
    taskPrompt,
    setTaskPrompt,
    sendTaskPending,
    onSendTask: handleSendTask,
    command,
    setCommand,
    commandPending,
    onRunCommand: handleRunCommand,
    commandResult,
    visibleActivities,
    mergedActivityCount: mergedActivities.length,
    showAllActivities,
    onToggleShowAllActivities: () => setShowAllActivities((s: boolean) => !s),
    snapshots,
    snapshotPending,
    chatMessages,
    chatPending,
    chatInput,
    setChatInput,
    onSendChat: handleChatSend,
    chatEndRef,
    runSelfCompletionPending,
    quickStabilizePending,
    runChecksPending,
    checksLastData,
    missionAuditData,
    operatorReadinessData,
    onToggleTheme: () => setTheme((t: 'dark' | 'light') => (t === 'dark' ? 'light' : 'dark')),
    onRefreshAll: handleRefreshAll,
    onRunSelfCompletion: runSelfCompletion,
    onSwitchRecommendedModel: () =>
      handleSwitchModel(quickRecommendedModel.provider, quickRecommendedModel.model_name),
    onCreateSnapshot: createSnapshot,
    onQuickStabilize: quickStabilize,
    onRunChecks: runChecks,
    onRunDeepChecks: runDeepChecks,
    onOpenAdvanced: () => setViewMode('advanced'),
    onRunAiHpBootstrap: runAiHpBootstrap,
    onRunFailoverCheck: runFailoverCheck,
    onSwitchModel: handleSwitchModel,
    onToggleAgent: handleToggleAgent,
  }
}

export function buildDeveloperLayoutInput(args: BuildDeveloperLayoutInputArgs): DeveloperLayoutInput {
  const { viewMode, cardProps } = args

  return {
    viewMode,
    coreStatusCardProps: cardProps.coreStatusCardProps,
    selfCompletionCardProps: cardProps.selfCompletionCardProps,
    activityFeedCardProps: cardProps.activityFeedCardProps,
    chatCardProps: cardProps.chatCardProps,
    memoryLogsCardProps: cardProps.memoryLogsCardProps,
    modelSelectionCardProps: cardProps.modelSelectionCardProps,
    agentMonitorCardProps: cardProps.agentMonitorCardProps,
    taskGraphCardProps: cardProps.taskGraphCardProps,
    manualPanelCardProps: cardProps.manualPanelCardProps,
    selfImprovementCardProps: cardProps.selfImprovementCardProps,
  }
}
