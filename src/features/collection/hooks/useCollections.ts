import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'

import { fetchCollection, fetchCollections } from '../api/collectionApi'

export function useCollections() {
  return useQuery({
    queryKey: queryKeys.collection.list,
    queryFn: ({ signal }) => fetchCollections(signal),
  })
}

export function useCollection(slug: string) {
  return useQuery({
    queryKey: queryKeys.collection.detail(slug),
    queryFn: ({ signal }) => fetchCollection(slug, signal),
    enabled: slug.length > 0,
  })
}
