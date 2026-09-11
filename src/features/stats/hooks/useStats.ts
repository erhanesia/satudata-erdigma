import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'

import { fetchAdminDailyDownloads, fetchAdminStats, fetchStats } from '../api/statsApi'

export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: ({ signal }) => fetchStats(signal),
  })
}

/**
 * Angka dasbor panel admin, dibatasi divisi si admin.
 *
 * {@link useStats} tetap dipakai beranda portal, yang dilihat seluruh
 * karyawan dan memang harus meringkas seluruh katalog. Menyaringnya di sana
 * membuat angka di beranda menyusut berbeda-beda bagi tiap orang yang
 * membukanya, yaitu perubahan pada halaman yang justru tidak boleh berubah.
 */
export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: ({ signal }) => fetchAdminStats(signal),
  })
}

/**
 * Unduhan per hari untuk grafik dasbor panel admin, dibatasi divisi.
 *
 * `staleTime` panjang karena isinya hanya berubah saat ada unduhan baru, dan
 * satu unduhan tidak menggeser kurva 30 hari sedikit pun secara kasatmata.
 */
export function useAdminDailyDownloads(days = 30) {
  return useQuery({
    queryKey: queryKeys.adminStatsDailyDownloads(days),
    queryFn: ({ signal }) => fetchAdminDailyDownloads(days, signal),
    staleTime: 5 * 60_000,
  })
}
