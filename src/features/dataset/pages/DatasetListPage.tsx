import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { Reveal } from '@/shared/components/motion/Reveal'
import { Pagination } from '@/shared/components/ui/Pagination'
import { SearchField } from '@/shared/components/ui/SearchField'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { cn } from '@/shared/lib/cn'
import { formatRelative } from '@/shared/lib/format'
import type { DatasetLite } from '@/shared/types/api'

import { useDatasetFilters } from '../hooks/useDatasetFilters'
import { useDatasets, useTopics } from '../hooks/useDatasets'

/** Selang antar kartu hasil, sama dengan kisi di beranda. */
const CARD_DELAY = 70

/**
 * Katalog dataset.
 *
 * Tata letaknya mengikuti berkas desain: filter berupa chip di dalam satu kartu
 * melintang, bukan panel sisi. Perbedaannya bukan sekadar rasa — chip menaruh
 * seluruh pilihan dalam satu pandangan, sementara panel 240px memaksa daftar
 * divisi dan format menumpuk ke bawah.
 */
export default function DatasetListPage() {
  const { filters, query, setFilter, toggleFilter, clearFilters } = useDatasetFilters()
  const datasets = useDatasets(query)

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-6 pb-12 sm:px-5 sm:pt-7 sm:pb-[60px]">
      <Reveal>
        <nav className="text-ink-500 mb-2 text-[13px]" aria-label="Remah roti">
          <Link to={paths.home} className="text-brand font-semibold hover:underline">
            Beranda
          </Link>{' '}
          / Datasets
        </nav>

        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-ink-900 text-[22px] font-extrabold tracking-[-0.8px] sm:text-[28px]">
            {/* Dulu berbunyi "SearchPanel & jelajahi dataset" — kata "Cari"
                ikut tergantikan waktu penamaan disamakan ke bahasa Inggris. */}
            Cari &amp; jelajahi dataset
          </h1>
        </div>

        <div className="mb-[22px] flex flex-wrap gap-2.5">
          <SearchBox initialValue={filters.search} onSearch={(search) => setFilter({ search })} />

          <div className="border-line-300 focus-within:border-brand flex items-center gap-2 rounded-[10px] border bg-white px-3 transition-colors">
            <span className="text-ink-500 text-[13px] font-semibold">Urutkan</span>
            <select
              value={filters.sort}
              onChange={(e) => setFilter({ sort: e.target.value as typeof filters.sort })}
              aria-label="Urutkan hasil"
              className="text-ink-900 border-none bg-transparent px-1 py-3 text-sm font-semibold outline-none"
            >
              <option value="relevance">Relevansi</option>
              <option value="downloads">Unduhan terbanyak</option>
              <option value="updated">Terbaru diperbarui</option>
            </select>
          </div>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <FilterCard filters={filters} toggleFilter={toggleFilter} clearFilters={clearFilters} />
      </Reveal>

      <QueryBoundary query={datasets} loading={<ListSkeleton />}>
        {(page) => (
          <>
            <Reveal delay={140}>
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-ink-600 text-sm">
                  <b className="text-ink-900">{page.totalElements ?? 0}</b> dataset ditemukan
                </div>
                <ActiveChips filters={filters} toggleFilter={toggleFilter} />
              </div>
            </Reveal>

            {page.content && page.content.length > 0 ? (
              <>
                <div className="flex flex-col gap-3">
                  {page.content.map((dataset, i) => (
                    <Reveal key={dataset.id} delay={i * CARD_DELAY}>
                      <DatasetCardItem dataset={dataset} />
                    </Reveal>
                  ))}
                </div>

                <Pagination
                  className="mt-[26px] justify-center"
                  page={filters.page}
                  totalPages={page.totalPages ?? 1}
                  onPageChange={(p) => setFilter({ page: p })}
                  labels
                />
              </>
            ) : (
              <NoResults onClear={clearFilters} />
            )}
          </>
        )}
      </QueryBoundary>
    </div>
  )
}

/** Jeda sebelum ketikan dikirim sebagai pencarian. */
const TYPING_DEBOUNCE_MS = 350

function SearchBox({ initialValue, onSearch }: { initialValue: string; onSearch: (value: string) => void }) {
  const [value, setValue] = useState(initialValue)

  // Menyelaraskan kotak dengan URL saat pengguna menekan tombol Kembali, atau
  // ketika halaman ini dibuka lewat tautan pencarian dari beranda.
  useEffect(() => setValue(initialValue), [initialValue])

  /*
   * Desain menyaring langsung saat mengetik. Di prototipe itu gratis — datanya
   * ada di memori. Di sini setiap ketikan berarti satu permintaan ke server,
   * jadi pengiriman ditunda sesaat setelah pengguna berhenti mengetik.
   *
   * Perbandingan dengan `nilaiAwal` mencegah putaran: setelah URL diperbarui,
   * efek ini berjalan lagi dengan nilai yang sudah sama dan berhenti di sini.
   */
  useEffect(() => {
    if (value.trim() === initialValue) return
    const timer = setTimeout(() => onSearch(value.trim()), TYPING_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [value, initialValue, onSearch])

  return (
    <SearchField
      value={value}
      onChange={setValue}
      placeholder="Cari judul atau deskripsi dataset…"
      label="Cari dataset"
      className="min-w-[240px] flex-1"
      inputClassName="py-[13px]"
    />
  )
}

type FilterApi = ReturnType<typeof useDatasetFilters>

/**
 * Kartu penyaring — kini hanya TOPIK.
 *
 * Grup "Format" dan "Divisi" dibuang dari tampilan, tapi penyaringnya TIDAK
 * dimatikan: `?divisions=SALES` dan `?formats=CSV` di URL tetap bekerja, dan
 * halaman Divisi maupun tautan "Oleh <divisi>" di detail dataset masih
 * mengandalkannya.
 *
 * Karena itu chip aktifnya tetap ditampilkan di atas hasil, lengkap dengan
 * tombol lepasnya. Menyaring diam-diam tanpa memberi tahu apa yang sedang
 * disaring akan membuat orang melihat "8 dataset ditemukan" dan menyangka
 * itulah seluruh isi katalog.
 */
function FilterCard({
  filters,
  toggleFilter,
  clearFilters,
}: Pick<FilterApi, 'filters' | 'toggleFilter' | 'clearFilters'>) {
  const topics = useTopics()

  return (
    <div className="border-line-200 bg-surface mb-5 rounded-[14px] border px-[18px] py-4">
      <div className="mb-3 flex items-center justify-between gap-2.5">
        <span className="text-ink-900 text-sm font-bold">Filter</span>
        <button
          type="button"
          onClick={clearFilters}
          className="text-brand text-[13px] font-semibold hover:underline"
        >
          Bersihkan semua
        </button>
      </div>

      <div className="flex flex-wrap gap-[22px]">
        <ChipGroup
          title="Topik"
          loading={topics.isPending}
          options={(topics.data ?? []).map((t) => t.name ?? '')}
          chosen={filters.topics}
          onToggle={(value) => toggleFilter('topics', value)}
        />
      </div>
    </div>
  )
}

function ChipGroup({
  title,
  loading,
  options,
  chosen,
  onToggle,
}: {
  title: string
  loading: boolean
  options: string[]
  chosen: string[]
  onToggle: (value: string) => void
}) {
  return (
    <fieldset className="flex items-start gap-2.5">
      <legend className="sr-only">{title}</legend>
      <span className="text-ink-400 shrink-0 pt-2 text-[11.5px] font-bold tracking-[0.5px] uppercase">
        {title}
      </span>

      <div className="flex flex-wrap gap-[7px]">
        {loading
          ? Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[31px] w-20 rounded-full" />
            ))
          : options.map((value) => {
              const active = chosen.includes(value)
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onToggle(value)}
                  aria-pressed={active}
                  className={cn(
                    'rounded-full border px-[13px] py-[7px] text-[13px] font-semibold whitespace-nowrap transition-colors',
                    active
                      ? 'bg-brand border-brand text-white'
                      : 'border-line-300 text-ink-700 hover:bg-surface-100 bg-white',
                  )}
                >
                  {value}
                </button>
              )
            })}
      </div>
    </fieldset>
  )
}

function ActiveChips({ filters, toggleFilter }: Pick<FilterApi, 'filters' | 'toggleFilter'>) {
  const chips = [
    ...filters.topics.map((v) => ({ key: 'topics' as const, value: v })),
    ...filters.formats.map((v) => ({ key: 'formats' as const, value: v })),
    ...filters.divisions.map((v) => ({ key: 'divisions' as const, value: v })),
  ]

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(({ key, value }) => (
        <button
          key={`${key}-${value}`}
          type="button"
          onClick={() => toggleFilter(key, value)}
          aria-label={`Hapus filter ${value}`}
          className="bg-brand-tint border-brand-border text-brand hover:bg-[#e2ebff] flex items-center gap-1.5 rounded-full border py-[5px] pr-2 pl-[11px] text-[12.5px] font-semibold transition-colors"
        >
          {value} <span className="text-sm">×</span>
        </button>
      ))}
    </div>
  )
}

function DatasetCardItem({ dataset }: { dataset: DatasetLite }) {
  return (
    <Link
      to={paths.datasetDetail(dataset.slug ?? '')}
      className="border-line-200 bg-surface hover:border-brand-border flex flex-col gap-[9px] rounded-[14px] border px-[22px] py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(16,24,40,0.28)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-600 rounded-md bg-[#F1F4F8] px-[9px] py-[3px] text-xs font-bold">
          {dataset.division?.code}
        </span>
        {dataset.topics?.map((topic) => (
          <span
            key={topic}
            className="rounded-md bg-[#E6FAF8] px-[9px] py-[3px] text-xs font-semibold text-[#0EA5A0]"
          >
            {topic}
          </span>
        ))}
      </div>

      <div className="text-ink-900 text-lg leading-[1.25] font-bold">{dataset.title}</div>

      {dataset.notes ? (
        <p className="text-ink-500 text-sm leading-[1.5]">{dataset.notes}</p>
      ) : null}

      <div className="mt-0.5 flex flex-wrap items-center gap-2">
        {dataset.formats?.map((format) => (
          <span
            key={format}
            className="text-ink-400 border-line-200 rounded-[5px] border px-[7px] py-0.5 text-[11px] font-bold tracking-[0.4px]"
          >
            {format}
          </span>
        ))}
        <span className="text-ink-400 ml-auto text-[12.5px]">
          Diperbarui {formatRelative(dataset.lastUpdatedAt, dataset.realtime)}
        </span>
      </div>
    </Link>
  )
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="border-line-300 bg-surface rounded-[14px] border border-dashed px-4 py-10 text-center sm:px-6 sm:py-14">
      <div className="mb-2.5 text-[32px] sm:text-[40px]" aria-hidden>
        🔍
      </div>
      <div className="text-ink-900 mb-1.5 text-[17px] font-bold">Tidak ada dataset yang cocok</div>
      <p className="text-ink-500 mb-[18px] text-sm">
        Coba kata kunci lain atau longgarkan filter Anda.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="bg-brand hover:bg-brand-hover rounded-[9px] px-5 py-[11px] text-sm font-bold text-white transition-colors"
      >
        Bersihkan semua filter
      </button>
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-[150px] rounded-[14px]" />
      ))}
    </div>
  )
}
