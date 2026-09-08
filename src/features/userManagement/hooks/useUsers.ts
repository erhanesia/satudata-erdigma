import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'

import { fetchUsers, type UserQuery } from '../api/userAdminApi'

export function useUsers(query: UserQuery) {
  return useQuery({
    queryKey: queryKeys.user.list(query),
    queryFn: ({ signal }) => fetchUsers(query, signal),
    // Daftar lama tetap tampil saat berpindah halaman atau mengetik pencarian,
    // supaya tabel tidak berkedip kosong.
    placeholderData: keepPreviousData,
  })
}
