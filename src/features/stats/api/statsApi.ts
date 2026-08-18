import { apiGet } from '@/shared/api/httpClient'
import type { Stats } from '@/shared/types/api'

export function fetchStats(signal?: AbortSignal): Promise<Stats> {
  return apiGet<Stats>('/api/v1/stats', { signal })
}
