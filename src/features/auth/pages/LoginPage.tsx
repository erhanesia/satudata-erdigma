import { useQueryClient } from '@tanstack/react-query'

import logoErdigma from '@/shared/assets/logo-erdigma-mark.png'
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
import { useCurrentUser } from '../hooks/useCurrentUser'
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
/**
 * Beranda yang sesuai peran.
 *
 * Admin mendarat di panel admin, sisanya di portal biasa. Ini pengalihan saat
 * masuk, bukan kurungan: admin tetap bisa membuka panel pengguna lewat URL,
 * karena mereka juga perlu melihat katalog seperti yang dilihat orang lain.
 *
 * Tujuan tersimpan menang atas aturan ini — kalau seseorang membuka tautan
 * dataset lalu diminta masuk, ia harus mendarat di dataset itu, bukan di
 * dashboard.
 */
function homeForRole(role: string): string {
  return role === 'ADMIN' ? paths.admin : paths.home
}

export default function LoginPage() {
  const [pickerOpen, setPickerOpen] = useState(false)
  const signedIn = useAuthSession()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  // Halaman yang tadi hendak dibuka sebelum dialihkan ke sini, dipasang oleh
  // ProtectedRoute.
  //
  // Beranda "/" sengaja TIDAK dihitung sebagai tujuan. ProtectedRoute
  // menyimpannya setiap kali seseorang membuka akar aplikasi dalam keadaan
  // belum masuk — dan itu berarti "tidak menuju apa-apa", bukan permintaan
  // sadar untuk mendarat di panel pengguna. Tanpa pengecualian ini, admin
  // selalu berakhir di panel pengguna karena "/" mengalahkan aturan peran.
  const stored = readRedirectTarget(location.state)
  const specificTarget = stored && stored !== paths.home ? stored : null

  // Sesi yang sudah ada sebelum halaman ini dibuka — misalnya karena tab lama
  // masih memegang sessionStorage. Perannya HARUS dibaca dari server, bukan
  // dari daftar identitas lokal, karena di mode Cognito daftar itu tidak ada.
  const { data: activeUser, isPending: loadingIdentity } = useCurrentUser()

  if (signedIn) {
    // Menunggu /me sebelum mengalihkan. Menebak lebih dulu lalu memperbaiki
    // setelahnya membuat admin melihat panel pengguna berkedip sekilas — dan
    // kalau /me lambat, mereka tertinggal di sana.
    if (loadingIdentity) {
      return null
    }
    return (
      <Navigate to={specificTarget ?? homeForRole(activeUser?.role ?? '')} replace />
    )
  }

  function startSignIn() {
    if (authStrategy.mode === 'dummy') {
      setPickerOpen(true)
      return
    }

    try {
      // Tidak pernah kembali: pemanggilan ini meninggalkan halaman.
      authStrategy.signIn()
    } catch (error) {
      toast.show(error instanceof Error ? error.message : 'Gagal memulai proses masuk.')
    }
  }

  function signInAs(identity: DummyIdentity) {
    authStrategy.signIn(identity.cognitoSub)
    // Seluruh cache dibuang, bukan hanya /me: daftar API key bersifat
    // per-pengguna. Menyisakannya berarti menampilkan data milik orang
    // sebelumnya.
    queryClient.clear()
    setPickerOpen(false)
    void navigate(specificTarget ?? homeForRole(identity.role), { replace: true })
  }

  return (
    <div className="bg-surface-50 flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-5 sm:py-12">
      <div className="w-full max-w-[440px]">
        <div className="flex flex-col items-center text-center">
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

          <Button size="lg" className="mt-7 w-full" onClick={startSignIn}>
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

      <IdentityPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={signInAs}
      />

      {/* Halaman ini di luar RootLayout, jadi Toaster miliknya tidak ikut
          terpasang. Tanpa baris ini, pesan galat mode Cognito tidak akan
          pernah terlihat. */}
      <Toaster />
    </div>
  )
}

function IdentityPicker({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (identity: DummyIdentity) => void
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Pilih identitas uji"
      description="Karyawan tiruan untuk pengujian lokal: sepuluh identitas awal ditambah satu akun untuk setiap posisi akses. Jenjang jabatan memakai nilai enum JobLevel milik hris-api."
      className="max-w-3xl"
    >
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {DUMMY_IDENTITIES.map((identity) => (
          <li key={identity.cognitoSub}>
            <button
              type="button"
              onClick={() => onSelect(identity)}
              className="border-line-200 hover:border-brand-border hover:bg-brand-tint/40 focus-visible:outline-brand flex w-full items-start gap-3 rounded-[var(--radius-card)] border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                style={{ backgroundColor: identity.divisionColor }}
                aria-hidden
              >
                {initialsOf(identity.name)}
              </span>

              <span className="min-w-0 flex-1">
                <span className="text-ink-900 block truncate text-sm font-bold">
                  {identity.name}
                </span>
                <span className="text-ink-600 block truncate text-[12.5px] font-medium">
                  {identity.position}
                </span>

                <span className="mt-1.5 flex flex-wrap items-center gap-1">
                  <Badge tone="neutral">{identity.divisionCode}</Badge>
                  <Badge tone="neutral">{identity.jobLevel}</Badge>
                  <Badge tone={identity.role === 'STAFF' ? 'neutral' : 'brand'}>
                    {identity.role}
                  </Badge>
                  {identity.cognitoSub === 'dummy-resigned' ? (
                    <Badge tone="danger">resign</Badge>
                  ) : null}
                </span>

                {identity.note ? (
                  <span className="text-ink-500 mt-1.5 block text-[11.5px] leading-snug">
                    {identity.note}
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
function readRedirectTarget(state: unknown): string | null {
  if (typeof state !== 'object' || state === null) return null
  const fromDate = (state as { from?: unknown }).from
  // Hanya jalur relatif yang diterima. Tanpa pemeriksaan ini, sebuah tautan
  // bisa menyelipkan alamat luar dan halaman login berubah jadi pengalih terbuka.
  return typeof fromDate === 'string' && fromDate.startsWith('/') && !fromDate.startsWith('//') ? fromDate : null
}
