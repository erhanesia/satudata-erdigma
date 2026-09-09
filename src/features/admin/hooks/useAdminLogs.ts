import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'

import type { AccessType } from '../api/adminApi'
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
  accessType?: AccessType,
  enabled = true,
) {
  return useQuery({
    // `accessType` wajib ikut jadi kunci. Tanpa itu, mengganti penyaring
    // mengembalikan hasil penyaring sebelumnya dari cache, dan tabelnya
    // terlihat seperti tidak menanggapi apa pun.
    queryKey: queryKeys.log.download(page, size, from, to, accessType),
    queryFn: ({ signal }) =>
      fetchDownloadLogs({ page, size, from, to, accessType }, signal),
    enabled,
    placeholderData: keepPreviousData,
  })
}
