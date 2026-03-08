import type { useDeveloperCoreResources } from './page-core-resources-hook'
import type { useDeveloperDerivedState } from './page-derived-state-hook'
import type { useDeveloperPageEffects } from './page-effects-hook'
import type { useDeveloperInteractionHandlers } from './page-interaction-handlers-hook'
import type { useDeveloperInteractionState } from './page-interaction-state-hook'
import type { useDeveloperPreferences } from './page-preferences-hook'
import type { buildDeveloperCardPropsInput } from './page-view-model-logic'

type CoreResourcesInput = Parameters<typeof useDeveloperCoreResources>[0]
type InteractionHandlersInput = Parameters<typeof useDeveloperInteractionHandlers>[0]
type DerivedStateInput = Parameters<typeof useDeveloperDerivedState>[0]
type PageEffectsInput = Parameters<typeof useDeveloperPageEffects>[0]
type CardPropsInputArgs = Parameters<typeof buildDeveloperCardPropsInput>[0]
type PreferencesState = ReturnType<typeof useDeveloperPreferences>
type InteractionState = ReturnType<typeof useDeveloperInteractionState>
type CoreResourcesState = ReturnType<typeof useDeveloperCoreResources>
type InteractionHandlersState = ReturnType<typeof useDeveloperInteractionHandlers>
type DerivedState = ReturnType<typeof useDeveloperDerivedState>

export function buildDeveloperCoreResourcesInput(args: CoreResourcesInput): CoreResourcesInput {
  return {
    setCommandResult: args.setCommandResult,
    setTaskPrompt: args.setTaskPrompt,
    setChatMessages: args.setChatMessages,
  }
}

export function buildDeveloperPageEffectsInput(args: PageEffectsInput): PageEffectsInput {
  return {
    liveWsLastMessage: args.liveWsLastMessage,
    status: args.status,
    setLiveActivities: args.setLiveActivities,
    setActiveModel: args.setActiveModel,
    chatMessages: args.chatMessages,
    chatEndRef: args.chatEndRef,
  }
}

export function buildDeveloperInteractionHandlersInput(
  args: InteractionHandlersInput,
): InteractionHandlersInput {
  return {
    chatInput: args.chatInput,
    taskPrompt: args.taskPrompt,
    command: args.command,
    activeModel: args.activeModel,
    chatMutation: args.chatMutation,
    runCommandMutation: args.runCommandMutation,
    sendTaskMutation: args.sendTaskMutation,
    activateModelMutation: args.activateModelMutation,
    startAgentMutation: args.startAgentMutation,
    stopAgentMutation: args.stopAgentMutation,
    refetchStatus: args.refetchStatus,
    refetchAgents: args.refetchAgents,
    refetchModels: args.refetchModels,
    refetchFailoverStatus: args.refetchFailoverStatus,
    refetchChecksLast: args.refetchChecksLast,
    refetchMissionAudit: args.refetchMissionAudit,
    refetchOperatorReadiness: args.refetchOperatorReadiness,
    setChatMessages: args.setChatMessages,
    setChatInput: args.setChatInput,
    setTaskPrompt: args.setTaskPrompt,
    setActiveModel: args.setActiveModel,
    runSelfCompletionMutation: args.runSelfCompletionMutation,
    runAiHpBootstrapMutation: args.runAiHpBootstrapMutation,
    runFailoverCheckMutation: args.runFailoverCheckMutation,
    snapshotMutation: args.snapshotMutation,
    quickStabilizeMutation: args.quickStabilizeMutation,
    runChecksMutation: args.runChecksMutation,
  }
}

export function buildDeveloperDerivedStateInput(args: DerivedStateInput): DerivedStateInput {
  return {
    status: args.status,
    modelsData: args.modelsData,
    selfCompletionData: args.selfCompletionData,
    activityData: args.activityData,
    snapshotsData: args.snapshotsData,
    agentsData: args.agentsData,
    liveActivities: args.liveActivities,
    showAllActivities: args.showAllActivities,
    wsStatus: args.wsStatus,
    theme: args.theme,
    viewMode: args.viewMode,
  }
}

export function buildDeveloperCardPropsArgsFromContext(args: {
  preferences: PreferencesState
  interactionState: InteractionState
  coreResources: CoreResourcesState
  interactionHandlers: InteractionHandlersState
  derivedState: DerivedState
  liveWsStatus: DerivedStateInput['wsStatus']
}): CardPropsInputArgs {
  return {
    status: args.coreResources.status,
    statusLoading: args.coreResources.statusLoading,
    liveWsStatus: args.liveWsStatus,
    selfCompletionData: args.coreResources.selfCompletionData,
    healthScore: args.derivedState.healthScore,
    quickRecommendedModel: args.derivedState.quickRecommendedModel,
    modelsData: args.coreResources.modelsData,
    failoverStatus: args.coreResources.failoverStatusData,
    preferredLocalModels: args.derivedState.preferredLocalModels,
    allLocalModels: args.derivedState.allLocalModels,
    activeModel: args.interactionState.activeModel,
    activateModelPending: args.coreResources.activateModelMutation.isPending,
    aiHpBootstrapPending: args.coreResources.runAiHpBootstrapMutation.isPending,
    failoverCheckPending: args.coreResources.runFailoverCheckMutation.isPending,
    agents: args.derivedState.agents,
    agentsLoading: args.coreResources.agentsLoading,
    startAgentPending: args.coreResources.startAgentMutation.isPending,
    stopAgentPending: args.coreResources.stopAgentMutation.isPending,
    taskGraphData: args.coreResources.taskGraphData,
    taskPrompt: args.interactionState.taskPrompt,
    setTaskPrompt: args.interactionState.setTaskPrompt,
    sendTaskPending: args.coreResources.sendTaskMutation.isPending,
    handleSendTask: args.interactionHandlers.handleSendTask,
    command: args.interactionState.command,
    setCommand: args.interactionState.setCommand,
    commandPending: args.coreResources.runCommandMutation.isPending,
    handleRunCommand: args.interactionHandlers.handleRunCommand,
    commandResult: args.interactionState.commandResult,
    visibleActivities: args.derivedState.visibleActivities,
    mergedActivities: args.derivedState.mergedActivities,
    showAllActivities: args.interactionState.showAllActivities,
    setShowAllActivities: args.interactionState.setShowAllActivities,
    snapshots: args.derivedState.snapshots,
    snapshotPending: args.coreResources.snapshotMutation.isPending,
    chatMessages: args.interactionState.chatMessages,
    chatPending: args.coreResources.chatMutation.isPending,
    chatInput: args.interactionState.chatInput,
    setChatInput: args.interactionState.setChatInput,
    handleChatSend: args.interactionHandlers.handleChatSend,
    chatEndRef: args.interactionState.chatEndRef,
    runSelfCompletionPending: args.coreResources.runSelfCompletionMutation.isPending,
    quickStabilizePending: args.coreResources.quickStabilizeMutation.isPending,
    runChecksPending: args.coreResources.runChecksMutation.isPending,
    checksLastData: args.coreResources.checksLastData,
    missionAuditData: args.coreResources.missionAuditData,
    operatorReadinessData: args.coreResources.operatorReadinessData,
    setTheme: args.preferences.setTheme,
    handleRefreshAll: args.interactionHandlers.handleRefreshAll,
    runSelfCompletion: args.interactionHandlers.runSelfCompletion,
    handleSwitchModel: args.interactionHandlers.handleSwitchModel,
    createSnapshot: args.interactionHandlers.createSnapshot,
    quickStabilize: args.interactionHandlers.quickStabilize,
    runChecks: args.interactionHandlers.runChecks,
    runDeepChecks: args.interactionHandlers.runDeepChecks,
    runAiHpBootstrap: args.interactionHandlers.runAiHpBootstrap,
    runFailoverCheck: args.interactionHandlers.runFailoverCheck,
    setViewMode: args.preferences.setViewMode,
    handleToggleAgent: args.interactionHandlers.handleToggleAgent,
    theme: args.preferences.theme,
  }
}
