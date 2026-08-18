import { Outlet, ScrollRestoration } from 'react-router-dom'

import { Toaster } from '@/shared/components/ui/Toaster'

import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Tautan lewati — hanya tampak saat difokuskan dengan Tab. Tanpa ini,
          pengguna papan ketik harus melewati seluruh navigasi di setiap
          halaman sebelum sampai ke isi. */}
      <a href="#konten" className="skip-link">
        Lewati ke konten utama
      </a>

      <SiteHeader />

      <main id="konten" className="flex-1">
        <Outlet />
      </main>

      <SiteFooter />
      <Toaster />

      {/* Mengembalikan posisi gulir saat menekan tombol Kembali, dan menggulir
          ke atas saat membuka halaman baru. */}
      <ScrollRestoration />
    </div>
  )
}
