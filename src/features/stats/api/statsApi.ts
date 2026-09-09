import { apiGet } from '@/shared/api/httpClient'
import type { DailyDownloads, Stats } from '@/shared/types/api'

export function fetchStats(signal?: AbortSignal): Promise<Stats> {
  return apiGet<Stats>('/api/v1/stats', { signal })
}

/*
  Kembaran tak-berbatas-divisi dari fetchAdminDailyDownloads sengaja TIDAK
  ada di sini, meskipun endpoint-nya ada di server.

  Grafik itu cuma digambar di satu tempat, yaitu dasbor panel admin, dan di
  sana angkanya harus dibatasi divisi. Fungsi tak terpakai yang mengembalikan
  angka seluruh katalog hanya menunggu dipanggil orang berikutnya yang
  menambah grafik di panel itu -- dan panggilan seperti itu tidak akan
  gagal, cuma memperlihatkan lebih banyak dari yang seharusnya.
*/

/**
 * Angka dasbor PANEL ADMIN, dibatasi divisi si admin.
 *
 * Yang TIDAK ikut dibatasi: jumlah topik, format, dan divisi. Ketiganya data
 * acuan bersama, bukan cerminan cakupan si admin; banyaknya team di Erdigma
 * tetap sama siapa pun yang bertanya. Kartu bertuliskan "Total divisi: 1"
 * akan terbaca seperti kerusakan, bukan seperti keterangan.
 */
export function fetchAdminStats(signal?: AbortSignal): Promise<Stats> {
  return apiGet<Stats>('/api/v1/admin/stats', { signal })
}

/** Kembaran berbatas divisi dari fetchDailyDownloads. */
export function fetchAdminDailyDownloads(
  days: number,
  signal?: AbortSignal,
): Promise<DailyDownloads> {
  return apiGet<DailyDownloads>('/api/v1/admin/stats/downloads/daily', {
    params: { days },
    signal,
  })
}
