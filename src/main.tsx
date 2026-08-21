import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { AppErrorBoundary } from '@/app/providers/AppErrorBoundary'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { router } from '@/app/router/router'
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
