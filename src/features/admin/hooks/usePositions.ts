import { useQuery } from '@tanstack/react-query'

import { apiGet } from '@/shared/api/httpClient'
import { queryKeys } from '@/shared/api/queryKeys'
import type { Position } from '@/shared/types/api'

/**
 * Daftar posisi jabatan dari `GET /api/v1/positions`.
 *
 * Sumbernya kini HRIS, diteruskan lewat portal ini saat dipanggil — bukan
 * disalin ke konstanta atau database portal, supaya perubahan di HRIS tidak
 * pernah basi di sini.
 *
 * **`id` yang diisikan ke `ruleValue`** sebuah aturan akses bertipe
 * `POSITION`; `name` cuma untuk ditampilkan ke pengguna. Nama posisi di HRIS
 * memuat salah ketik yang suatu saat diperbaiki, dan pembatasan berbasis nama
 * akan putus diam-diam begitu itu terjadi — makanya `id` yang dipakai, bukan
 * `name`.
 */
export function usePositions() {
  return useQuery({
    queryKey: queryKeys.taxonomy.positions,
    queryFn: ({ signal }) => apiGet<Position[]>('/api/v1/positions', { signal }),
    staleTime: 30 * 60_000,
  })
}
