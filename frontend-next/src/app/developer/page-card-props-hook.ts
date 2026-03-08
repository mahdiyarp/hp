import { useMemo } from 'react'
import type { RefObject } from 'react'

import {
  buildActivityFeedCardProps,
  buildChatCardProps,
  buildMemoryLogsCardProps,
} from './page-card-props-logic'
import { buildSmartControlPendingState, isAgentTogglePending } from './page-pending-logic'
import {
  buildAgentMonitorCardProps,
  buildCoreStatusCardProps,
  buildFooterBarProps,
  buildHeaderCardProps,
  buildManualPanelCardProps,
  buildModelSelectionCardProps,
  buildSelfCompletionCardProps,
  buildSelfImprovementCardProps,
  buildSmartControlCenterCardProps,
  buildTaskGraphCardProps,
} from './page-section-props-logic'
import type { ActivityItem, Agent, CoreFailoverStatus, CoreModelsResponse, CoreStatus, SelfCompletionStatus, Snapshot, TaskGraph } from './sections'
import type { CoreChecksLastSummary, CoreMissionAudit, CoreOperatorReadiness } from './page-core-queries-hook'

type ChatMessage = { role: 'user' | 'assistant'; content: string; ts: string }
type ModelIdentity = { provider: string; model_name: string }

export function useDeveloperCardProps(args: {
  theme: 'dark' | 'light'
  status: CoreStatus | undefined
  statusLoading: boolean
  wsConnected: boolean
  statusTs?: string
  selfCompletionData: SelfCompletionStatus | undefined
  healthScore: number
  quickRecommendedModel: ModelIdentity
  modelsData: CoreModelsResponse | undefined
  failoverStatus: CoreFailoverStatus | undefined
  preferredLocalModels: string[]
  allLocalModels: string[]
  activeModel: ModelIdentity | null
  activatingModel: boolean
  aiHpBootstrapPending: boolean
  failoverCheckPending: boolean
  agents: Agent[]
  agentsLoading: boolean
  startAgentPending: boolean
  stopAgentPending: boolean
  taskGraphData: TaskGraph | undefined
  taskPrompt: string
  setTaskPrompt: (value: string) => void
  sendTaskPending: boolean
  onSendTask: () => void
  command: string
  setCommand: (value: string) => void
  commandPending: boolean
  onRunCommand: () => void
  commandResult: string
  visibleActivities: ActivityItem[]
  mergedActivityCount: number
  showAllActivities: boolean
  onToggleShowAllActivities: () => void
  snapshots: Snapshot[]
  snapshotPending: boolean
  chatMessages: ChatMessage[]
  chatPending: boolean
  chatInput: string
  setChatInput: (value: string) => void
  onSendChat: () => void
  chatEndRef: RefObject<HTMLDivElement>
  runSelfCompletionPending: boolean
  quickStabilizePending: boolean
  runChecksPending: boolean
  checksLastData: CoreChecksLastSummary | undefined
  missionAuditData: CoreMissionAudit | undefined
  operatorReadinessData: CoreOperatorReadiness | undefined
  onToggleTheme: () => void
  onRefreshAll: () => void
  onRunSelfCompletion: () => void
  onSwitchRecommendedModel: () => void
  onCreateSnapshot: () => void
  onQuickStabilize: () => void
  onRunChecks: () => void
  onRunDeepChecks: () => void
  onOpenAdvanced: () => void
  onRunAiHpBootstrap: () => void
  onRunFailoverCheck: () => void
  onSwitchModel: (provider: string, model_name: string) => void
  onToggleAgent: (agentId: string, isRunning: boolean) => void
}) {
  return useMemo(() => {
    const smartControlPending = buildSmartControlPendingState({
      selfCompletionPending: args.runSelfCompletionPending,
      modelSwitchPending: args.activatingModel,
      snapshotPending: args.snapshotPending,
      stabilizePending: args.quickStabilizePending,
      checksPending: args.runChecksPending,
    })

    const agentTogglePending = isAgentTogglePending(args.startAgentPending, args.stopAgentPending)

    const headerCardProps = buildHeaderCardProps({
      theme: args.theme,
      status: args.status,
      wsConnected: args.wsConnected,
      statusLoading: args.statusLoading,
      onToggleTheme: args.onToggleTheme,
      onRefresh: args.onRefreshAll,
    })

    const coreStatusCardProps = buildCoreStatusCardProps(args.theme, args.status)
    const selfImprovementCardProps = buildSelfImprovementCardProps(args.theme, args.selfCompletionData)
    const footerBarProps = buildFooterBarProps(args.theme, args.statusTs)

    const selfCompletionCardProps = buildSelfCompletionCardProps(
      args.theme,
      args.selfCompletionData,
      args.runSelfCompletionPending,
      args.onRunSelfCompletion,
    )

    const smartControlCenterCardProps = buildSmartControlCenterCardProps({
      theme: args.theme,
      wsConnected: args.wsConnected,
      healthScore: args.healthScore,
      status: args.status,
      selfCompletionData: args.selfCompletionData,
      checksLastData: args.checksLastData,
      missionAuditData: args.missionAuditData,
      operatorReadinessData: args.operatorReadinessData,
      pending: smartControlPending,
      aiHpBootstrapPending: args.aiHpBootstrapPending,
      onRunSelfCompletion: args.onRunSelfCompletion,
      onSwitchRecommendedModel: args.onSwitchRecommendedModel,
      onCreateSnapshot: args.onCreateSnapshot,
      onQuickStabilize: args.onQuickStabilize,
      onRunChecks: args.onRunChecks,
      onRunDeepChecks: args.onRunDeepChecks,
      onRunAiHpBootstrap: args.onRunAiHpBootstrap,
      onOpenAdvanced: args.onOpenAdvanced,
    })

    const modelSelectionCardProps = buildModelSelectionCardProps({
      theme: args.theme,
      status: args.status,
      modelsData: args.modelsData,
      failoverStatus: args.failoverStatus,
      preferredLocalModels: args.preferredLocalModels,
      allLocalModels: args.allLocalModels,
      activeModel: args.activeModel,
      activating: args.activatingModel,
      aiHpBootstrapPending: args.aiHpBootstrapPending,
      failoverCheckPending: args.failoverCheckPending,
      onRunAiHpBootstrap: args.onRunAiHpBootstrap,
      onRunFailoverCheck: args.onRunFailoverCheck,
      onSwitchModel: args.onSwitchModel,
    })

    const agentMonitorCardProps = buildAgentMonitorCardProps(
      args.theme,
      args.agents,
      args.agentsLoading,
      agentTogglePending,
      args.onToggleAgent,
    )

    const taskGraphCardProps = buildTaskGraphCardProps(args.theme, args.taskGraphData)

    const manualPanelCardProps = buildManualPanelCardProps({
      theme: args.theme,
      taskPrompt: args.taskPrompt,
      setTaskPrompt: args.setTaskPrompt,
      sendTaskPending: args.sendTaskPending,
      onSendTask: args.onSendTask,
      command: args.command,
      setCommand: args.setCommand,
      commandPending: args.commandPending,
      onRunCommand: args.onRunCommand,
      commandResult: args.commandResult,
    })

    const activityFeedCardProps = buildActivityFeedCardProps(
      args.theme,
      args.visibleActivities,
      args.mergedActivityCount,
      args.showAllActivities,
      args.onToggleShowAllActivities,
    )

    const memoryLogsCardProps = buildMemoryLogsCardProps(
      args.theme,
      args.snapshots,
      args.snapshotPending,
      args.onCreateSnapshot,
    )

    const chatCardProps = buildChatCardProps(
      args.theme,
      args.chatMessages,
      args.chatPending,
      args.chatInput,
      args.setChatInput,
      args.onSendChat,
      args.chatEndRef,
    )

    return {
      headerCardProps,
      coreStatusCardProps,
      selfImprovementCardProps,
      footerBarProps,
      selfCompletionCardProps,
      smartControlCenterCardProps,
      modelSelectionCardProps,
      agentMonitorCardProps,
      taskGraphCardProps,
      manualPanelCardProps,
      activityFeedCardProps,
      memoryLogsCardProps,
      chatCardProps,
    }
  }, [
    args.theme,
    args.status,
    args.statusLoading,
    args.wsConnected,
    args.statusTs,
    args.selfCompletionData,
    args.healthScore,
    args.modelsData,
    args.failoverStatus,
    args.preferredLocalModels,
    args.allLocalModels,
    args.activeModel,
    args.activatingModel,
    args.aiHpBootstrapPending,
    args.failoverCheckPending,
    args.agents,
    args.agentsLoading,
    args.startAgentPending,
    args.stopAgentPending,
    args.taskGraphData,
    args.taskPrompt,
    args.setTaskPrompt,
    args.sendTaskPending,
    args.onSendTask,
    args.command,
    args.setCommand,
    args.commandPending,
    args.onRunCommand,
    args.commandResult,
    args.visibleActivities,
    args.mergedActivityCount,
    args.showAllActivities,
    args.onToggleShowAllActivities,
    args.snapshots,
    args.snapshotPending,
    args.chatMessages,
    args.chatPending,
    args.chatInput,
    args.setChatInput,
    args.onSendChat,
    args.chatEndRef,
    args.runSelfCompletionPending,
    args.quickStabilizePending,
    args.runChecksPending,
    args.checksLastData,
    args.missionAuditData,
    args.operatorReadinessData,
    args.onToggleTheme,
    args.onRefreshAll,
    args.onRunSelfCompletion,
    args.onSwitchRecommendedModel,
    args.onCreateSnapshot,
    args.onQuickStabilize,
    args.onRunChecks,
    args.onRunDeepChecks,
    args.onOpenAdvanced,
    args.onRunAiHpBootstrap,
    args.onRunFailoverCheck,
    args.onSwitchModel,
    args.onToggleAgent,
  ])
}
