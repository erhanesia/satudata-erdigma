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
if (await bootstrapAuth()) {
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
