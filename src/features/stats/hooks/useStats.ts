import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'

import { fetchStats } from '../api/statsApi'

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: ({ signal }) => fetchStats(signal),
  })
}
