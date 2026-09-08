import { Shield, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import logoErdigma from '@/shared/assets/logo-erdigma-mark.png'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { useSignOut } from '@/features/auth/hooks/useSignOut'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { useToast } from '@/shared/components/ui/toastStore'
import { UserAvatar } from '@/shared/components/ui/UserAvatar'
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

/*
  Bilah ini melewati DUA ambang, bukan satu.

  Dulu hanya `md` (768px): di bawahnya laci, di atasnya seluruh isi sekaligus.
  Akibatnya di tablet semua muncul berdesakan di lebar yang tidak cukup, lalu
  membungkus -- "Panel Admin" pecah dua baris dan nama pengguna pecah tiga
  sampai kotaknya meluber keluar bilah.

  Sekarang `md` memunculkan barisnya, dan `lg` (1024px) memunculkan
  KETERANGANNYA. Di antara keduanya yang tampil ikon dan avatar saja: tetap
  bisa ditekan, tetap punya nama lewat `title` dan `aria-label`, tetapi tidak
  menuntut lebar yang tidak ada.

  Yang menahan tampilan tetap rapi bukan cuma penyembunyian itu, melainkan juga
  `whitespace-nowrap` di tiap butir. Tanpa itu, satu nama panjang atau satu
  jabatan panjang cukup untuk mengulang persoalan yang sama di lebar mana pun.
*/
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const toast = useToast()
  const signOut = useSignOut()

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
                  'rounded-lg px-[13px] py-[9px] text-sm whitespace-nowrap transition-colors',
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
          {/* Satu-satunya jalan kembali ke panel admin dari panel pengguna.
              Tanpa ini admin yang menekan logo terjebak di sisi pengguna dan
              harus mengetik URL-nya sendiri. Hanya muncul untuk ADMIN — bagi
              yang lain tautannya cuma akan berujung pengalihan balik. */}
          <AdminPanelLink />
          {/* Yang pertama menyingkir saat lebarnya menipis, karena ia yang
              paling sedikit kehilangannya: tombol ini belum melakukan apa pun
              selain memunculkan pesan "tersedia pada versi lengkap". Menyingkirkan
              tautan yang benar-benar membawa orang ke suatu tempat jelas lebih
              merugikan. Di ponsel ia memang belum ada sejak dulu. */}
          <button
            type="button"
            onClick={() => toast.show('Fitur ini tersedia pada versi lengkap.')}
            className="text-ink-600 hover:bg-surface-100 hidden rounded-lg px-2.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors lg:block"
          >
            Feedback
          </button>
          <UserPill />
          <button
            type="button"
            onClick={signOut}
            aria-label="Keluar"
            title="Keluar"
            className="text-ink-500 hover:bg-surface-100 hover:text-ink-900 flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors"
          >
            <LogOut className="size-[18px]" strokeWidth={2.2} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
          className="border-line-200 flex size-[42px] items-center justify-center rounded-[9px] border bg-[#F4F6FF] md:hidden"
        >
          {menuOpen ? (
            <X className="text-brand size-5" strokeWidth={2.4} />
          ) : (
            <Menu className="text-brand size-5" strokeWidth={2.4} />
          )}
        </button>
      </div>

      {/*
        Menu selalu ADA di DOM, tidak dipasang-lepas.

        Dulu `{menuOpen ? <div/> : null}`, dan itu sebabnya tidak ada animasi:
        elemen yang baru lahir tidak punya keadaan sebelumnya untuk
        ditransisikan, dan yang dilepas hilang sebelum sempat beranimasi
        keluar. Yang tersisa hanya kedipan.

        Tingginya dianimasikan lewat `grid-template-rows` 0fr → 1fr. Cara ini
        dipakai karena tinggi menu tidak diketahui di muka — bergantung jumlah
        butir nav dan apakah nama pengguna sudah termuat — sedangkan
        `height: auto` tidak bisa ditransisikan CSS. `min-h-0` pada anaknya
        wajib: tanpa itu 0fr tidak pernah benar-benar mengatup.

        `inert` mematikan seluruh isinya saat tertutup. Tanpa itu menu yang
        tak terlihat tetap bisa disinggahi Tab dan tetap dibacakan pembaca
        layar — cacat yang justru muncul karena isinya tidak lagi dilepas.
      */}
      <div
        inert={!menuOpen}
        className={cn(
          'grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out md:hidden',
          menuOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0">
          <div
            className={cn(
              'border-line-200 flex flex-col gap-0.5 border-t px-4 pt-2 pb-4 transition-opacity duration-200',
              menuOpen ? 'opacity-100 delay-75' : 'opacity-0',
            )}
          >
            {/*
              Penanda halaman aktif memakai `isActive` yang sama dengan baris
              desktop. Sebelumnya kelasnya tetap, jadi menu ini tidak pernah
              menunjukkan posisi — dan justru di ponsel penanda itu paling
              dibutuhkan: tidak ada baris navigasi yang terlihat terus-menerus,
              sehingga membuka menu adalah satu-satunya cara mengetahui sedang
              berada di mana.
            */}
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between rounded-lg px-2 py-[13px] text-[15px] transition-colors',
                    isActive
                      ? 'bg-brand-tint text-brand font-bold'
                      : 'text-ink-900 hover:bg-surface-100 font-semibold',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    {/* Warna saja tidak cukup: sebagian orang tidak
                        membedakannya. Titik ini membuat halaman aktif tetap
                        terbaca tanpa bergantung pada warna. */}
                    {isActive ? (
                      <span
                        aria-hidden
                        className="bg-brand ml-2 size-1.5 shrink-0 rounded-full"
                      />
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}

            {/* Di ponsel pun admin butuh jalan ke panelnya. Sebelumnya tautan
                ini hanya ada di baris desktop, jadi admin yang membuka portal
                dari ponsel tidak punya cara ke sana selain mengetik URL. */}
            <AdminPanelLink mobile />

            <div className="bg-line-100 my-1.5 h-px" />

            <div className="mt-1 flex flex-col gap-3">
              <UserPill mobile />
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  signOut()
                }}
                className="text-ink-700 border-line-200 hover:bg-surface-100 flex items-center justify-center gap-2 rounded-[10px] border px-3 py-3 text-sm font-semibold transition-colors"
              >
                <LogOut className="size-[17px]" strokeWidth={2.2} />
                Keluar
              </button>
            </div>
          </div>
        </div>
      </div>
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
    // Bentuk rangkanya mengikuti bentuk akhirnya, termasuk penyusutan di tablet.
    // Rangka selebar 208px yang berganti jadi lingkaran 44px membuat seluruh
    // bilah bergeser tepat saat namanya selesai dimuat.
    return (
      <Skeleton
        className={
          mobile ? 'h-14 w-full rounded-[10px]' : 'h-11 w-11 rounded-full lg:w-52'
        }
      />
    )
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
      title={mobile ? undefined : `${user.name} — ${user.position}`}
      className={cn(
        'bg-surface-100 border-line-200 flex shrink-0 items-center gap-2.5 border text-left',
        mobile
          ? 'rounded-[10px] p-2.5'
          : 'rounded-full p-[5px] lg:py-[5px] lg:pr-4 lg:pl-[6px]',
      )}
    >
      <UserAvatar
        src={user.profileImageUrl}
        initials={user.initials ?? '?'}
        name={user.name}
        className="size-[34px] shrink-0 text-[13px] font-bold"
      />
      {/*
        Di tablet yang tersisa avatarnya saja. Namanya tidak hilang begitu saja:
        ia pindah ke `title` pada pembungkusnya, jadi tetap bisa dibaca dengan
        menahan kursor -- dan avatar itu sendiri sudah membawa inisial.

        `min-w-0` dan `truncate` wajib berpasangan. Tanpa `min-w-0`, elemen flex
        menolak menyusut di bawah lebar isinya, sehingga `truncate` tidak pernah
        sempat bekerja dan yang terjadi justru bilahnya yang melebar.
      */}
      <span
        className={cn(
          'min-w-0 leading-tight',
          mobile ? 'block' : 'hidden lg:block lg:max-w-[190px]',
        )}
      >
        <span
          className={cn(
            'text-ink-900 block truncate font-bold',
            mobile ? 'text-sm' : 'text-[13.5px]',
          )}
        >
          {user.name}
        </span>
        <span
          className={cn(
            'text-ink-500 block truncate',
            mobile ? 'text-xs' : 'text-[11.5px]',
          )}
        >
          {user.position}
        </span>
      </span>
    </div>
  )
}

function AdminPanelLink({ mobile = false }: { mobile?: boolean }) {
  const { data: user } = useCurrentUser()
  if (user?.role !== 'ADMIN') {
    return null
  }
  return (
    <Link
      to={paths.admin}
      title={mobile ? undefined : 'Panel Admin'}
      aria-label={mobile ? undefined : 'Panel Admin'}
      className={cn(
        'text-ink-600 hover:bg-surface-100 flex shrink-0 items-center gap-1.5 rounded-lg whitespace-nowrap transition-colors',
        mobile
          ? 'px-2 py-[13px] text-[15px] font-semibold'
          : 'size-9 justify-center text-sm font-semibold lg:size-auto lg:justify-start lg:px-2.5 lg:py-2',
      )}
    >
      <Shield className="size-4 shrink-0" />
      {/*
        Tulisannya menyingkir di tablet, ikonnya tidak. Yang hilang cuma
        keterangan, sementara `aria-label` menjaga tautan ini tetap punya nama
        bagi pembaca layar -- ikon perisai sendirian tidak menyebutkan apa pun.
      */}
      <span className={mobile ? undefined : 'hidden lg:inline'}>Panel Admin</span>
    </Link>
  )
}
