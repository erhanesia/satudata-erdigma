import { apiGet } from '@/shared/api/httpClient'
import type { Division } from '@/shared/types/api'

export function fetchDivisions(signal?: AbortSignal): Promise<Division[]> {
  return apiGet<Division[]>('/api/v1/divisions', { signal })
}
