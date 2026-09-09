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

/**
 * Jenis akses yang dicatat tabel log.
 *
 * Nilainya kode yang dipakai back-end, bukan tulisan yang dibaca orang.
 * Terjemahannya ke "Dibuka" dan "Diunduh" ada di halaman Log, satu tempat
 * saja, supaya kata yang tampil bisa diubah tanpa menyentuh permintaan yang
 * dikirim ke server.
 */
export type AccessType = 'DOWNLOAD' | 'PREVIEW'

export interface DownloadLogQuery {
  page?: number
  size?: number
  /** Format YYYY-MM-DD. */
  from?: string
  /** Format YYYY-MM-DD, inklusif. */
  to?: string
  /** Dikosongkan berarti kedua jenis akses. */
  accessType?: AccessType
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
/*
  Penyaringnya ikut dikirim, dan itu bukan kelengkapan belaka.

  Berkas hasil ekspor memuat nama, email, dan alamat IP karyawan. Kalau
  ekspornya mengabaikan penyaring yang sedang dipakai, orang yang melihat
  belasan baris di layar menekan Export lalu membawa keluar puluhan ribu
  baris yang justru sengaja ia singkirkan.
*/
export function exportDownloadLogs(
  from?: string,
  to?: string,
  accessType?: AccessType,
) {
  return apiDownload('/api/v1/download-logs/export', {
    params: {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(accessType ? { accessType } : {}),
    },
    timeout: 120_000,
  })
}
