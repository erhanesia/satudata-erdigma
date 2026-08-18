import type { UseQueryResult } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { ErrorState } from './StateViews'

interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>
  /** Tampilan selama memuat — biasanya Skeleton yang menyerupai isi aslinya. */
  loading: ReactNode
  children: (data: T) => ReactNode
}

/**
 * Menyatukan tiga keadaan setiap permintaan data: memuat, gagal, berhasil.
 *
 * Tanpa ini, tiap halaman menulis rantai `if (isLoading) … if (isError) …`
 * sendiri, dan cepat atau lambat ada yang lupa menangani salah satunya —
 * biasanya keadaan gagal, yang justru paling jarang terlihat saat pengembangan.
 */
export function QueryBoundary<T>({ query, loading, children }: QueryBoundaryProps<T>) {
  if (query.isPending) return <>{loading}</>
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  return <>{children(query.data)}</>
}
