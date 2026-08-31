import { ArrowRight } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import logoErdigma from '@/shared/assets/logo-erdigma-mark.png'
import { Button } from '@/shared/components/ui/Button'
import { Toaster } from '@/shared/components/ui/Toaster'
import { useToast } from '@/shared/components/ui/toastStore'

import { useAuthSession } from '../hooks/useAuthSession'
import { authStrategy } from '../model/authStrategy'

/**
 * Halaman masuk. Satu tombol, tanpa kolom kata sandi.
 *
 * hris-api tidak punya endpoint login sama sekali: `AuthenticationController`
 * hanya mengurus pembuatan user dan reset kata sandi lewat Cognito. Login di
 * sana terjadi sepenuhnya di sisi klien, dan API cuma pernah melihat JWT jadi.
 * Itu sebabnya di sini tidak ada kolom kata sandi — Satu Data tidak akan pernah
 * memeriksanya, jadi menampilkannya cuma akan menyesatkan.
 */
export default function LoginPage() {
  const sudahMasuk = useAuthSession()
  const location = useLocation()
  const toast = useToast()

  // Halaman yang tadi hendak dibuka sebelum dialihkan ke sini. Dipasang oleh
  // ProtectedRoute; kalau seseorang membuka /login langsung, jatuh ke beranda.
  const tujuan = ambilTujuan(location.state) ?? paths.home

  if (sudahMasuk) {
    return <Navigate to={tujuan} replace />
  }

  async function mulaiMasuk() {
    try {
      // Ditunggu: panggilannya sendiri kembali segera, pengalihan ke Hosted
      // UI terjadi satu microtask kemudian — tanpa `await` galat sebelum itu
      // (crypto.subtle tak ada, sessionStorage penuh) jadi unhandled rejection senyap.
      await authStrategy.signIn()
    } catch (galat) {
      toast.show(galat instanceof Error ? galat.message : 'Gagal memulai proses masuk.')
    }
  }

  return (
    <div className="bg-surface-50 flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-5 sm:py-12">
      <div className="w-full max-w-[440px]">
        <div className="flex flex-col items-center text-center">
          {/* Logo yang sama dengan header, dari berkas — bukan digambar ulang
              dengan <path>. Dua versi logo yang dipelihara terpisah pasti
              menyimpang cepat atau lambat. */}
          <img
            src={logoErdigma}
            alt=""
            width={52}
            height={52}
            className="mb-5 size-[52px] shrink-0"
          />

          <h1 className="text-ink-900 text-[25px] leading-tight font-extrabold tracking-[-1px] sm:text-[30px]">
            Satu Data <span className="text-brand">Erdigma</span>
          </h1>
          <p className="text-ink-600 mt-2 text-[15px] font-medium">
            Portal data internal PT Erdigma. Masuk dengan akun perusahaan untuk
            menjelajah katalog.
          </p>

          <Button size="lg" className="mt-7 w-full" onClick={mulaiMasuk}>
            Masuk dengan akun Erdigma
            <ArrowRight className="size-[18px]" strokeWidth={2.4} />
          </Button>
        </div>
      </div>

      {/* Halaman ini di luar RootLayout, jadi Toaster miliknya tidak ikut
          terpasang. Tanpa baris ini, pesan galat mode Cognito tidak akan
          pernah terlihat. */}
      <Toaster />
    </div>
  )
}

/** `location.state` bertipe `unknown` — diperiksa, bukan di-cast. */
function ambilTujuan(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null
  const dari = (state as { from?: unknown }).from
  // Hanya jalur relatif yang diterima. Tanpa pemeriksaan ini, sebuah tautan
  // bisa menyelipkan alamat luar dan halaman login berubah jadi pengalih terbuka.
  return typeof dari === 'string' && dari.startsWith('/') && !dari.startsWith('//') ? dari : null
}
