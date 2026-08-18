import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { DatasetQuery } from '../api/datasetApi'

const SORT_SAH = ['relevance', 'downloads', 'updated'] as const
type Sort = (typeof SORT_SAH)[number]

export const UKURAN_HALAMAN = 5

/**
 * Filter katalog disimpan di URL, bukan di state React.
 *
 * Konsekuensinya tiga-tiganya jalan tanpa kode tambahan: tautan hasil pencarian
 * bisa dibagikan ke rekan kerja, tombol Kembali mengembalikan filter
 * sebelumnya, dan menyegarkan halaman tidak menghapus pilihan pengguna.
 */
export function useDatasetFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => {
    const sortMentah = searchParams.get('sort')
    const halamanMentah = Number.parseInt(searchParams.get('page') ?? '1', 10)

    return {
      search: searchParams.get('search') ?? '',
      topics: searchParams.getAll('topics'),
      formats: searchParams.getAll('formats'),
      divisions: searchParams.getAll('divisions'),
      // Nilai dari URL dikendalikan pengguna. Diperiksa terhadap daftar yang
      // sah, tidak diteruskan mentah sebagai parameter kueri ke back-end.
      sort: (SORT_SAH as readonly string[]).includes(sortMentah ?? '')
        ? (sortMentah as Sort)
        : ('relevance' as Sort),
      /** Berbasis 1 untuk tampilan; dikonversi ke 0 saat dikirim ke API. */
      page: Number.isFinite(halamanMentah) && halamanMentah > 0 ? halamanMentah : 1,
    }
  }, [searchParams])

  const setFilter = useCallback(
    (perubahan: Partial<typeof filters>) => {
      const params = new URLSearchParams(searchParams)

      for (const [kunci, nilai] of Object.entries(perubahan)) {
        params.delete(kunci)
        if (Array.isArray(nilai)) {
          nilai.forEach((v) => params.append(kunci, v))
        } else if (nilai !== '' && nilai != null) {
          params.set(kunci, String(nilai))
        }
      }

      // Mengubah filter apa pun mengembalikan ke halaman pertama. Tanpa ini,
      // pengguna yang sedang di halaman 3 lalu memilih filter baru akan melihat
      // hasil kosong dan mengira tidak ada datanya.
      if (!('page' in perubahan)) params.delete('page')

      setSearchParams(params, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  const toggleFilter = useCallback(
    (kunci: 'topics' | 'formats' | 'divisions', nilai: string) => {
      const sekarang = filters[kunci]
      setFilter({
        [kunci]: sekarang.includes(nilai)
          ? sekarang.filter((v) => v !== nilai)
          : [...sekarang, nilai],
      })
    },
    [filters, setFilter],
  )

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true })
  }, [setSearchParams])

  /** Bentuk yang siap dikirim ke API (halaman berbasis 0). */
  const query: DatasetQuery = useMemo(
    () => ({
      search: filters.search || undefined,
      topics: filters.topics.length ? filters.topics : undefined,
      formats: filters.formats.length ? filters.formats : undefined,
      divisions: filters.divisions.length ? filters.divisions : undefined,
      sort: filters.sort,
      page: filters.page - 1,
      size: UKURAN_HALAMAN,
    }),
    [filters],
  )

  const jumlahFilterAktif =
    filters.topics.length + filters.formats.length + filters.divisions.length

  return { filters, query, setFilter, toggleFilter, clearFilters, jumlahFilterAktif }
}
