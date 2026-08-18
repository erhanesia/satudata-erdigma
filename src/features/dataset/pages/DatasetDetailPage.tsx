import { AlertTriangle } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { DownloadDialog } from '@/features/download/components/DownloadDialog'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { Reveal } from '@/shared/components/motion/Reveal'
import { SkeletonCardList } from '@/shared/components/ui/Skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/Tabs'
import { cn } from '@/shared/lib/cn'
import { formatDateTime } from '@/shared/lib/format'
import type { Dataset } from '@/shared/types/api'

import { ColumnsTable } from '../components/ColumnsTable'
import { DataExplorer } from '../components/DataExplorer'
import { DatasetAboutPanel } from '../components/DatasetAboutPanel'
import { SummaryChart } from '../components/SummaryChart'
import { useDataset } from '../hooks/useDatasets'

/**
 * Dua alternatif tata letak yang ditawarkan desain:
 *
 *  - **A · Bertab** — isi dipisah ke tab Ringkasan / Data Explorer / Kolom.
 *    Halaman pendek, tapi pengguna harus tahu apa yang dicari.
 *  - **B · Gulir + sidebar** — semuanya bertumpuk dalam satu gulir, panel
 *    samping ikut sepanjang halaman. Lebih mudah dipindai, lebih panjang.
 *
 * Pilihan disimpan di query string, bukan state komponen, supaya tautan
 * perbandingan bisa dikirim ke tim desain apa adanya.
 */
type Varian = 'A' | 'B'

const PARAM_VARIAN = 'layout'

/**
 * Panel samping ikut menggulir lalu berhenti 80px di bawah tepi atas — persis
 * di bawah header yang juga menempel (tingginya 64px).
 *
 * `self-start` wajib: tanpanya item kisi ini merenggang setinggi barisnya, dan
 * elemen setinggi kotaknya sendiri tidak punya jarak untuk menempel.
 */
const STICKY_SAMPING = 'lg:sticky lg:top-20 lg:self-start'

function bacaVarian(nilai: string | null): Varian {
  return nilai === 'B' ? 'B' : 'A'
}

export default function DatasetDetailPage() {
  const { slug = '' } = useParams()
  const query = useDataset(slug)

  return (
    <div className="mx-auto max-w-[1200px] px-5 pt-[22px] pb-[60px]">
      <QueryBoundary query={query} loading={<SkeletonCardList count={3} />}>
        {(dataset) => <IsiDetail dataset={dataset} />}
      </QueryBoundary>
    </div>
  )
}

function IsiDetail({ dataset }: { dataset: Dataset }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [modalUnduh, setModalUnduh] = useState(false)

  const varian = bacaVarian(searchParams.get(PARAM_VARIAN))
  const slug = dataset.slug ?? ''
  const kolom = dataset.columns ?? []
  const rowCount = dataset.rowCount ?? 0
  const adaBerkas = (dataset.resources?.length ?? 0) > 0

  function gantiVarian(pilihan: Varian) {
    const params = new URLSearchParams(searchParams)
    // Varian A adalah bawaan, jadi tidak perlu mengotori URL.
    if (pilihan === 'A') params.delete(PARAM_VARIAN)
    else params.set(PARAM_VARIAN, pilihan)
    setSearchParams(params, { replace: true })
  }

  return (
    <>
      <Reveal>
        <RemahRoti dataset={dataset} />
        <SakelarVarian nilai={varian} onGanti={gantiVarian} />
        <BlokJudul dataset={dataset} adaBerkas={adaBerkas} onUnduh={() => setModalUnduh(true)} />
      </Reveal>

      {varian === 'A' ? (
        <Reveal delay={90}>
          <div className="mt-[22px]">
            <Tabs defaultValue="ringkasan">
              <TabsList className="mb-6">
                <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
                <TabsTrigger value="explorer">Data Explorer</TabsTrigger>
                <TabsTrigger value="kolom">Kolom</TabsTrigger>
              </TabsList>

              <TabsContent value="ringkasan">
                <div className="grid items-start gap-[26px] lg:grid-cols-[1fr_320px]">
                  <div className="flex min-w-0 flex-col gap-[22px]">
                    <KartuTentang dataset={dataset} />
                    <KartuVisualisasi slug={slug} kolom={kolom} rowCount={rowCount} berlabel />
                  </div>
                  <div className={STICKY_SAMPING}>
                    <DatasetAboutPanel dataset={dataset} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="explorer">
                <DataExplorer slug={slug} rowCount={rowCount} />
              </TabsContent>

              <TabsContent value="kolom">
                <ColumnsTable columns={kolom} />
              </TabsContent>
            </Tabs>
          </div>
        </Reveal>
      ) : (
        <div className="mt-[22px] grid items-start gap-[26px] lg:grid-cols-[1fr_320px]">
          <div className="flex min-w-0 flex-col gap-[22px]">
            <Reveal delay={90}>
              <KartuTentang dataset={dataset} />
            </Reveal>
            <Reveal delay={160}>
              <KartuVisualisasi slug={slug} kolom={kolom} rowCount={rowCount} />
            </Reveal>
            <Reveal>
              <DataExplorer slug={slug} rowCount={rowCount} />
            </Reveal>
            <Reveal>
              <ColumnsTable columns={kolom} />
            </Reveal>
          </div>
          {/* Sticky dipasang pada item kisi ini, bukan di dalam panelnya —
              lihat catatan di DatasetAboutPanel. */}
          <Reveal delay={230} className={STICKY_SAMPING}>
            <DatasetAboutPanel dataset={dataset} />
          </Reveal>
        </div>
      )}

      <DownloadDialog dataset={dataset} open={modalUnduh} onOpenChange={setModalUnduh} />
    </>
  )
}

function RemahRoti({ dataset }: { dataset: Dataset }) {
  return (
    <nav className="text-ink-500 mb-3.5 text-[13px]" aria-label="Remah roti">
      <Link to={paths.datasets} className="text-brand font-semibold hover:underline">
        Datasets
      </Link>
      {dataset.collection ? (
        <>
          {' / '}
          <Link
            to={paths.collectionDetail(dataset.collection.slug ?? '')}
            className="text-brand font-semibold hover:underline"
          >
            {dataset.collection.name}
          </Link>
        </>
      ) : null}
      {' / '}
      <span className="text-ink-400">{dataset.title}</span>
    </nav>
  )
}

/**
 * Bilah pembanding tata letak.
 *
 * Ini alat kerja tim desain, bukan fitur untuk pengguna akhir — desainnya
 * sendiri menyebutnya "Bandingkan layout". Warnanya sengaja kuning agar jelas
 * ia bukan bagian dari halaman yang sesungguhnya, dan gampang dicabut nanti.
 */
function SakelarVarian({ nilai, onGanti }: { nilai: Varian; onGanti: (v: Varian) => void }) {
  return (
    <div className="mb-[18px] flex flex-wrap items-center gap-2.5 rounded-[10px] border border-[#FCE9B8] bg-[#FFF8E8] px-3 py-2 text-[13px] text-[#92700E]">
      <b>Bandingkan layout:</b>

      <div className="flex rounded-lg border border-[#F0DBA0] bg-white p-0.5">
        <TombolVarian aktif={nilai === 'A'} onClick={() => onGanti('A')}>
          A · Bertab
        </TombolVarian>
        <TombolVarian aktif={nilai === 'B'} onClick={() => onGanti('B')}>
          B · Gulir + sidebar
        </TombolVarian>
      </div>

      <span className="text-[#B08820]">Dua alternatif tata letak halaman Detail Dataset.</span>
    </div>
  )
}

function TombolVarian({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktif}
      className={cn(
        'rounded-md px-3 py-1.5 text-[12.5px] transition-colors',
        aktif ? 'bg-brand font-bold text-white' : 'font-semibold text-[#92700E] hover:bg-[#FFF8E8]',
      )}
    >
      {children}
    </button>
  )
}

function BlokJudul({
  dataset,
  adaBerkas,
  onUnduh,
}: {
  dataset: Dataset
  adaBerkas: boolean
  onUnduh: () => void
}) {
  return (
    <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-[720px]">
        <div className="mb-2.5 flex flex-wrap gap-2">
          {dataset.topics?.map((topik) => (
            <span
              key={topik}
              className="rounded-md bg-[#E6FAF8] px-2.5 py-1 text-xs font-semibold text-[#0EA5A0]"
            >
              {topik}
            </span>
          ))}
        </div>

        <h1 className="text-ink-900 mb-2.5 text-[clamp(24px,3vw,34px)] leading-[1.1] font-extrabold tracking-[-0.9px]">
          {dataset.title}
        </h1>

        <div className="text-ink-600 text-[14.5px]">
          Oleh{' '}
          <Link
            to={`${paths.datasets}?divisions=${encodeURIComponent(dataset.division?.code ?? '')}`}
            className="text-brand font-bold hover:underline"
          >
            {dataset.division?.name}
          </Link>
          {dataset.coverage ? ` · Cakupan ${dataset.coverage}` : null}{' '}
          <span className="text-ink-500">
            · Terakhir diperbarui{' '}
            {dataset.realtime ? 'streaming real-time' : formatDateTime(dataset.lastUpdatedAt)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onUnduh}
        disabled={!adaBerkas}
        className="bg-brand hover:bg-brand-hover disabled:bg-line-200 disabled:text-ink-400 flex items-center gap-2 rounded-[9px] px-[18px] py-[11px] text-sm font-bold text-white transition-colors disabled:cursor-not-allowed"
      >
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.3} aria-hidden>
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
        </svg>
        {adaBerkas ? `Unduh · ${dataset.fileSize || 'berkas'}` : 'Berkas belum tersedia'}
      </button>
    </div>
  )
}

function KartuTentang({ dataset }: { dataset: Dataset }) {
  return (
    <div className="border-line-200 bg-surface rounded-[14px] border p-[22px]">
      <h3 className="text-ink-900 mb-2.5 text-base font-bold">Tentang dataset ini</h3>
      <p className="text-ink-600 text-[14.5px] leading-[1.65]">
        {dataset.notes || 'Belum ada deskripsi untuk dataset ini.'}
      </p>
      {/* Sebelumnya teks ini melayang tanpa judul, sehingga pembaca tidak
          tahu sedang membaca apa — peringatan, catatan kaki, atau keterangan
          biasa. Judulnya membuat maksudnya jelas sebelum kalimatnya dibaca. */}
      {dataset.disclaimer ? (
        <div className="border-warning/40 mt-3.5 rounded-r-lg border-l-[3px] bg-[#F8FAFC] px-3.5 py-2.5">
          <div className="text-ink-700 mb-1 flex items-center gap-1.5 text-[12.5px] font-bold">
            <AlertTriangle className="text-warning size-3.5" />
            Disclaimer
          </div>
          <p className="text-ink-500 text-[13px] leading-[1.6]">{dataset.disclaimer}</p>
        </div>
      ) : null}
    </div>
  )
}

function KartuVisualisasi({
  slug,
  kolom,
  rowCount,
  berlabel = false,
}: {
  slug: string
  kolom: Dataset['columns']
  rowCount: number
  berlabel?: boolean
}) {
  return (
    <div className="border-line-200 bg-surface rounded-[14px] border p-[22px]">
      <div
        className={cn(
          'flex items-center justify-between',
          berlabel ? 'mb-1.5' : 'mb-3.5',
        )}
      >
        <h3 className="text-ink-900 text-base font-bold">Visualisasi interaktif</h3>
        {/* Keterangan ini hanya muncul di varian A, persis seperti desain. */}
        {berlabel ? (
          <span className="text-ink-400 text-xs">dari data aktual dataset</span>
        ) : null}
      </div>
      <SummaryChart slug={slug} columns={kolom ?? []} rowCount={rowCount} />
    </div>
  )
}
