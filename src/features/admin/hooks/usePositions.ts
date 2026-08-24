import { useQuery } from '@tanstack/react-query'

import { apiGet } from '@/shared/api/httpClient'
import { queryKeys } from '@/shared/api/queryKeys'

/**
 * Daftar posisi jabatan dari `GET /api/v1/positions`.
 *
 * Isinya masih tetap di sisi back-end (enum `JobPosition`) sampai HRIS
 * tersambung. Tetap diambil lewat HTTP, bukan disalin ke konstanta di sini,
 * supaya begitu sumbernya berganti jadi HRIS tidak ada satu pun berkas
 * front-end yang perlu diubah.
 */
export function usePositions() {
  return useQuery({
    queryKey: queryKeys.taxonomy.positions,
    queryFn: ({ signal }) => apiGet<string[]>('/api/v1/positions', { signal }),
    staleTime: 30 * 60_000,
  })
}
