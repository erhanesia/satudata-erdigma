import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'

import { fetchAuditLogs, fetchDownloadLogs } from '../api/adminApi'

/**
 * Jejak audit. `enabled` dipakai halaman Log supaya tab yang tidak terlihat
 * tidak ikut memanggil — log unduhan berisi puluhan ribu baris, dan menariknya
 * hanya karena tab-nya ada di DOM itu pemborosan yang tidak terlihat.
 */
export function useAuditLogs(page: number, size: number, slug?: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.log.audit(page, size, slug),
    queryFn: ({ signal }) => fetchAuditLogs({ page, size, slug }, signal),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useDownloadLogs(
  page: number,
  size: number,
  from?: string,
  to?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.log.download(page, size, from, to),
    queryFn: ({ signal }) => fetchDownloadLogs({ page, size, from, to }, signal),
    enabled,
    placeholderData: keepPreviousData,
  })
}
