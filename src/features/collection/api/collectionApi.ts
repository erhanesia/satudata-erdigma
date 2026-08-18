import { apiGet } from '@/shared/api/httpClient'
import type { Collection } from '@/shared/types/api'

const BASE = '/api/v1/collections'

export function fetchCollections(signal?: AbortSignal): Promise<Collection[]> {
  return apiGet<Collection[]>(BASE, { signal })
}

export function fetchCollection(slug: string, signal?: AbortSignal): Promise<Collection> {
  return apiGet<Collection>(`${BASE}/${encodeURIComponent(slug)}`, { signal })
}
