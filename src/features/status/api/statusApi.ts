import { apiGet } from '@/shared/api/httpClient'
import type { Status } from '@/shared/types/api'

export function fetchStatus(signal?: AbortSignal): Promise<Status> {
  return apiGet<Status>('/api/v1/status', { signal })
}
