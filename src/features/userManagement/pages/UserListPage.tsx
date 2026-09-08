import { useState } from 'react'

import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { Badge } from '@/shared/components/ui/Badge'
import { PageContainer } from '@/shared/components/ui/PageContainer'
import { Pagination } from '@/shared/components/ui/Pagination'
import { SearchField } from '@/shared/components/ui/SearchField'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { useToast } from '@/shared/components/ui/toastStore'
import type { PortalRole, UserAdmin } from '@/shared/types/api'

import { useUpdateUserRole } from '../hooks/useUpdateUserRole'
import { useUsers } from '../hooks/useUsers'

const UKURAN_HALAMAN = 20

const PERAN: { nilai: PortalRole; label: string }[] = [
  { nilai: 'ADMIN', label: 'Admin' },
  { nilai: 'PUBLISHER', label: 'Publisher' },
  { nilai: 'STAFF', label: 'Staff' },
]

/**
 * Panel manajemen pengguna.
 *
 * Hanya admin warisan HRIS yang bisa membukanya — server menjawab 403 untuk
 * yang lain, dan pesannya ditampilkan apa adanya oleh QueryBoundary. Menu di
 * header pun disembunyikan, tapi itu kenyamanan, bukan pengamanan.
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

  function pilihPeran(pengguna: UserAdmin, nilai: string) {
    const role = nilai === 'HRIS' ? null : (nilai as PortalRole)
    ubahPeran.mutate(
      { id: pengguna.id as string, role },
      {
        onSuccess: () =>
          toast.show(
            role === null
              ? `${pengguna.name} kembali mengikuti HRIS.`
              : `${pengguna.name} kini ${role}.`,
          ),
        onError: (galat) =>
          toast.show(galat instanceof Error ? galat.message : 'Gagal mengubah peran.'),
      },
    )
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-ink-900 text-2xl font-extrabold tracking-[-0.4px]">
          Manajemen Pengguna
        </h1>
        <p className="text-ink-500 mt-1.5 text-sm">
          Pengguna yang pernah masuk ke Satu Data. Peran yang ditunjuk di sini bertahan melewati
          penyegaran data HRIS.
        </p>
      </div>

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
        {(page) => (
          <>
            <div className="border-line-200 overflow-x-auto rounded-xl border bg-white">
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
                  {(page.content ?? []).map((pengguna) => {
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
        )}
      </QueryBoundary>
    </PageContainer>
  )
}
