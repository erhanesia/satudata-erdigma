import { Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { useDivisions } from '@/features/division/hooks/useDivisions'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { Reveal } from '@/shared/components/motion/Reveal'
import { Pagination } from '@/shared/components/ui/Pagination'
import { SearchField } from '@/shared/components/ui/SearchField'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { cn } from '@/shared/lib/cn'
import { formatRelative } from '@/shared/lib/format'
import type { DatasetLite } from '@/shared/types/api'

import { useDatasetFilters } from '../hooks/useDatasetFilters'
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'

import { useDatasets, useFormats, useTopics } from '../hooks/useDatasets'

/** Selang antar kartu hasil, sama dengan kisi di beranda. */
const JEDA_KARTU = 70

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
  const { data: user } = useCurrentUser()
  const bolehTerbit = user?.role === 'ADMIN' || user?.role === 'PUBLISHER'

  return (
    <div className="mx-auto max-w-[1200px] px-5 pt-7 pb-[60px]">
      <Reveal>
        <nav className="text-ink-500 mb-2 text-[13px]" aria-label="Remah roti">
          <Link to={paths.home} className="text-brand font-semibold hover:underline">
            Beranda
          </Link>{' '}
          / Datasets
        </nav>

        <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-ink-900 text-[28px] font-extrabold tracking-[-0.8px]">
            Cari &amp; jelajahi dataset
          </h1>
          {/* Hanya muncul untuk yang berhak. Menampilkan tombol yang pasti
              ditolak server hanya membuat orang mengira aplikasinya rusak. */}
          {bolehTerbit ? (
            <Link
              to={paths.datasetUpload}
              className="bg-brand inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-[13.5px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Upload className="size-4" />
              Terbitkan dataset
            </Link>
          ) : null}
        </div>

        <div className="mb-[22px] flex flex-wrap gap-2.5">
          <KotakCari nilaiAwal={filters.search} onCari={(search) => setFilter({ search })} />

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
        <KartuFilter filters={filters} toggleFilter={toggleFilter} clearFilters={clearFilters} />
      </Reveal>

      <QueryBoundary query={datasets} loading={<DaftarSkeleton />}>
        {(page) => (
          <>
            <Reveal delay={140}>
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-ink-600 text-sm">
                  <b className="text-ink-900">{page.totalElements ?? 0}</b> dataset ditemukan
                </div>
                <ChipAktif filters={filters} toggleFilter={toggleFilter} />
              </div>
            </Reveal>

            {page.content && page.content.length > 0 ? (
              <>
                <div className="flex flex-col gap-3">
                  {page.content.map((dataset, i) => (
                    <Reveal key={dataset.id} delay={i * JEDA_KARTU}>
                      <KartuDataset dataset={dataset} />
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
              <TidakAdaHasil onBersihkan={clearFilters} />
            )}
          </>
        )}
      </QueryBoundary>
    </div>
  )
}

/** Jeda sebelum ketikan dikirim sebagai pencarian. */
const JEDA_KETIK_MS = 350

function KotakCari({ nilaiAwal, onCari }: { nilaiAwal: string; onCari: (nilai: string) => void }) {
  const [nilai, setNilai] = useState(nilaiAwal)

  // Menyelaraskan kotak dengan URL saat pengguna menekan tombol Kembali, atau
  // ketika halaman ini dibuka lewat tautan pencarian dari beranda.
  useEffect(() => setNilai(nilaiAwal), [nilaiAwal])

  /*
   * Desain menyaring langsung saat mengetik. Di prototipe itu gratis — datanya
   * ada di memori. Di sini setiap ketikan berarti satu permintaan ke server,
   * jadi pengiriman ditunda sesaat setelah pengguna berhenti mengetik.
   *
   * Perbandingan dengan `nilaiAwal` mencegah putaran: setelah URL diperbarui,
   * efek ini berjalan lagi dengan nilai yang sudah sama dan berhenti di sini.
   */
  useEffect(() => {
    if (nilai.trim() === nilaiAwal) return
    const pewaktu = setTimeout(() => onCari(nilai.trim()), JEDA_KETIK_MS)
    return () => clearTimeout(pewaktu)
  }, [nilai, nilaiAwal, onCari])

  return (
    <SearchField
      value={nilai}
      onChange={setNilai}
      placeholder="Cari judul atau deskripsi dataset…"
      label="Cari dataset"
      className="min-w-[240px] flex-1"
      inputClassName="py-[13px]"
    />
  )
}

type FilterApi = ReturnType<typeof useDatasetFilters>

function KartuFilter({
  filters,
  toggleFilter,
  clearFilters,
}: Pick<FilterApi, 'filters' | 'toggleFilter' | 'clearFilters'>) {
  const topics = useTopics()
  const formats = useFormats()
  const divisions = useDivisions()

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
        <GrupChip
          judul="Topik"
          memuat={topics.isPending}
          pilihan={(topics.data ?? []).map((t) => t.name ?? '')}
          terpilih={filters.topics}
          onToggle={(nilai) => toggleFilter('topics', nilai)}
        />
        <GrupChip
          judul="Format"
          memuat={formats.isPending}
          pilihan={(formats.data ?? []).map((f) => f.name ?? '')}
          terpilih={filters.formats}
          onToggle={(nilai) => toggleFilter('formats', nilai)}
        />
        <GrupChip
          judul="Divisi"
          memuat={divisions.isPending}
          pilihan={(divisions.data ?? []).map((a) => a.code ?? '')}
          terpilih={filters.divisions}
          onToggle={(nilai) => toggleFilter('divisions', nilai)}
        />
      </div>
    </div>
  )
}

function GrupChip({
  judul,
  memuat,
  pilihan,
  terpilih,
  onToggle,
}: {
  judul: string
  memuat: boolean
  pilihan: string[]
  terpilih: string[]
  onToggle: (nilai: string) => void
}) {
  return (
    <fieldset className="flex items-start gap-2.5">
      <legend className="sr-only">{judul}</legend>
      <span className="text-ink-400 shrink-0 pt-2 text-[11.5px] font-bold tracking-[0.5px] uppercase">
        {judul}
      </span>

      <div className="flex flex-wrap gap-[7px]">
        {memuat
          ? Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-[31px] w-20 rounded-full" />
            ))
          : pilihan.map((nilai) => {
              const aktif = terpilih.includes(nilai)
              return (
                <button
                  key={nilai}
                  type="button"
                  onClick={() => onToggle(nilai)}
                  aria-pressed={aktif}
                  className={cn(
                    'rounded-full border px-[13px] py-[7px] text-[13px] font-semibold whitespace-nowrap transition-colors',
                    aktif
                      ? 'bg-brand border-brand text-white'
                      : 'border-line-300 text-ink-700 hover:bg-surface-100 bg-white',
                  )}
                >
                  {nilai}
                </button>
              )
            })}
      </div>
    </fieldset>
  )
}

function ChipAktif({ filters, toggleFilter }: Pick<FilterApi, 'filters' | 'toggleFilter'>) {
  const chips = [
    ...filters.topics.map((v) => ({ kunci: 'topics' as const, nilai: v })),
    ...filters.formats.map((v) => ({ kunci: 'formats' as const, nilai: v })),
    ...filters.divisions.map((v) => ({ kunci: 'divisions' as const, nilai: v })),
  ]

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map(({ kunci, nilai }) => (
        <button
          key={`${kunci}-${nilai}`}
          type="button"
          onClick={() => toggleFilter(kunci, nilai)}
          aria-label={`Hapus filter ${nilai}`}
          className="bg-brand-tint border-brand-border text-brand hover:bg-[#e2ebff] flex items-center gap-1.5 rounded-full border py-[5px] pr-2 pl-[11px] text-[12.5px] font-semibold transition-colors"
        >
          {nilai} <span className="text-sm">×</span>
        </button>
      ))}
    </div>
  )
}

function KartuDataset({ dataset }: { dataset: DatasetLite }) {
  return (
    <Link
      to={paths.datasetDetail(dataset.slug ?? '')}
      className="border-line-200 bg-surface hover:border-brand-border flex flex-col gap-[9px] rounded-[14px] border px-[22px] py-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(16,24,40,0.28)]"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-ink-600 rounded-md bg-[#F1F4F8] px-[9px] py-[3px] text-xs font-bold">
          {dataset.division?.code}
        </span>
        {dataset.topics?.map((topik) => (
          <span
            key={topik}
            className="rounded-md bg-[#E6FAF8] px-[9px] py-[3px] text-xs font-semibold text-[#0EA5A0]"
          >
            {topik}
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

function TidakAdaHasil({ onBersihkan }: { onBersihkan: () => void }) {
  return (
    <div className="border-line-300 bg-surface rounded-[14px] border border-dashed px-6 py-14 text-center">
      <div className="mb-2.5 text-[40px]" aria-hidden>
        🔍
      </div>
      <div className="text-ink-900 mb-1.5 text-[17px] font-bold">Tidak ada dataset yang cocok</div>
      <p className="text-ink-500 mb-[18px] text-sm">
        Coba kata kunci lain atau longgarkan filter Anda.
      </p>
      <button
        type="button"
        onClick={onBersihkan}
        className="bg-brand hover:bg-brand-hover rounded-[9px] px-5 py-[11px] text-sm font-bold text-white transition-colors"
      >
        Bersihkan semua filter
      </button>
    </div>
  )
}

function DaftarSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-[150px] rounded-[14px]" />
      ))}
    </div>
  )
}
