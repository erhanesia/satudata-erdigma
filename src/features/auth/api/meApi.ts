import { apiGet } from '@/shared/api/httpClient'
import type { CurrentUser } from '@/shared/types/api'

/**
 * Identitas pengguna yang sedang masuk.
 *
 * Ini satu-satunya sumber kebenaran identitas di front-end. Token JWT memang
 * bisa dibaca sendiri di browser lewat jwt-decode, tapi isinya tidak boleh
 * dipercaya untuk otorisasi: siapa pun bisa menyunting payload token di
 * DevTools. Peran dan divisi harus datang dari server.
 */
export function fetchCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  return apiGet<CurrentUser>('/api/v1/me', { signal })
}
