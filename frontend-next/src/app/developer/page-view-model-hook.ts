import { useAgentWebSocket } from '@/hooks/use-agent-websocket'

import { getRootBackgroundClass } from './page-ui-logic'
import { useDeveloperDerivedState } from './page-derived-state-hook'
import { useDeveloperPageEffects } from './page-effects-hook'
import { useDeveloperCardProps } from './page-card-props-hook'
import { useDeveloperCoreResources } from './page-core-resources-hook'
import { useDeveloperInteractionHandlers } from './page-interaction-handlers-hook'
import { useDeveloperInteractionState } from './page-interaction-state-hook'
import { useDeveloperDashboardLayout } from './page-layout-hook'
import {
  buildDeveloperCardPropsArgsFromContext,
  buildDeveloperCoreResourcesInput,
  buildDeveloperDerivedStateInput,
  buildDeveloperInteractionHandlersInput,
  buildDeveloperPageEffectsInput,
} from './page-view-model-input-builders'
import { useDeveloperPreferences } from './page-preferences-hook'
import { buildDeveloperCardPropsInput, buildDeveloperLayoutInput } from './page-view-model-logic'
import { buildDeveloperPageViewModelOutput } from './page-view-model-output-logic'
import { buildDeveloperLiveWsOptions, mapWsMessageToCoreEventMessage } from './page-view-model-ws-logic'

export function useDeveloperPageViewModel() {
  const preferences = useDeveloperPreferences()
  const interactionState = useDeveloperInteractionState()

  const liveWs = useAgentWebSocket(buildDeveloperLiveWsOptions())

  const coreResources = useDeveloperCoreResources(
    buildDeveloperCoreResourcesInput({
      setCommandResult: interactionState.setCommandResult,
      setTaskPrompt: interactionState.setTaskPrompt,
      setChatMessages: interactionState.setChatMessages,
    }),
  )

  useDeveloperPageEffects(
    buildDeveloperPageEffectsInput({
      liveWsLastMessage: mapWsMessageToCoreEventMessage(liveWs.lastMessage),
      status: coreResources.status,
      setLiveActivities: interactionState.setLiveActivities,
      setActiveModel: interactionState.setActiveModel,
      chatMessages: interactionState.chatMessages,
      chatEndRef: interactionState.chatEndRef,
    }),
  )

  const interactionHandlers = useDeveloperInteractionHandlers(
    buildDeveloperInteractionHandlersInput({
      chatInput: interactionState.chatInput,
      taskPrompt: interactionState.taskPrompt,
      command: interactionState.command,
      activeModel: interactionState.activeModel,
      chatMutation: coreResources.chatMutation,
      runCommandMutation: coreResources.runCommandMutation,
      sendTaskMutation: coreResources.sendTaskMutation,
      activateModelMutation: coreResources.activateModelMutation,
      startAgentMutation: coreResources.startAgentMutation,
      stopAgentMutation: coreResources.stopAgentMutation,
      refetchStatus: coreResources.refetchStatus,
      refetchAgents: coreResources.refetchAgents,
      refetchModels: coreResources.refetchModels,
      refetchFailoverStatus: coreResources.refetchFailoverStatus,
      refetchChecksLast: coreResources.refetchChecksLast,
      refetchMissionAudit: coreResources.refetchMissionAudit,
      refetchOperatorReadiness: coreResources.refetchOperatorReadiness,
      setChatMessages: interactionState.setChatMessages,
      setChatInput: interactionState.setChatInput,
      setTaskPrompt: interactionState.setTaskPrompt,
      setActiveModel: interactionState.setActiveModel,
      runSelfCompletionMutation: coreResources.runSelfCompletionMutation,
      runAiHpBootstrapMutation: coreResources.runAiHpBootstrapMutation,
      runFailoverCheckMutation: coreResources.runFailoverCheckMutation,
      snapshotMutation: coreResources.snapshotMutation,
      quickStabilizeMutation: coreResources.quickStabilizeMutation,
      runChecksMutation: coreResources.runChecksMutation,
    }),
  )

  const derivedState = useDeveloperDerivedState(
    buildDeveloperDerivedStateInput({
      status: coreResources.status,
      modelsData: coreResources.modelsData,
      selfCompletionData: coreResources.selfCompletionData,
      activityData: coreResources.activityData,
      snapshotsData: coreResources.snapshotsData,
      agentsData: coreResources.agentsData,
      liveActivities: interactionState.liveActivities,
      showAllActivities: interactionState.showAllActivities,
      wsStatus: liveWs.status,
      theme: preferences.theme,
      viewMode: preferences.viewMode,
    }),
  )

  const rootBackground = getRootBackgroundClass(preferences.theme)

  const cardProps = useDeveloperCardProps(
    buildDeveloperCardPropsInput(
      buildDeveloperCardPropsArgsFromContext({
        preferences,
        interactionState,
        coreResources,
        interactionHandlers,
        derivedState,
        liveWsStatus: liveWs.status,
      }),
    ),
  )

  const dashboardLayout = useDeveloperDashboardLayout(
    buildDeveloperLayoutInput({ viewMode: preferences.viewMode, cardProps }),
  )

  return buildDeveloperPageViewModelOutput({
    rootBackground,
    theme: preferences.theme,
    setViewMode: preferences.setViewMode,
    topDisplayState: derivedState.topDisplayState,
    dashboardLayout,
    cardProps,
  })
}
