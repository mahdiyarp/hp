import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api-client'
import type { ActivityItem, Agent, CoreFailoverStatus, CoreModelsResponse, CoreStatus, SelfCompletionStatus, Snapshot, TaskGraph } from './sections'

export type CoreChecksLastSummary = {
  ok: boolean
  summary_path?: string
  summary?: {
    timestamp?: string
    all_ok?: boolean
    checks?: Array<{ name?: string; ok?: boolean }>
  } | null
}

export type CoreMissionAudit = {
  ok: boolean
  done_count: number
  total: number
  all_done?: boolean
  checked_at?: string
  capabilities: Array<{
    id: number
    title: string
    done: boolean
    details?: Record<string, unknown>
  }>
}

export type CoreOperatorReadiness = {
  ok: boolean
  score: number
  status: string
  status_fa: string
  summary: string
  next_action: string
  done_count: number
  total: number
}

export function useDeveloperCoreQueries() {
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = useQuery<CoreStatus>({
    queryKey: ['core-status'],
    queryFn: () => api.get('/api/core/status'),
    refetchInterval: 7000,
  })

  const { data: agentsData, isLoading: agentsLoading, refetch: refetchAgents } = useQuery<{ agents: Agent[] }>({
    queryKey: ['core-agents'],
    queryFn: () => api.get('/api/core/agents'),
    refetchInterval: 7000,
  })

  const { data: activityData } = useQuery<{ activities: ActivityItem[] }>({
    queryKey: ['core-activity'],
    queryFn: () => api.get('/api/core/activity?limit=80'),
    refetchInterval: 12000,
  })

  const { data: snapshotsData } = useQuery<{ snapshots: Snapshot[] }>({
    queryKey: ['core-snapshots'],
    queryFn: () => api.get('/api/core/snapshots'),
    refetchInterval: 30000,
  })

  const { data: modelsData, refetch: refetchModels } = useQuery<CoreModelsResponse>({
    queryKey: ['core-models'],
    queryFn: () => api.get('/api/core/models'),
    refetchInterval: 15000,
  })

  const { data: selfCompletionData } = useQuery<SelfCompletionStatus>({
    queryKey: ['core-self-completion-status'],
    queryFn: () => api.get('/api/core/self-completion/status'),
    refetchInterval: 12000,
  })

  const { data: taskGraphData } = useQuery<TaskGraph>({
    queryKey: ['core-task-graph'],
    queryFn: () => api.get('/api/core/task-graph'),
    refetchInterval: 12000,
  })

  const { data: failoverStatusData, refetch: refetchFailoverStatus } = useQuery<CoreFailoverStatus>({
    queryKey: ['core-failover-status'],
    queryFn: () => api.get('/api/core/failover/status'),
    refetchInterval: 12000,
  })

  const { data: checksLastData, refetch: refetchChecksLast } = useQuery<CoreChecksLastSummary>({
    queryKey: ['core-checks-last'],
    queryFn: () => api.get('/api/core/checks/last'),
    refetchInterval: 20000,
  })

  const { data: missionAuditData, refetch: refetchMissionAudit } = useQuery<CoreMissionAudit>({
    queryKey: ['core-mission-audit'],
    queryFn: () => api.get('/api/core/mission/audit'),
    refetchInterval: 20000,
  })

  const { data: operatorReadinessData, refetch: refetchOperatorReadiness } = useQuery<CoreOperatorReadiness>({
    queryKey: ['core-operator-readiness'],
    queryFn: () => api.get('/api/core/operator/readiness'),
    refetchInterval: 20000,
  })

  return {
    status,
    statusLoading,
    refetchStatus,
    agentsData,
    agentsLoading,
    refetchAgents,
    activityData,
    snapshotsData,
    modelsData,
    refetchModels,
    selfCompletionData,
    taskGraphData,
    failoverStatusData,
    refetchFailoverStatus,
    checksLastData,
    refetchChecksLast,
    missionAuditData,
    refetchMissionAudit,
    operatorReadinessData,
    refetchOperatorReadiness,
  }
}
