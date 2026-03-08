import type {
  Agent,
  CoreModelsResponse,
  CoreFailoverStatus,
  CoreStatus,
  SelfCompletionStatus,
  TaskGraph,
  ThemeMode,
} from './sections'
import type { CoreChecksLastSummary, CoreMissionAudit, CoreOperatorReadiness } from './page-core-queries-hook'

type SmartControlPendingState = {
  selfCompletion: boolean
  modelSwitch: boolean
  snapshot: boolean
  stabilize: boolean
  checks: boolean
}

export function buildSmartControlCenterCardProps(args: {
  theme: ThemeMode
  wsConnected: boolean
  healthScore: number
  status?: CoreStatus
  selfCompletionData?: SelfCompletionStatus
  checksLastData?: CoreChecksLastSummary
  missionAuditData?: CoreMissionAudit
  operatorReadinessData?: CoreOperatorReadiness
  pending: SmartControlPendingState
  aiHpBootstrapPending: boolean
  onRunSelfCompletion: () => void
  onSwitchRecommendedModel: () => void
  onCreateSnapshot: () => void
  onQuickStabilize: () => void
  onRunChecks: () => void
  onRunDeepChecks: () => void
  onRunAiHpBootstrap: () => void
  onOpenAdvanced: () => void
}) {
  return {
    theme: args.theme,
    wsConnected: args.wsConnected,
    healthScore: args.healthScore,
    status: args.status,
    selfCompletionData: args.selfCompletionData,
    checksLastData: args.checksLastData,
    missionAuditData: args.missionAuditData,
    operatorReadinessData: args.operatorReadinessData,
    pending: args.pending,
    aiHpBootstrapPending: args.aiHpBootstrapPending,
    onRunSelfCompletion: args.onRunSelfCompletion,
    onSwitchRecommendedModel: args.onSwitchRecommendedModel,
    onCreateSnapshot: args.onCreateSnapshot,
    onQuickStabilize: args.onQuickStabilize,
    onRunChecks: args.onRunChecks,
    onRunDeepChecks: args.onRunDeepChecks,
    onRunAiHpBootstrap: args.onRunAiHpBootstrap,
    onOpenAdvanced: args.onOpenAdvanced,
  }
}

export function buildSelfCompletionCardProps(
  theme: ThemeMode,
  selfCompletionData: SelfCompletionStatus | undefined,
  pending: boolean,
  onRun: () => void,
) {
  return {
    theme,
    selfCompletionData,
    pending,
    onRun,
  }
}

export function buildModelSelectionCardProps(args: {
  theme: ThemeMode
  status?: CoreStatus
  modelsData?: CoreModelsResponse
  failoverStatus?: CoreFailoverStatus
  preferredLocalModels: string[]
  allLocalModels: string[]
  activeModel: { provider: string; model_name: string } | null
  activating: boolean
  aiHpBootstrapPending: boolean
  failoverCheckPending: boolean
  onRunAiHpBootstrap: () => void
  onRunFailoverCheck: () => void
  onSwitchModel: (provider: string, model_name: string) => void
}) {
  return {
    theme: args.theme,
    status: args.status,
    modelsData: args.modelsData,
    failoverStatus: args.failoverStatus,
    preferredLocalModels: args.preferredLocalModels,
    allLocalModels: args.allLocalModels,
    activeModel: args.activeModel,
    activating: args.activating,
    aiHpBootstrapPending: args.aiHpBootstrapPending,
    failoverCheckPending: args.failoverCheckPending,
    onRunAiHpBootstrap: args.onRunAiHpBootstrap,
    onRunFailoverCheck: args.onRunFailoverCheck,
    onSwitchModel: args.onSwitchModel,
  }
}

export function buildAgentMonitorCardProps(
  theme: ThemeMode,
  agents: Agent[],
  loading: boolean,
  pending: boolean,
  onToggleAgent: (agentId: string, isRunning: boolean) => void,
) {
  return {
    theme,
    agents,
    loading,
    pending,
    onToggleAgent,
  }
}

export function buildManualPanelCardProps(args: {
  theme: ThemeMode
  taskPrompt: string
  setTaskPrompt: (value: string) => void
  sendTaskPending: boolean
  onSendTask: () => void
  command: string
  setCommand: (value: string) => void
  commandPending: boolean
  onRunCommand: () => void
  commandResult: string
}) {
  return {
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
  }
}

export function buildTaskGraphCardProps(theme: ThemeMode, taskGraphData: TaskGraph | undefined) {
  return {
    theme,
    taskGraphData,
  }
}

export function buildHeaderCardProps(args: {
  theme: ThemeMode
  status?: CoreStatus
  wsConnected: boolean
  statusLoading: boolean
  onToggleTheme: () => void
  onRefresh: () => void
}) {
  return {
    theme: args.theme,
    status: args.status,
    wsConnected: args.wsConnected,
    statusLoading: args.statusLoading,
    onToggleTheme: args.onToggleTheme,
    onRefresh: args.onRefresh,
  }
}

export function buildCoreStatusCardProps(theme: ThemeMode, status: CoreStatus | undefined) {
  return {
    theme,
    status,
  }
}

export function buildSelfImprovementCardProps(theme: ThemeMode, selfCompletionData: SelfCompletionStatus | undefined) {
  return {
    theme,
    selfCompletionData,
  }
}

export function buildFooterBarProps(theme: ThemeMode, ts: string | undefined) {
  return {
    theme,
    ts,
  }
}
