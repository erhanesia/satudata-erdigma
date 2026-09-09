import { useState } from 'react'
import { Navigate } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { EmptyState } from '@/shared/components/feedback/StateViews'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { Reveal } from '@/shared/components/motion/Reveal'
import { Badge } from '@/shared/components/ui/Badge'
import { Pagination } from '@/shared/components/ui/Pagination'
import { SearchField } from '@/shared/components/ui/SearchField'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { useToast } from '@/shared/components/ui/toastStore'
import type { PortalRole, UserAdmin } from '@/shared/types/api'

import { useUpdateUserRole } from '../hooks/useUpdateUserRole'
import { useUsers } from '../hooks/useUsers'

/**
 * Baris per halaman, sama di seluruh aplikasi.
 *
 * Angkanya disamakan dengan halaman berpaginasi lain supaya berpindah antar
 * layar tidak mengubah panjang daftar yang dibaca orang. Sebelumnya tiap
 * halaman memakai angkanya sendiri, dan yang terasa bukan angkanya melainkan
 * tinggi halamannya yang berubah-ubah tanpa alasan yang bisa dijelaskan.
 */
const UKURAN_HALAMAN = 10

const PERAN: { nilai: PortalRole; label: string }[] = [
  { nilai: 'ADMIN', label: 'Admin' },
  { nilai: 'PUBLISHER', label: 'Publisher' },
  { nilai: 'STAFF', label: 'Staff' },
]

/**
 * Manajemen pengguna — halaman panel admin.
 *
 * `AdminRoute` di atasnya hanya memastikan `role === 'ADMIN'`, dan itu belum
 * cukup di sini: admin yang ditunjuk lewat halaman ini sendiri lolos syarat
 * itu, padahal ia justru tidak boleh menunjuk admin baru. Gerbang keduanya —
 * `hrisPermissionLevel === 'ADMIN'` — ditegakkan di bawah, mengikuti cara
 * `AdminRoute` menolak: dialihkan, bukan diberi layar "akses ditolak". Tidak
 * ada butir sidebar yang membawa mereka ke sini, jadi yang sampai di halaman
 * ini mengetik alamatnya sendiri.
 *
 * Ini penjaga tampilan, bukan penjaga keamanan. Yang sesungguhnya menolak tetap
 * `@PreAuthorize("hasRole('HRIS_ADMIN')")` di back-end.
 */
export default function UserListPage() {
  // Halaman untuk manusia berbasis 1; API berbasis 0. Konversinya di satu
  // tempat, sama seperti useDatasetFilters.
  const [halaman, setHalaman] = useState(1)
  const [cari, setCari] = useState('')
  const query = useUsers({ q: cari || undefined, page: halaman - 1, size: UKURAN_HALAMAN })

  const { data: saya } = useCurrentUser()
  const ubahPeran = useUpdateUserRole()
  const toast = useToast()

  const adminWarisanHris = saya?.role === 'ADMIN' && saya?.hrisPermissionLevel === 'ADMIN'

  function pilihPeran(pengguna: UserAdmin, nilai: string) {
    // Satu-satunya kontrol di halaman ini yang membagikan hak istimewa —
    // termasuk hak menerbitkan dataset, lihat paragraf pembuka halaman — lewat
    // satu event `change`. Di Firefox, menekan panah pada <select> tertutup
    // yang sedang fokus memicu `change` untuk tiap opsi yang dilewati, jadi
    // pengguna keyboard yang men-tab lewat tabel bisa menunjuk peran tanpa
    // sengaja. Konfirmasi browser ini cukup untuk sekarang; ganti dengan modal
    // begitu panel ini punya aksi lain selain dropdown peran.
    if (!window.confirm(`Ubah peran ${pengguna.name}?`)) return

    const role = nilai === 'HRIS' ? null : (nilai as PortalRole)
    ubahPeran.mutate(
      { id: pengguna.id as string, role },
      {
        // success/error, bukan show: warna toast yang membedakan berhasil dari
        // gagal (lihat Toaster). Perubahan peran yang gagal tidak boleh terlihat
        // sama dengan yang berhasil.
        onSuccess: () =>
          toast.success(
            role === null
              ? `${pengguna.name} kembali mengikuti HRIS.`
              : `${pengguna.name} kini ${role}.`,
          ),
        onError: (galat) =>
          toast.error(galat instanceof Error ? galat.message : 'Gagal mengubah peran.'),
      },
    )
  }

  // Ditunggu sampai identitasnya tiba: `saya` undefined selama /me berjalan,
  // dan mengalihkan lebih dulu akan menendang keluar admin yang sah.
  if (saya && !adminWarisanHris) {
    return <Navigate to={paths.admin} replace />
  }

  return (
    <Reveal>
      <p className="text-ink-500 mb-5 max-w-3xl text-sm">
        Pengguna yang pernah masuk ke Satu Data. Peran yang ditunjuk di sini bertahan melewati
        penyegaran data HRIS — dan bukan cuma soal akses ke halaman ini: menunjuk seseorang
        Publisher atau Admin juga memberinya hak menerbitkan dataset, dan menurunkannya ke Staff
        mencabut hak itu juga.
      </p>

      <SearchField
        value={cari}
        onChange={(nilai) => {
          setCari(nilai)
          setHalaman(1)
        }}
        placeholder="Cari nama atau email"
        label="Cari pengguna"
        className="mb-5 max-w-md"
      />

      {/* `loading` wajib diisi — QueryBoundary tidak punya tampilan bawaan. */}
      <QueryBoundary query={query} loading={<Skeleton className="h-64 w-full rounded-xl" />}>
        {(page) => {
          const daftar = page.content ?? []
          // Sama seperti CollectionListPage: keadaan kosong dari komponen
          // bersama, bukan header tabel telanjang — pencarian tanpa hasil
          // tidak boleh terlihat seperti halaman rusak.
          if (daftar.length === 0) {
            return (
              <EmptyState
                title="Tidak ada pengguna yang cocok"
                description="Coba kata kunci lain, atau kosongkan pencarian untuk melihat semua pengguna."
              />
            )
          }
          return (
            <>
              {/* Kartu putih bertepi #E9EBF0, sama seperti halaman admin lain. */}
              <div className="overflow-x-auto rounded-[14px] border border-[#E9EBF0] bg-white">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-line-200 text-ink-500 border-b text-[12.5px]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Nama</th>
                      <th className="px-4 py-3 font-semibold">Jabatan</th>
                      <th className="px-4 py-3 font-semibold">Divisi</th>
                      <th className="px-4 py-3 font-semibold">Peran</th>
                      <th className="px-4 py-3 font-semibold">Sumber</th>
                      <th className="px-4 py-3 font-semibold">Ubah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daftar.map((pengguna) => {
                      const diriSendiri = pengguna.id === saya?.id
                      return (
                        <tr key={pengguna.id} className="border-line-100 border-b last:border-0">
                          <td className="px-4 py-3">
                            <span className="text-ink-900 block font-semibold">{pengguna.name}</span>
                            <span className="text-ink-500 block text-xs">{pengguna.email}</span>
                          </td>
                          <td className="text-ink-600 px-4 py-3">{pengguna.position ?? '—'}</td>
                          <td className="text-ink-600 px-4 py-3">{pengguna.division?.name ?? '—'}</td>
                          <td className="px-4 py-3">
                            <Badge tone={pengguna.role === 'ADMIN' ? 'brand' : 'neutral'}>
                              {pengguna.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge tone={pengguna.roleOverride ? 'warning' : 'neutral'}>
                              {pengguna.roleOverride ? 'Diatur manual' : 'Dari HRIS'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {diriSendiri ? (
                              <span className="text-ink-500 text-xs">Peran sendiri</span>
                            ) : (
                              <select
                                aria-label={`Ubah peran ${pengguna.name}`}
                                className="border-line-300 rounded-lg border px-2 py-1.5 text-sm"
                                value={pengguna.roleOverride ?? 'HRIS'}
                                disabled={ubahPeran.isPending}
                                onChange={(e) => pilihPeran(pengguna, e.target.value)}
                              >
                                <option value="HRIS">Ikuti HRIS</option>
                                {PERAN.map((p) => (
                                  <option key={p.nilai} value={p.nilai}>
                                    {p.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                className="mt-6 justify-center"
                page={halaman}
                totalPages={page.totalPages ?? 1}
                onPageChange={setHalaman}
                labels
              />
            </>
          )
        }}
      </QueryBoundary>
    </Reveal>
  )
}
