import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'

import { fetchDailyDownloads, fetchStats } from '../api/statsApi'

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: ({ signal }) => fetchStats(signal),
  })
}

/**
 * Unduhan per hari untuk grafik dasbor.
 *
 * `staleTime` panjang karena isinya hanya berubah saat ada unduhan baru, dan
 * satu unduhan tidak menggeser kurva 30 hari sedikit pun secara kasatmata.
 */
export function useDailyDownloads(days = 30) {
  return useQuery({
    queryKey: queryKeys.statsDailyDownloads(days),
    queryFn: ({ signal }) => fetchDailyDownloads(days, signal),
    staleTime: 5 * 60_000,
  })
}
