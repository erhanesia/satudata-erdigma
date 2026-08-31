import { Navigate, Outlet } from 'react-router-dom'

import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'

import { paths } from './paths'

/**
 * Menggerbangi seluruh panel admin.
 *
 * Dipasang DI DALAM `ProtectedRoute`, jadi saat sampai di sini identitasnya
 * sudah dipastikan diterima server — tidak perlu menangani status memuat
 * maupun galat lagi.
 *
 * Yang bukan admin dialihkan ke beranda panel pengguna, bukan diberi layar
 * "akses ditolak". Mereka tidak melakukan kesalahan apa pun; panel ini memang
 * bukan untuk mereka, dan tidak ada tautan menuju ke sini dari panel pengguna.
 *
 * Ini penjaga tampilan, bukan penjaga keamanan. Yang sesungguhnya menolak tetap
 * `@PreAuthorize` di back-end.
 */
export function AdminRoute() {
  const { data: user } = useCurrentUser()

  if (user?.role !== 'ADMIN') {
    return <Navigate to={paths.home} replace />
  }

  return <Outlet />
}
