import { ShieldX } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuthSession } from '@/features/auth/hooks/useAuthSession'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { useSignOut } from '@/features/auth/hooks/useSignOut'
import { ApiError } from '@/shared/api/errors'
import { Button } from '@/shared/components/ui/Button'

import { RouteFallback } from './RouteFallback'
import { paths } from './paths'

/**
 * Penjaga rute — seluruh aplikasi ada di baliknya.
 *
 * Tidak ada halaman publik di portal ini: bahkan beranda memerlukan
 * `GET /api/v1/stats`, dan back-end hanya membuka Swagger tanpa autentikasi.
 * Menggerbangi semuanya sekaligus lebih jujur daripada membiarkan halaman
 * terbuka lalu setiap kotaknya menampilkan galat.
 *
 * Ini penjaga tampilan, bukan penjaga keamanan. Yang sesungguhnya menolak tetap
 * `SecurityConfig` di back-end — penjaga ini cuma mencegah pengguna melihat
 * kerangka halaman yang isinya pasti gagal dimuat.
 */
export function ProtectedRoute() {
  const sudahMasuk = useAuthSession()
  const location = useLocation()

  if (!sudahMasuk) {
    return (
      <Navigate
        to={paths.login}
        replace
        // Supaya setelah masuk pengguna mendarat di halaman yang tadi dituju,
        // bukan dilempar ke beranda dan harus mencari ulang.
        state={{ from: location.pathname + location.search }}
      />
    )
  }

  return <GerbangIdentitas />
}

/**
 * Memastikan sesi yang ada benar-benar diterima server sebelum halaman apa pun
 * dirender.
 *
 * Perlu karena di mode dummy "masuk" tidak menyentuh jaringan sama sekali —
 * cukup memilih nama dari daftar. Karyawan yang sudah resign tetap bisa dipilih,
 * dan penolakannya baru muncul di permintaan pertama. Tanpa gerbang ini,
 * pengguna itu akan melihat seluruh portal terbuka dengan tiap kotak berisi
 * pesan galat, bukan satu kalimat yang menjelaskan kenapa ia ditolak.
 *
 * Permintaannya tidak menambah beban: `/me` memang sudah dipanggil header di
 * setiap halaman, dan react-query menyatukan keduanya dalam satu permintaan.
 */
function GerbangIdentitas() {
  const { isPending, isError, error } = useCurrentUser()
  const keluar = useSignOut()

  if (isPending) {
    return <RouteFallback />
  }

  if (isError) {
    // 401 berarti interceptor sudah membersihkan sesi; render berikutnya akan
    // dialihkan ProtectedRoute ke halaman login. Dialihkan di sini juga supaya
    // layar penolakan di bawah tidak sempat berkedip.
    if (error instanceof ApiError && error.kind === 'unauthorized') {
      return <Navigate to={paths.login} replace />
    }

    const pesan =
      error instanceof ApiError ? error.message : 'Terjadi kesalahan yang tidak diketahui.'

    return (
      <div className="bg-surface-50 flex min-h-screen items-center justify-center px-5 py-12">
        <div className="w-full max-w-[440px] text-center">
          <span className="bg-danger-bg text-danger mx-auto mb-5 flex size-[52px] items-center justify-center rounded-[14px]">
            <ShieldX className="size-7" strokeWidth={2.2} />
          </span>

          <h1 className="text-ink-900 text-[22px] font-extrabold tracking-[-0.5px]">
            Akun tidak dapat digunakan
          </h1>
          <p className="text-ink-600 mt-2 text-[14.5px] leading-relaxed font-medium">{pesan}</p>

          <Button variant="secondary" className="mt-6" onClick={keluar}>
            Kembali ke halaman masuk
          </Button>
        </div>
      </div>
    )
  }

  return <Outlet />
}
