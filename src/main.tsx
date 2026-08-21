import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { AppErrorBoundary } from '@/app/providers/AppErrorBoundary'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { bootstrapAuth } from '@/features/auth/model/authStrategy'

import '@/styles/index.css'

const wadah = document.getElementById('root')
if (!wadah) throw new Error('Elemen #root tidak ditemukan di index.html')

// Autentikasi diselesaikan lebih dulu, karena keduanya mengubah alamat halaman
// sebelum router membacanya: kepulangan dari Hosted UI membuang `?code=` dan
// mengembalikan tujuan semula, sedangkan re-auth senyap justru meninggalkan
// halaman ini sama sekali. Merender lebih dulu berarti pengguna sempat melihat
// halaman masuk berkedip untuk sesi yang sebenarnya masih hidup.
//
// history.replaceState dan sessionStorage yang dipakai bootstrap bisa
// melempar (mis. SecurityError, QuotaExceededError di mode privat) sebelum
// sempat memutuskan render atau tidak. Halaman kosong tanpa jalan keluar
// lebih buruk daripada diarahkan ke halaman masuk untuk mencoba lagi.
let lanjutkanRender = true
try {
  lanjutkanRender = await bootstrapAuth()
} catch (error) {
  console.error('Bootstrap autentikasi gagal, arahkan ke halaman masuk.', error)
  try {
    window.history.replaceState(null, '', '/login')
  } catch {
    // Diabaikan: gagal dengan sebab yang sama seperti di atas. Tetap render
    // supaya router masih bisa menangani alamat yang ada sekarang.
  }
}

if (lanjutkanRender) {
  // Diimpor secara dinamis DI SINI, bukan di atas sebagai import statis: modul
  // ini memanggil createBrowserRouter() saat dievaluasi, dan react-router
  // membaca alamat halaman tepat saat itu juga lalu hanya menyimak popstate
  // sesudahnya. replaceState() yang dipakai completeSignIn() untuk membuang
  // ?code=&state= dan mengembalikan tujuan semula TIDAK memicu popstate. Kalau
  // import ini statis, evaluasi modul (dan snapshot alamatnya) terjadi sebelum
  // baris `await bootstrapAuth()` di atas sempat berjalan, sehingga router
  // selalu membaca "/" — persis gejala di temuan awal: kandidat mendarat di
  // Beranda meski tujuannya /datasets. Jangan "dirapikan" balik jadi import
  // statis tanpa mengulang analisis ini.
  const { router } = await import('@/app/router/router')

  createRoot(wadah).render(
    <StrictMode>
      <AppErrorBoundary>
        <QueryProvider>
          <RouterProvider router={router} />
        </QueryProvider>
      </AppErrorBoundary>
    </StrictMode>,
  )
}
