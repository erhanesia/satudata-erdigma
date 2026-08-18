import { LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import logoErdigma from '@/shared/assets/logo-erdigma-mark.png'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { useSignOut } from '@/features/auth/hooks/useSignOut'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { useToast } from '@/shared/components/ui/toastStore'
import { cn } from '@/shared/lib/cn'

/**
 * Navigasi persis seperti desain: hanya Datasets dan Divisi.
 *
 * Halaman lain dicapai lewat jalurnya masing-masing, sama seperti prototipe —
 * Dokumentasi API dan Koleksi dari halaman detail dataset, dan Dasbor dari pil
 * identitas di kanan.
 */
const NAV = [
  { to: paths.datasets, label: 'Datasets' },
  { to: paths.divisions, label: 'Divisi' },
] as const

export function SiteHeader() {
  const [menuTerbuka, setMenuTerbuka] = useState(false)
  const toast = useToast()
  const keluar = useSignOut()

  return (
    <header className="border-line-200 bg-surface sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-[18px] px-5">
        <Link to={paths.home} className="flex shrink-0 items-center gap-2.5">
          {/* alt sengaja dikosongkan: teks di sebelahnya sudah menyebut
              "Satu Data Erdigma", jadi pembaca layar tidak perlu mendengarnya
              dua kali. width/height ditulis agar tidak ada pergeseran tata
              letak saat gambarnya selesai dimuat. */}
          <img
            src={logoErdigma}
            alt=""
            width={34}
            height={34}
            className="size-[34px] shrink-0"
          />
          <span className="text-ink-900 text-[17px] font-extrabold tracking-[-0.3px]">
            Satu Data <span className="text-brand">Erdigma</span>
          </span>
        </Link>

        <nav className="ml-2 hidden items-center gap-0.5 md:flex" aria-label="Navigasi utama">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-[13px] py-[9px] text-sm transition-colors',
                  isActive
                    ? 'bg-brand-tint text-brand font-bold'
                    : 'text-ink-600 hover:bg-surface-100 font-semibold',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex-1" />

        <div className="hidden items-center gap-2.5 md:flex">
          <button
            type="button"
            onClick={() => toast.show('Fitur ini tersedia pada versi lengkap.')}
            className="text-ink-600 hover:bg-surface-100 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors"
          >
            Feedback
          </button>
          <UserPill />
          <button
            type="button"
            onClick={keluar}
            aria-label="Keluar"
            title="Keluar"
            className="text-ink-500 hover:bg-surface-100 hover:text-ink-900 flex size-9 items-center justify-center rounded-lg transition-colors"
          >
            <LogOut className="size-[18px]" strokeWidth={2.2} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMenuTerbuka((v) => !v)}
          aria-expanded={menuTerbuka}
          aria-label={menuTerbuka ? 'Tutup menu' : 'Buka menu'}
          className="border-line-200 flex size-[42px] items-center justify-center rounded-[9px] border bg-[#F4F6FF] md:hidden"
        >
          {menuTerbuka ? (
            <X className="text-brand size-5" strokeWidth={2.4} />
          ) : (
            <Menu className="text-brand size-5" strokeWidth={2.4} />
          )}
        </button>
      </div>

      {menuTerbuka ? (
        <div className="border-line-200 flex flex-col gap-0.5 border-t px-4 pt-2 pb-4 md:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMenuTerbuka(false)}
              className="text-ink-900 rounded-lg px-2 py-[13px] text-[15px] font-semibold"
            >
              {item.label}
            </NavLink>
          ))}

          <div className="bg-line-100 my-1.5 h-px" />

          <div className="mt-1 flex flex-col gap-3">
            <UserPill mobile />
            <button
              type="button"
              onClick={() => {
                setMenuTerbuka(false)
                keluar()
              }}
              className="text-ink-700 border-line-200 flex items-center justify-center gap-2 rounded-[10px] border px-3 py-3 text-sm font-semibold"
            >
              <LogOut className="size-[17px]" strokeWidth={2.2} />
              Keluar
            </button>
          </div>
        </div>
      ) : null}
    </header>
  )
}

/**
 * Identitas pengguna di pojok kanan.
 *
 * Nilainya dari `GET /api/v1/me`, bukan dari isi token. Inisial pun dihitung
 * server ("M. Fahrega Ridwan" → "FR") supaya aturannya cuma di satu tempat.
 */
function UserPill({ mobile = false }: { mobile?: boolean }) {
  const { data: user, isPending, isError } = useCurrentUser()

  if (isPending) {
    return <Skeleton className={mobile ? 'h-14 w-full rounded-[10px]' : 'h-11 w-52 rounded-full'} />
  }

  if (isError || !user) {
    return (
      <span className="text-ink-500 border-line-200 rounded-full border px-4 py-2 text-[13px] font-semibold">
        Tidak masuk
      </span>
    )
  }

  return (
    // Dulu menaut ke Dasbor Akun. Sejak fitur API key dibuang, tidak ada
    // halaman akun untuk dituju, jadi pil ini murni penanda identitas.
    <div
      className={cn(
        'bg-surface-100 border-line-200 flex items-center gap-2.5 border text-left',
        mobile ? 'rounded-[10px] p-2.5' : 'rounded-full py-[5px] pr-4 pl-[6px]',
      )}
    >
      <span className="bg-brand flex size-[34px] shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white">
        {user.initials}
      </span>
      <span className="leading-tight">
        <span className={cn('text-ink-900 block font-bold', mobile ? 'text-sm' : 'text-[13.5px]')}>
          {user.name}
        </span>
        <span className={cn('text-ink-500 block', mobile ? 'text-xs' : 'text-[11.5px]')}>
          {user.position}
        </span>
      </span>
    </div>
  )
}
