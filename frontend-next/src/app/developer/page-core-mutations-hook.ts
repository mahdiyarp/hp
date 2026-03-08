import { useMutation } from '@tanstack/react-query'
import type { Dispatch, SetStateAction } from 'react'

import { api } from '@/lib/api-client'
import { appendAssistantChatMessage, resolveAssistantReply } from './page-chat-logic'
import {
  buildRefetchOnSuccessHandler,
  formatChecksRunResult,
  formatCoreCommandResult,
  formatFailoverCheckResult,
  formatQuickStabilizeResult,
  formatSelfCompletionRunResult,
  formatSnapshotCreateResult,
  resolveMutationErrorMessage,
} from './page-mutation-logic'

type ChatMessage = { role: 'user' | 'assistant'; content: string; ts: string }
type ChecksMode = 'quick' | 'deep'

type UseDeveloperCoreMutationsInput = {
  setCommandResult: (value: string) => void
  setTaskPrompt: (value: string) => void
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
  refetchStatus: () => void
  refetchAgents: () => void
  refetchModels: () => void
  refetchFailoverStatus: () => void
  refetchChecksLast: () => void
  refetchMissionAudit: () => void
  refetchOperatorReadiness: () => void
}

export function useDeveloperCoreMutations(input: UseDeveloperCoreMutationsInput) {
  const refetchOperatorCards = () => {
    input.refetchMissionAudit()
    input.refetchOperatorReadiness()
  }

  const runCommandMutation = useMutation({
    mutationFn: (action: string) => api.post('/api/core/command', { action }),
    onSuccess: (res) => {
      input.setCommandResult(formatCoreCommandResult(res))
      input.refetchStatus()
      refetchOperatorCards()
    },
    onError: (err: unknown) => input.setCommandResult(resolveMutationErrorMessage(err, 'خطا در اجرای دستور')),
  })

  const sendTaskMutation = useMutation({
    mutationFn: (description: string) => api.post('/api/core/command', { action: 'run_task', target: description }),
    onSuccess: (res) => {
      input.setTaskPrompt('')
      input.setCommandResult(formatCoreCommandResult(res))
      input.refetchStatus()
      refetchOperatorCards()
    },
    onError: (err: unknown) => input.setCommandResult(resolveMutationErrorMessage(err, 'خطا در ارسال تسک')),
  })

  const startAgentMutation = useMutation({
    mutationFn: (agentId: string) => api.post(`/api/core/agents/${agentId}/start`),
    onSuccess: (_res, agentId) => {
      input.setCommandResult(formatCoreCommandResult({ ok: true, action: 'start_agent', target: agentId }))
      input.refetchAgents()
    },
    onError: (err: unknown) => input.setCommandResult(resolveMutationErrorMessage(err, 'خطا در شروع agent')),
  })

  const stopAgentMutation = useMutation({
    mutationFn: (agentId: string) => api.post(`/api/core/agents/${agentId}/stop`),
    onSuccess: (_res, agentId) => {
      input.setCommandResult(formatCoreCommandResult({ ok: true, action: 'stop_agent', target: agentId }))
      input.refetchAgents()
    },
    onError: (err: unknown) => input.setCommandResult(resolveMutationErrorMessage(err, 'خطا در توقف agent')),
  })

  const snapshotMutation = useMutation({
    mutationFn: () => api.post('/api/core/snapshots?label=manual-dashboard', {}),
    onSuccess: (res) => input.setCommandResult(formatSnapshotCreateResult(res)),
    onError: (err: unknown) => input.setCommandResult(resolveMutationErrorMessage(err, 'خطا در ایجاد Snapshot')),
  })

  const runSelfCompletionMutation = useMutation({
    mutationFn: () => api.post('/api/core/self-completion/run', {}),
    onSuccess: (res) => {
      input.setCommandResult(formatSelfCompletionRunResult(res))
      input.refetchStatus()
      refetchOperatorCards()
    },
    onError: (err: unknown) => input.setCommandResult(resolveMutationErrorMessage(err, 'خطا در اجرای self-completion')),
  })

  const activateModelMutation = useMutation({
    mutationFn: (payload: { provider: string; model_name: string }) => api.post('/api/core/models/activate', payload),
    onSuccess: (_res, payload) => {
      input.setCommandResult(
        formatCoreCommandResult({
          ok: true,
          action: 'switch_model',
          provider: payload.provider,
          model: payload.model_name,
          target: payload.model_name,
        }),
      )
      input.refetchStatus()
      input.refetchModels()
      input.refetchFailoverStatus()
      refetchOperatorCards()
    },
    onError: (err: unknown) => input.setCommandResult(resolveMutationErrorMessage(err, 'خطا در فعال سازی مدل')),
  })

  const runAiHpBootstrapMutation = useMutation({
    mutationFn: () => api.post('/api/core/ai-hp/bootstrap/run?background=true', {}),
    onSuccess: buildRefetchOnSuccessHandler([
      input.refetchStatus,
      input.refetchModels,
      input.refetchFailoverStatus,
      input.refetchMissionAudit,
      input.refetchOperatorReadiness,
    ]),
    onError: (err: unknown) => input.setCommandResult(resolveMutationErrorMessage(err, 'خطا در bootstrap مدل پایه ai_hp')),
  })

  const runFailoverCheckMutation = useMutation({
    mutationFn: () => api.post('/api/core/failover/check', {}),
    onSuccess: (res) => {
      input.setCommandResult(formatFailoverCheckResult(res))
      input.refetchStatus()
      input.refetchModels()
      input.refetchFailoverStatus()
      refetchOperatorCards()
    },
    onError: (err: unknown) => input.setCommandResult(resolveMutationErrorMessage(err, 'خطا در بررسی failover')),
  })

  const quickStabilizeMutation = useMutation({
    mutationFn: () => api.post('/api/core/command', { action: 'health_check' }),
    onSuccess: (res) => {
      input.setCommandResult(formatQuickStabilizeResult(res))
      input.refetchStatus()
      refetchOperatorCards()
    },
    onError: (err: unknown) => input.setCommandResult(resolveMutationErrorMessage(err, 'خطا در پایدارسازی سرویس')),
  })

  const runChecksMutation = useMutation({
    mutationFn: (mode: ChecksMode = 'quick') => api.post('/api/core/checks/run', { mode, force_restart: false }),
    onSuccess: (res) => {
      input.setCommandResult(formatChecksRunResult(res))
      input.refetchChecksLast()
      input.refetchStatus()
      refetchOperatorCards()
    },
    onError: (err: unknown) => input.setCommandResult(resolveMutationErrorMessage(err, 'خطا در اجرای چک ها')),
  })

  const chatMutation = useMutation({
    mutationFn: (message: string) => api.post('/api/assistant/chat', { message, mode: 'general' }),
    onSuccess: (res) => {
      input.setChatMessages((prev) => appendAssistantChatMessage(prev, resolveAssistantReply(res), new Date().toISOString()))
    },
    onError: () => {
      input.setChatMessages((prev) => appendAssistantChatMessage(prev, 'خطا در ارتباط با Core. دوباره تلاش کنید.', new Date().toISOString()))
    },
  })

  return {
    runCommandMutation,
    sendTaskMutation,
    startAgentMutation,
    stopAgentMutation,
    snapshotMutation,
    runSelfCompletionMutation,
    activateModelMutation,
    runAiHpBootstrapMutation,
    runFailoverCheckMutation,
    quickStabilizeMutation,
    runChecksMutation,
    chatMutation,
  }
}
