import { apiGet, apiPatch } from '@/shared/api/httpClient'
import type { PageOfUsers, PortalRole, UserAdmin } from '@/shared/types/api'

const BASE = '/api/v1/users'

export interface UserQuery {
  q?: string
  /** Berbasis 0, mengikuti Spring Data. */
  page?: number
  size?: number
}

export function fetchUsers(query: UserQuery, signal?: AbortSignal): Promise<PageOfUsers> {
  return apiGet<PageOfUsers>(BASE, { params: query, signal })
}

/**
 * `role: null` mengembalikan orang itu mengikuti HRIS.
 *
 * Dikirim eksplisit sebagai null, bukan dengan menghilangkan ruasnya: keduanya
 * diperlakukan sama oleh back-end, tapi yang eksplisit membuat maksudnya
 * terbaca di Network tab saat ada yang perlu ditelusuri.
 */
export function updateUserRole(id: string, role: PortalRole | null): Promise<UserAdmin> {
  return apiPatch<UserAdmin>(`${BASE}/${encodeURIComponent(id)}/role`, { role })
}
