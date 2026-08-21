import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Dialog } from '@/shared/components/ui/Dialog'
import { Toaster } from '@/shared/components/ui/Toaster'
import { useToast } from '@/shared/components/ui/toastStore'
import { env } from '@/shared/config/env'

import { useAuthSession } from '../hooks/useAuthSession'
import { authStrategy } from '../model/authStrategy'
import { DUMMY_IDENTITIES, initialsOf, type DummyIdentity } from '../model/types'

/**
 * Halaman masuk.
 *
 * Bentuknya sudah final sejak sekarang: satu tombol, persis seperti yang akan
 * dilihat pengguna setelah Cognito tersambung. Yang berbeda hanya apa yang
 * terjadi setelah tombol ditekan — di mode dummy membuka pemilih identitas, di
 * mode Cognito me-redirect ke Hosted UI. Karena itu tidak ada bagian halaman
 * ini yang perlu dibuang saat integrasi.
 *
 * hris-api tidak punya endpoint login sama sekali: `AuthenticationController`
 * hanya mengurus pembuatan user dan reset kata sandi lewat Cognito. Login di
 * sana terjadi sepenuhnya di sisi klien, dan API cuma pernah melihat JWT jadi.
 * Itu sebabnya di sini tidak ada kolom kata sandi — Satu Data tidak akan pernah
 * memeriksanya, jadi menampilkannya cuma akan menyesatkan.
 */
export default function LoginPage() {
  const [pemilihTerbuka, setPemilihTerbuka] = useState(false)
  const sudahMasuk = useAuthSession()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  // Halaman yang tadi hendak dibuka sebelum dialihkan ke sini. Dipasang oleh
  // ProtectedRoute; kalau seseorang membuka /login langsung, jatuh ke beranda.
  const tujuan = ambilTujuan(location.state) ?? paths.home

  if (sudahMasuk) {
    return <Navigate to={tujuan} replace />
  }

  async function mulaiMasuk() {
    if (authStrategy.mode === 'dummy') {
      setPemilihTerbuka(true)
      return
    }

    try {
      // Ditunggu: panggilannya sendiri kembali segera, pengalihan ke Hosted
      // UI terjadi satu microtask kemudian — tanpa `await` galat sebelum itu
      // (crypto.subtle tak ada, sessionStorage penuh) jadi unhandled rejection senyap.
      await authStrategy.signIn()
    } catch (galat) {
      toast.show(galat instanceof Error ? galat.message : 'Gagal memulai proses masuk.')
    }
  }

  function masukSebagai(identitas: DummyIdentity) {
    authStrategy.signIn(identitas.cognitoSub)
    // Seluruh cache dibuang, bukan hanya /me: daftar API key bersifat
    // per-pengguna. Menyisakannya berarti menampilkan data milik orang
    // sebelumnya.
    queryClient.clear()
    setPemilihTerbuka(false)
    void navigate(tujuan, { replace: true })
  }

  return (
    <div className="bg-surface-50 flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-[440px]">
        <div className="flex flex-col items-center text-center">
          <span className="bg-brand mb-5 flex size-[52px] items-center justify-center rounded-[14px]">
            <svg
              width={28}
              height={28}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth={2.4}
              aria-hidden
            >
              <path d="M4 19V9M10 19V4M16 19v-7M22 19H2" />
            </svg>
          </span>

          <h1 className="text-ink-900 text-[30px] leading-tight font-extrabold tracking-[-1px]">
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

        {env.authMode === 'dummy' ? (
          <div className="bg-warning-bg border-warning/25 text-warning mt-6 flex gap-2.5 rounded-[var(--radius-card)] border p-3.5">
            <AlertTriangle className="mt-px size-[18px] shrink-0" strokeWidth={2.3} />
            <p className="text-[13px] leading-relaxed font-semibold">
              Mode pengembangan — autentikasi dummy. Identitas dipilih dari
              daftar, tanpa kata sandi dan tanpa verifikasi. Build produksi
              menolak mode ini.
            </p>
          </div>
        ) : null}
      </div>

      <PemilihIdentitas
        open={pemilihTerbuka}
        onOpenChange={setPemilihTerbuka}
        onPilih={masukSebagai}
      />

      {/* Halaman ini di luar RootLayout, jadi Toaster miliknya tidak ikut
          terpasang. Tanpa baris ini, pesan galat mode Cognito tidak akan
          pernah terlihat. */}
      <Toaster />
    </div>
  )
}

function PemilihIdentitas({
  open,
  onOpenChange,
  onPilih,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPilih: (identitas: DummyIdentity) => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pilih identitas uji"
      description="Sepuluh karyawan tiruan, mewakili kedelapan divisi dan kelima tingkat izin HRIS. Jenjang jabatan diambil dari enum JobLevel milik hris-api."
      className="max-w-3xl"
    >
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {DUMMY_IDENTITIES.map((identitas) => (
          <li key={identitas.cognitoSub}>
            <button
              type="button"
              onClick={() => onPilih(identitas)}
              className="border-line-200 hover:border-brand-border hover:bg-brand-tint/40 focus-visible:outline-brand flex w-full items-start gap-3 rounded-[var(--radius-card)] border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                style={{ backgroundColor: identitas.divisionColor }}
                aria-hidden
              >
                {initialsOf(identitas.name)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="text-ink-900 block truncate text-sm font-bold">
                  {identitas.name}
                </span>
                <span className="text-ink-600 block truncate text-[12.5px] font-medium">
                  {identitas.position}
                </span>

                <span className="mt-1.5 flex flex-wrap items-center gap-1">
                  <Badge tone="neutral">{identitas.divisionCode}</Badge>
                  <Badge tone="neutral">{identitas.jobLevel}</Badge>
                  <Badge tone={identitas.role === 'STAFF' ? 'neutral' : 'brand'}>
                    {identitas.role}
                  </Badge>
                  {identitas.cognitoSub === 'dummy-resigned' ? (
                    <Badge tone="danger">resign</Badge>
                  ) : null}
                </span>

                {identitas.note ? (
                  <span className="text-ink-500 mt-1.5 block text-[11.5px] leading-snug">
                    {identitas.note}
                  </span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Dialog>
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
