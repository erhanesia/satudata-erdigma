import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import type { DatasetQuery } from '../api/datasetApi'

const VALID_SORTS = ['relevance', 'downloads', 'updated'] as const
type Sort = (typeof VALID_SORTS)[number]

export const PAGE_SIZE = 5

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
    const rawSort = searchParams.get('sort')
    const rawPage = Number.parseInt(searchParams.get('page') ?? '1', 10)

    return {
      search: searchParams.get('search') ?? '',
      topics: searchParams.getAll('topics'),
      formats: searchParams.getAll('formats'),
      divisions: searchParams.getAll('divisions'),
      // Nilai dari URL dikendalikan pengguna. Diperiksa terhadap daftar yang
      // sah, tidak diteruskan mentah sebagai parameter kueri ke back-end.
      sort: (VALID_SORTS as readonly string[]).includes(rawSort ?? '')
        ? (rawSort as Sort)
        : ('relevance' as Sort),
      /** Berbasis 1 untuk tampilan; dikonversi ke 0 saat dikirim ke API. */
      page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    }
  }, [searchParams])

  const setFilter = useCallback(
    (perubahan: Partial<typeof filters>) => {
      const params = new URLSearchParams(searchParams)

      for (const [key, value] of Object.entries(perubahan)) {
        params.delete(key)
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v))
        } else if (value !== '' && value != null) {
          params.set(key, String(value))
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
    (key: 'topics' | 'formats' | 'divisions', value: string) => {
      const now = filters[key]
      setFilter({
        [key]: now.includes(value)
          ? now.filter((v) => v !== value)
          : [...now, value],
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
      size: PAGE_SIZE,
    }),
    [filters],
  )

  const activeFilterCount =
    filters.topics.length + filters.formats.length + filters.divisions.length

  return { filters, query, setFilter, toggleFilter, clearFilters, activeFilterCount }
}
