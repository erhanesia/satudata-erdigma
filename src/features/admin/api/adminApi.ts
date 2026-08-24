import { apiDownload, apiGet } from '@/shared/api/httpClient'
import type { AuditLogPage, DownloadLogPage } from '@/shared/types/api'

/**
 * Lapisan HTTP panel admin: dua log yang hanya boleh dibaca ADMIN.
 *
 * Keduanya sengaja TIDAK dipanggil dari fitur lain. Isinya memuat nama orang
 * beserta apa yang mereka unduh dan ubah; kalau hook-nya tersedia di mana saja,
 * cepat atau lambat ada layar non-admin yang memakainya dan back-end menjawab
 * 403 di depan pengguna yang tidak tahu apa-apa.
 */

export interface AuditLogQuery {
  /** Berbasis 0, mengikuti Spring Data. */
  page?: number
  size?: number
  /** Saring ke satu dataset. */
  slug?: string
}

export interface DownloadLogQuery {
  page?: number
  size?: number
  /** Format YYYY-MM-DD. */
  from?: string
  /** Format YYYY-MM-DD, inklusif. */
  to?: string
}

export function fetchAuditLogs(
  query: AuditLogQuery,
  signal?: AbortSignal,
): Promise<AuditLogPage> {
  return apiGet<AuditLogPage>('/api/v1/audit-logs', { params: query, signal })
}

export function fetchDownloadLogs(
  query: DownloadLogQuery,
  signal?: AbortSignal,
): Promise<DownloadLogPage> {
  return apiGet<DownloadLogPage>('/api/v1/download-logs', { params: query, signal })
}

/**
 * Mengunduh log unduhan sebagai CSV.
 *
 * Lewat XHR seperti unduhan berkas lain: permintaan perlu membawa header
 * autentikasi, dan server mencatat ekspornya ke jejak audit sebelum bita
 * pertama dikirim.
 */
export function exportDownloadLogs(from?: string, to?: string) {
  return apiDownload('/api/v1/download-logs/export', {
    params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
    timeout: 120_000,
  })
}
