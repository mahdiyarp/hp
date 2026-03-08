import { renderHook } from '@testing-library/react'
import { vi } from 'vitest'

import { useDeveloperCoreQueries } from './page-core-queries-hook'

const useQueryMock = vi.fn(() => ({ data: undefined, isLoading: false, refetch: vi.fn() }))

vi.mock('@tanstack/react-query', () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}))

describe('useDeveloperCoreQueries', () => {
  beforeEach(() => {
    useQueryMock.mockClear()
  })

  it('registers all expected core queries with their intervals', () => {
    renderHook(() => useDeveloperCoreQueries())

    expect(useQueryMock).toHaveBeenCalledTimes(11)

    const calls = useQueryMock.mock.calls.map((call) => call[0] as { queryKey: string[]; refetchInterval: number })

    expect(calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ queryKey: ['core-status'], refetchInterval: 7000 }),
        expect.objectContaining({ queryKey: ['core-agents'], refetchInterval: 7000 }),
        expect.objectContaining({ queryKey: ['core-activity'], refetchInterval: 12000 }),
        expect.objectContaining({ queryKey: ['core-snapshots'], refetchInterval: 30000 }),
        expect.objectContaining({ queryKey: ['core-models'], refetchInterval: 15000 }),
        expect.objectContaining({ queryKey: ['core-self-completion-status'], refetchInterval: 12000 }),
        expect.objectContaining({ queryKey: ['core-task-graph'], refetchInterval: 12000 }),
        expect.objectContaining({ queryKey: ['core-failover-status'], refetchInterval: 12000 }),
        expect.objectContaining({ queryKey: ['core-checks-last'], refetchInterval: 20000 }),
        expect.objectContaining({ queryKey: ['core-mission-audit'], refetchInterval: 20000 }),
        expect.objectContaining({ queryKey: ['core-operator-readiness'], refetchInterval: 20000 }),
      ]),
    )
  })
})
