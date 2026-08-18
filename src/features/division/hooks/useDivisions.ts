import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'

import { fetchDivisions } from '../api/divisionApi'

export function useDivisions() {
  return useQuery({
    queryKey: queryKeys.division.list,
    queryFn: ({ signal }) => fetchDivisions(signal),
    staleTime: 30 * 60_000,
  })
}
