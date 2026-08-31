import { Database, ExternalLink, FileText, LayoutGrid, LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { Toaster } from '@/shared/components/ui/Toaster'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { useSignOut } from '@/features/auth/hooks/useSignOut'
import { paths } from '@/app/router/paths'

/**
 * Kerangka panel admin — sidebar gelap + topbar, mengikuti
 * `projectFiles/Panel Admin Satu Data.html`.
 *
 * Sengaja TIDAK memakai `RootLayout` milik panel pengguna. Keduanya beda dunia:
 * panel pengguna berlatar terang dengan header horizontal dan footer, panel
 * admin berlatar `#F1F3F7` dengan sidebar tetap dan tanpa footer. Memaksakan
 * satu layout untuk keduanya hanya menghasilkan tumpukan kondisi di dalamnya.
 *
 * Nilai warna dan ukuran diambil apa adanya dari desain, bukan dikira-kira:
 * sidebar 260px `#182532`, topbar 98px, judul 31px, item aktif `#2C3444`.
 *
 * <h2>Di layar sempit</h2>
 *
 * Sidebar 260px yang permanen memakan lebih dari dua pertiga lebar ponsel,
 * jadi di bawah `lg` ia berubah menjadi laci yang ditarik lewat tombol di
 * topbar. Yang dipakai kelas `lg:` dan bukan `md:` karena isi panel ini tabel
 * lebar — pada tablet 768px, sidebar tetap berarti tabelnya tergencet sampai
 * tidak terbaca.
 */

const NAV = [
  {
    label: 'SATU DATA',
    items: [
      { to: paths.admin, label: 'Dashboard', icon: LayoutGrid, end: true },
      { to: paths.adminDatasets, label: 'Dataset', icon: Database, end: false },
    ],
  },
  {
    label: 'LOG',
    items: [{ to: paths.adminLog, label: 'Log', icon: FileText, end: true }],
  },
]

/** Satu ruas remah roti. Tanpa `to` berarti halaman yang sedang dibuka. */
interface Crumb {
  label: string
  to?: string
}

/**
 * Judul dan remah roti per rute, seperti `titles`/`crumbs` di desain.
 *
 * Dulu satu string "Satu Data / Dataset / Tambah" yang digambar apa adanya:
 * terlihat seperti jalur yang bisa ditelusuri, padahal tidak ada satu pun yang
 * bisa diklik. Remah roti yang mati lebih buruk daripada tidak ada sama sekali
 * — ia menjanjikan jalan pulang yang tidak pernah ada.
 *
 * Ruas TERAKHIR sengaja tidak bertaut. Ia adalah halaman yang sedang dibuka,
 * dan tautan yang membawa ke tempat yang sama dengan tempat sekarang hanya
 * membingungkan.
 */
const TITLES: Record<string, { title: string; crumb: Crumb[] }> = {
  [paths.admin]: {
    title: 'Dashboard',
    crumb: [{ label: 'Satu Data' }],
  },
  [paths.adminDatasets]: {
    title: 'Dataset',
    crumb: [{ label: 'Satu Data', to: paths.admin }, { label: 'Dataset' }],
  },
  [paths.adminDatasetNew]: {
    title: 'Tambah dataset',
    crumb: [
      { label: 'Satu Data', to: paths.admin },
      { label: 'Dataset', to: paths.adminDatasets },
      { label: 'Tambah' },
    ],
  },
  [paths.adminLog]: {
    title: 'Log',
    crumb: [{ label: 'Satu Data', to: paths.admin }, { label: 'Log' }],
  },
}

export function AdminLayout() {
  const { data: user } = useCurrentUser()
  const signOut = useSignOut()
  const { pathname } = useLocation()

  const [navOpen, setNavOpen] = useState(false)

  // Laci ditutup setiap kali rutenya berganti. Tanpa ini, menekan sebuah menu
  // memindahkan halaman di belakang laci yang masih menutupinya — pengguna
  // harus menutup sendiri untuk melihat hasil dari apa yang baru ia tekan.
  useEffect(() => {
    setNavOpen(false)
  }, [pathname])

  const page = TITLES[pathname] ?? { title: 'Dashboard', crumb: [{ label: 'Satu Data' }] }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F1F3F7]">
      {/*
        Latar gelap penutup, hanya ada selama laci terbuka dan hanya di layar
        sempit. Selain meredupkan isi di belakangnya, inilah cara paling
        dimengerti untuk menutup laci: menekan di luar.
      */}
      {navOpen ? (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setNavOpen(false)}
          className="animate-[overlay-in_200ms_ease] fixed inset-0 z-40 bg-[#101828]/45 lg:hidden"
        />
      ) : null}

      <aside
        className={[
          'z-50 w-[260px] shrink-0 overflow-y-auto bg-[#182532] transition-transform duration-300 ease-out',
          // Di bawah lg sidebar dikeluarkan dari alur dan digeser ke luar layar,
          // bukan disembunyikan dengan `hidden` — supaya perpindahannya bisa
          // dianimasikan alih-alih muncul mendadak.
          'fixed inset-y-0 left-0 lg:static lg:translate-x-0',
          navOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex items-center justify-between px-[26px] pt-[26px] pb-[30px]">
          <span className="text-[25px] font-bold tracking-[1.2px] text-[#B9C0CC]">DIGIMATES</span>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            aria-label="Tutup menu"
            className="-mr-2 flex size-9 items-center justify-center rounded-lg text-[#B9C0CC] transition-colors hover:bg-[#222C3A] lg:hidden"
          >
            <X className="size-5" strokeWidth={2.2} />
          </button>
        </div>

        <nav className="px-3.5 pb-10">
          {NAV.map((group) => (
            <div key={group.label}>
              <div className="px-3 pb-3 text-[11.5px] font-bold tracking-[1.1px] text-[#7E8798]">
                {group.label}
              </div>
              <div className="pb-[22px]">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      [
                        'mb-0.5 flex w-full items-center gap-[13px] rounded-lg px-3 py-[13px] text-[15.5px] font-medium transition-colors',
                        isActive
                          ? 'bg-[#2C3444] text-white'
                          : 'text-[#D5DAE3] hover:bg-[#222C3A]',
                      ].join(' ')
                    }
                  >
                    <Icon className="size-[19px] shrink-0" strokeWidth={1.9} />
                    <span className="flex-1 text-left">{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E9EBF0] bg-white px-4 py-3.5 sm:px-6 lg:h-[98px] lg:gap-6 lg:px-12 lg:py-0">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="Buka menu"
              aria-expanded={navOpen}
              className="flex size-10 shrink-0 items-center justify-center rounded-[9px] border border-[#E9EBF0] text-[#4B5563] transition-colors hover:bg-[#F8FAFC] lg:hidden"
            >
              <Menu className="size-5" strokeWidth={2.2} />
            </button>

            <div className="min-w-0">
              {/* Remah roti disembunyikan di ponsel: di layar selebar itu ia
                  memakan satu baris penuh hanya untuk mengulang apa yang sudah
                  tertulis besar-besar tepat di bawahnya. */}
              <nav
                aria-label="Remah roti"
                className="mb-1 hidden truncate text-[13.5px] text-[#6B7280] sm:block"
              >
                {page.crumb.map((ruas, i) => (
                  <span key={ruas.label}>
                    {i > 0 ? <span className="px-1">/</span> : null}
                    {ruas.to ? (
                      <Link to={ruas.to} className="hover:text-[#2E3646] hover:underline">
                        {ruas.label}
                      </Link>
                    ) : (
                      <span aria-current="page">{ruas.label}</span>
                    )}
                  </span>
                ))}
              </nav>
              <h1 className="m-0 truncate text-[21px] font-bold tracking-[-0.2px] text-[#2E3646] sm:text-[25px] lg:text-[31px]">
                {page.title}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 lg:gap-3.5">
            {/*
              Jalan keluar ke portal biasa. Tanpa ini admin terkurung di panel
              pengelolaan dan harus mengetik URL-nya sendiri untuk melihat
              katalog seperti yang dilihat karyawan lain — padahal itu justru
              cara termudah memeriksa apakah pengaturan aksesnya sudah benar.

              Pasangannya ada di SiteHeader: tautan "Panel Admin" yang muncul
              hanya untuk ADMIN.

              Di ponsel tinggal ikonnya. Tombol ini jarang dipakai, tapi terlalu
              penting untuk dibuang — tanpa teksnya ia tetap muat tanpa
              mendesak nama pengguna keluar.
            */}
            <Link
              to={paths.home}
              title="Panel Pengguna"
              className="flex items-center gap-2 rounded-lg border border-[#E9EBF0] px-2.5 py-2 text-[13.5px] font-semibold text-[#4B5563] transition-colors hover:bg-[#F8FAFC] sm:px-3.5"
            >
              <ExternalLink className="size-4 shrink-0" />
              <span className="hidden sm:inline">Panel Pengguna</span>
            </Link>

            {/* Nama dan peran hanya muat mulai lg. Di bawah itu avatarnya yang
                mewakili — identitas tetap terlihat tanpa memakan lebar. */}
            <div className="hidden text-right leading-[1.25] lg:block">
              <div className="text-[15px] font-semibold text-[#2E3646]">{user?.name ?? '—'}</div>
              <div className="text-[12.5px] text-[#6B7280]">
                {user?.role ?? '—'} · {user?.division?.code ?? '—'}
              </div>
            </div>
            <div
              title={user?.name ?? undefined}
              className="flex size-9 items-center justify-center rounded-full bg-[#E9EBF0] text-[13px] font-bold text-[#4B5563] lg:size-11 lg:text-[14px]"
            >
              {initials(user?.name)}
            </div>
            <button
              type="button"
              onClick={signOut}
              aria-label="Keluar"
              className="flex size-9 items-center justify-center rounded-full text-[#6B7280] transition-colors hover:bg-[#F1F3F7] lg:size-11"
            >
              <LogOut className="size-[19px]" strokeWidth={1.9} />
            </button>
          </div>
        </header>

        {/* Hanya bagian ini yang menggulir. Sidebar dan topbar tetap di tempat,
            sesuai desain yang memakai height:100vh + overflow:hidden. */}
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-12 lg:py-8">
          <Outlet />
        </main>

        {/*
          Panel admin punya layout sendiri, terpisah dari RootLayout — dan
          Toaster-nya ikut tertinggal di sana. Akibatnya setiap toast.success()
          dan toast.error() di seluruh panel ini tidak pernah tergambar:
          menghapus dataset terasa seperti tidak terjadi apa-apa, dan yang lebih
          berbahaya, KEGAGALAN pun lewat tanpa suara.
        */}
        <Toaster />
      </div>
    </div>
  )
}

function initials(name?: string | null): string {
  if (!name) return '—'
  return name
    .split(/\s+/)
    .filter((p) => /[A-Za-z]/.test(p))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}
