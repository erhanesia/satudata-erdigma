import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'

import { fetchCurrentUser } from '../api/meApi'

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    // Identitas tidak berubah selama sesi berjalan. Menyimpannya lebih lama
    // menghindari permintaan /me berulang di tiap perpindahan halaman.
    staleTime: 10 * 60_000,
  })
}
