import { useCallback } from 'react'

import {
  executeAgentToggle,
  executeChatSend,
  executeCommandRun,
  executeModelSwitch,
  executeTaskSend,
} from './page-handler-logic'
import { runGroupedRefetch } from './page-orchestration-logic'
import type { ChatMessage } from './page-interaction-state-hook'

type ModelIdentity = { provider: string; model_name: string }
type ChecksMode = 'quick' | 'deep'

type MutationWithArg<T> = {
  mutate: (arg: T) => void
  isPending: boolean
}

type MutationWithoutArg = {
  mutate: () => void
  isPending: boolean
}

type MutationWithChecksMode = {
  mutate: (mode?: ChecksMode) => void
  isPending: boolean
}

export function useDeveloperInteractionHandlers(args: {
  chatInput: string
  taskPrompt: string
  command: string
  activeModel: ModelIdentity | null
  chatMutation: MutationWithArg<string>
  runCommandMutation: MutationWithArg<string>
  sendTaskMutation: MutationWithArg<string>
  activateModelMutation: MutationWithArg<ModelIdentity>
  startAgentMutation: MutationWithArg<string>
  stopAgentMutation: MutationWithArg<string>
  refetchStatus: () => unknown
  refetchAgents: () => unknown
  refetchModels: () => unknown
  refetchFailoverStatus: () => unknown
  refetchChecksLast: () => unknown
  refetchMissionAudit: () => unknown
  refetchOperatorReadiness: () => unknown
  setChatMessages: (updater: (previous: ChatMessage[]) => ChatMessage[]) => void
  setChatInput: (value: string) => void
  setTaskPrompt: (value: string) => void
  setActiveModel: (model: ModelIdentity) => void
  runSelfCompletionMutation: MutationWithoutArg
  runAiHpBootstrapMutation: MutationWithoutArg
  runFailoverCheckMutation: MutationWithoutArg
  snapshotMutation: MutationWithoutArg
  quickStabilizeMutation: MutationWithoutArg
  runChecksMutation: MutationWithChecksMode
}) {
  const handleChatSend = useCallback(() => {
    executeChatSend({
      chatInput: args.chatInput,
      chatPending: args.chatMutation.isPending,
      setChatMessages: args.setChatMessages,
      setChatInput: args.setChatInput,
      mutateChat: (message) => args.chatMutation.mutate(message),
    })
  }, [args.chatInput, args.chatMutation, args.setChatMessages, args.setChatInput])

  const handleRunCommand = useCallback(() => {
    executeCommandRun({
      command: args.command,
      commandPending: args.runCommandMutation.isPending,
      mutateCommand: (action) => args.runCommandMutation.mutate(action),
    })
  }, [args.command, args.runCommandMutation])

  const handleSendTask = useCallback(() => {
    executeTaskSend({
      taskPrompt: args.taskPrompt,
      taskPending: args.sendTaskMutation.isPending,
      mutateTask: (target) => args.sendTaskMutation.mutate(target),
    })
  }, [args.taskPrompt, args.sendTaskMutation])

  const handleSwitchModel = useCallback(
    (provider: string, model_name: string) => {
      executeModelSwitch({
        activeModel: args.activeModel,
        nextModel: { provider, model_name },
        setActiveModel: args.setActiveModel,
        activateModel: (model) => args.activateModelMutation.mutate(model),
      })
    },
    [args.activeModel, args.setActiveModel, args.activateModelMutation],
  )

  const handleRefreshAll = useCallback(() => {
    runGroupedRefetch([
      args.refetchStatus,
      args.refetchAgents,
      args.refetchModels,
      args.refetchFailoverStatus,
      args.refetchChecksLast,
      args.refetchMissionAudit,
      args.refetchOperatorReadiness,
    ])
  }, [
    args.refetchStatus,
    args.refetchAgents,
    args.refetchModels,
    args.refetchFailoverStatus,
    args.refetchChecksLast,
    args.refetchMissionAudit,
    args.refetchOperatorReadiness,
  ])

  const handleToggleAgent = useCallback(
    (agentId: string, isRunning: boolean) => {
      executeAgentToggle({
        agentId,
        isRunning,
        startAgent: (id) => args.startAgentMutation.mutate(id),
        stopAgent: (id) => args.stopAgentMutation.mutate(id),
      })
    },
    [args.startAgentMutation, args.stopAgentMutation],
  )

  return {
    handleChatSend,
    handleRunCommand,
    handleSendTask,
    handleSwitchModel,
    handleRefreshAll,
    handleToggleAgent,
    runSelfCompletion: () => args.runSelfCompletionMutation.mutate(),
    runAiHpBootstrap: () => args.runAiHpBootstrapMutation.mutate(),
    runFailoverCheck: () => args.runFailoverCheckMutation.mutate(),
    createSnapshot: () => args.snapshotMutation.mutate(),
    quickStabilize: () => args.quickStabilizeMutation.mutate(),
    runChecks: () => args.runChecksMutation.mutate('quick'),
    runDeepChecks: () => args.runChecksMutation.mutate('deep'),
  }
}
