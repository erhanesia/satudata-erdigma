import { useQueries, useQuery } from '@tanstack/react-query'

import { apiGet } from '@/shared/api/httpClient'
import { queryKeys } from '@/shared/api/queryKeys'

/** Satu pilihan posisi atau karyawan dari HRIS. */
export interface HrisRef {
  id: string
  name: string
}

/**
 * Dua belas jenjang jabatan dari `GET /api/v1/job-levels`.
 *
 * Daftarnya tetap — kedua belas nilainya enum di kode hris-api, bukan baris
 * tabel — jadi disimpan lama di cache. Menggantikan `usePositions` lama yang
 * mengambil sembilan label karangan dari berkas desain.
 */
export function useJobLevels() {
  return useQuery({
    queryKey: queryKeys.taxonomy.jobLevels,
    queryFn: ({ signal }) => apiGet<string[]>('/api/v1/job-levels', { signal }),
    staleTime: 30 * 60_000,
  })
}

/**
 * Posisi dari HRIS, diteruskan back-end saat dipanggil.
 *
 * `staleTime` jauh lebih pendek daripada jenjang jabatan: ini data hidup milik
 * HRIS yang bisa bertambah kapan saja, bukan enum yang butuh deploy untuk
 * berubah.
 */
export function usePositions(search: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.taxonomy.positions(search),
    queryFn: ({ signal }) =>
      apiGet<HrisRef[]>(
        `/api/v1/positions${search ? `?search=${encodeURIComponent(search)}` : ''}`,
        { signal },
      ),
    enabled,
    staleTime: 5 * 60_000,
  })
}

/**
 * Pencarian karyawan di HRIS.
 *
 * `enabled` mematikan query selama kata kuncinya terlalu pendek. Back-end
 * menolak pencarian tanpa kata kunci — ada ratusan karyawan, dan memuat semuanya
 * berarti mengirim daftar yang tidak akan dibaca siapa pun sampai habis.
 *
 * Ambang dua huruf dipilih supaya ketikan pertama tidak langsung memicu
 * permintaan yang hasilnya pasti terlalu banyak untuk berguna.
 */
export function useEmployees(search: string) {
  const cleaned = search.trim()
  return useQuery({
    queryKey: queryKeys.taxonomy.employees(cleaned),
    queryFn: ({ signal }) =>
      apiGet<HrisRef[]>(`/api/v1/employees?search=${encodeURIComponent(cleaned)}`, { signal }),
    enabled: cleaned.length >= 2,
    staleTime: 60_000,
  })
}

/**
 * Menerjemahkan aturan akses yang tersimpan menjadi nama yang bisa dibaca.
 *
 * <h2>Kenapa perlu diterjemahkan sama sekali</h2>
 *
 * Yang disimpan di `dataset_access_rule` adalah UUID, bukan nama. Itu keputusan
 * yang disengaja: tabel posisi HRIS memuat salah ketik yang suatu saat akan
 * diperbaiki, dan pembatasan berbasis nama akan putus tanpa galat apa pun begitu
 * itu terjadi — datasetnya sekadar berhenti terlihat oleh orang yang berhak.
 *
 * Ongkosnya dibayar di sini: UUID tidak berarti apa-apa bagi manusia, dan admin
 * yang membuka kembali sebuah dataset tidak akan tahu `454909f7-…` itu siapa.
 *
 * <h2>Tiga sumber, dari yang paling murah</h2>
 *
 * 1. **Jenjang** tidak perlu dicari — nilainya memang sudah berupa label.
 * 2. **Posisi** diambil dari daftar lengkap yang sudah dimuat pemilihnya.
 *    Satu permintaan untuk seluruh halaman, dan React Query menyimpannya.
 * 3. **Karyawan** dicari satu per satu lewat `/employees/{id}`, karena hris-api
 *    tidak punya endpoint "ambil banyak sekaligus". Jumlah aturan EMPLOYEE pada
 *    satu dataset hanya satuan, jadi ini murah — SELAMA tidak dipanggil per baris
 *    di halaman daftar. Kolom akses di sana sengaja hanya menampilkan jumlah.
 *
 * Nama yang sudah diketahui pemanggil bisa dititipkan lewat `known`, dan itu
 * menutup kasus yang paling sering terjadi tanpa satu pun permintaan tambahan:
 * saat admin baru saja memilih seseorang, namanya sudah ada di layar.
 *
 * Yang tidak ketemu dikembalikan apa adanya sebagai UUID. Karyawan bisa saja
 * sudah dihapus setelah aturannya dibuat, dan aturannya tetap nyata — lebih baik
 * menampilkan UUID yang jelek daripada menyembunyikan pembatasan yang berlaku.
 */
export function useAccessRuleNames(
  rules: { ruleType: string; ruleValue: string }[],
  known?: Map<string, string>,
) {
  const positionIds = rules.filter((r) => r.ruleType === 'POSITION').map((r) => r.ruleValue)
  const employeeIds = [
    ...new Set(
      rules
        .filter((r) => r.ruleType === 'EMPLOYEE')
        .map((r) => r.ruleValue)
        .filter((id) => !known?.has(id)),
    ),
  ]

  // Daftar posisi hanya diminta kalau memang ada aturan posisi yang belum
  // dikenali. Dataset yang cuma dibatasi jenjang tidak perlu menyentuh HRIS.
  const needPositions = positionIds.some((id) => !known?.has(id))
  const positions = usePositions('', needPositions)

  const employees = useQueries({
    queries: employeeIds.map((id) => ({
      queryKey: queryKeys.taxonomy.employee(id),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        apiGet<HrisRef>(`/api/v1/employees/${id}`, { signal }),
      // Karyawan yang sudah dihapus menjawab 404 dan tidak akan pernah muncul
      // kalau dicoba lagi. Mengulanginya hanya menunda tampilnya UUID.
      retry: false,
      staleTime: 30 * 60_000,
    })),
  })

  return function nameOf(rule: { ruleType: string; ruleValue: string }): string {
    if (rule.ruleType === 'JOB_LEVEL') return rule.ruleValue

    const fromCaller = known?.get(rule.ruleValue)
    if (fromCaller) return fromCaller

    if (rule.ruleType === 'POSITION') {
      return (
        (positions.data ?? []).find((item) => item.id === rule.ruleValue)?.name ?? rule.ruleValue
      )
    }

    const found = employees.find((query) => query.data?.id === rule.ruleValue)
    return found?.data?.name ?? rule.ruleValue
  }
}
