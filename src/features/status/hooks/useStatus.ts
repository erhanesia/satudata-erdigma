import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'

import { fetchStatus } from '../api/statusApi'

export function useStatus() {
  return useQuery({
    queryKey: queryKeys.status,
    queryFn: ({ signal }) => fetchStatus(signal),
    // Halaman status memang untuk dipantau — segarkan tiap menit selama
    // halamannya terbuka.
    refetchInterval: 60_000,
    staleTime: 30_000,
  })
}
