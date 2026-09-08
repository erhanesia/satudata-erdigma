import { apiGet } from '@/shared/api/httpClient'
import type { DailyDownloads, Stats } from '@/shared/types/api'

export function fetchStats(signal?: AbortSignal): Promise<Stats> {
  return apiGet<Stats>('/api/v1/stats', { signal })
}

/** Bahan grafik "Download harian" di dasbor admin. */
export function fetchDailyDownloads(days: number, signal?: AbortSignal): Promise<DailyDownloads> {
  return apiGet<DailyDownloads>('/api/v1/stats/downloads/daily', { params: { days }, signal })
}
