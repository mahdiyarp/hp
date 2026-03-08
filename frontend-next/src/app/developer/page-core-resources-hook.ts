import type { Dispatch, SetStateAction } from 'react'

import { useDeveloperCoreMutations } from './page-core-mutations-hook'
import { useDeveloperCoreQueries } from './page-core-queries-hook'

type ChatMessage = { role: 'user' | 'assistant'; content: string; ts: string }

type UseDeveloperCoreResourcesInput = {
  setCommandResult: (value: string) => void
  setTaskPrompt: (value: string) => void
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
}

export function useDeveloperCoreResources(input: UseDeveloperCoreResourcesInput) {
  const queries = useDeveloperCoreQueries()

  const mutations = useDeveloperCoreMutations({
    setCommandResult: input.setCommandResult,
    setTaskPrompt: input.setTaskPrompt,
    setChatMessages: input.setChatMessages,
    refetchStatus: () => {
      void queries.refetchStatus()
    },
    refetchAgents: () => {
      void queries.refetchAgents()
    },
    refetchModels: () => {
      void queries.refetchModels()
    },
    refetchFailoverStatus: () => {
      void queries.refetchFailoverStatus()
    },
    refetchChecksLast: () => {
      void queries.refetchChecksLast()
    },
    refetchMissionAudit: () => {
      void queries.refetchMissionAudit()
    },
    refetchOperatorReadiness: () => {
      void queries.refetchOperatorReadiness()
    },
  })

  return {
    ...queries,
    ...mutations,
  }
}
