import { Check, Download, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { DownloadDialog } from '@/features/download/components/DownloadDialog'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { Reveal } from '@/shared/components/motion/Reveal'
import { SkeletonCardList } from '@/shared/components/ui/Skeleton'
import { useCopyToClipboard } from '@/shared/hooks/useCopyToClipboard'
import { formatDateTime } from '@/shared/lib/format'
import type { Dataset } from '@/shared/types/api'

import { DataExplorer } from '../components/DataExplorer'
import { useDataset } from '../hooks/useDatasets'

export default function DatasetDetailPage() {
  const { slug = '' } = useParams()
  const query = useDataset(slug)

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-5 pb-12 sm:px-5 sm:pt-[22px] sm:pb-[60px]">
      <QueryBoundary query={query} loading={<SkeletonCardList count={3} />}>
        {(dataset) => <DetailBody dataset={dataset} />}
      </QueryBoundary>
    </div>
  )
}

function DetailBody({ dataset }: { dataset: Dataset }) {
  const [downloadOpen, setDownloadOpen] = useState(false)
  const hasFiles = (dataset.resources?.length ?? 0) > 0

  return (
    <>
      <Reveal>
        <Breadcrumb dataset={dataset} />
        <TitleBlock dataset={dataset} hasFiles={hasFiles} onDownload={() => setDownloadOpen(true)} />
      </Reveal>

      {/*
        Halaman ini pernah punya tiga tab: Ringkasan, Data Explorer, dan Kolom.
        Ketiganya diringkas menjadi satu aliran — kartu keterangan lalu
        penjelajah datanya — mengikuti desain terakhir.

        Yang ikut hilang bersama tab Ringkasan: grafik "Visualisasi interaktif"
        dan panel metadata di samping. Komponennya TIDAK dihapus
        (`SummaryChart`, `DatasetAboutPanel`, `ColumnsTable`) supaya bisa
        dipasang kembali tanpa ditulis ulang kalau ternyata masih dibutuhkan.
      */}
      <Reveal delay={90}>
        <div className="mt-[22px] flex flex-col gap-[22px]">
          <AboutCard dataset={dataset} />
          {/*
            Pemilih berkas menyatu dengan sakelar Tabel/Excel milik Data
            Explorer, bukan berdiri sebagai baris tombol tersendiri di atas
            kartunya. Keduanya menjawab pertanyaan yang sama — "saya sedang
            melihat apa" — dan dua baris tombol untuk satu pertanyaan hanya
            membuat orang menebak mana yang mana.

            Seluruh berkas ikut jadi tombol, dilabeli menurut jenisnya sendiri.
            Berkas yang isinya sudah dibaca menjadi tabel menampilkan tabelnya;
            PDF dan Word menampilkan dokumennya.
          */}
          <DataExplorer slug={dataset.slug ?? ''} files={dataset.resources ?? []} />
        </div>
      </Reveal>

      <DownloadDialog dataset={dataset} open={downloadOpen} onOpenChange={setDownloadOpen} />
    </>
  )
}

function Breadcrumb({ dataset }: { dataset: Dataset }) {
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

function TitleBlock({
  dataset,
  hasFiles,
  onDownload,
}: {
  dataset: Dataset
  hasFiles: boolean
  onDownload: () => void
}) {
  return (
    <div className="mb-2 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-[720px]">
        <div className="mb-2.5 flex flex-wrap gap-2">
          {dataset.topics?.map((topic) => (
            <span
              key={topic}
              className="rounded-md bg-[#E6FAF8] px-2.5 py-1 text-xs font-semibold text-[#0EA5A0]"
            >
              {topic}
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
          {/*
            Waktunya diambil dari `createdAt`, bukan `lastUpdatedAt`.
            "Diunggah" menjawab "kapan berkas ini masuk katalog" — dan
            `lastUpdatedAt` bergeser setiap kali metadatanya disunting, sehingga
            memakainya di sini akan membuat label dan angkanya menceritakan dua
            hal yang berbeda.
          */}
          <span className="text-ink-500">
            · Diunggah{' '}
            {dataset.realtime ? 'streaming real-time' : formatDateTime(dataset.createdAt)}
          </span>
        </div>
      </div>

      <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center">
        <ShareButton dataset={dataset} />

        <button
          type="button"
          onClick={onDownload}
          disabled={!hasFiles}
          className="bg-brand hover:bg-brand-hover disabled:bg-line-200 disabled:text-ink-400 flex w-full items-center justify-center gap-2 rounded-[9px] px-[18px] py-[11px] text-sm font-bold text-white transition-colors disabled:cursor-not-allowed sm:w-auto"
        >
          <Download className="size-4" strokeWidth={2.3} />
          {hasFiles ? `Unduh · ${dataset.fileSize || 'berkas'}` : 'Berkas belum tersedia'}
        </button>
      </div>
    </div>
  )
}

/**
 * Membagikan tautan ke dataset ini.
 *
 * Dua jalur, dan urutannya disengaja:
 *
 * 1. **Lembar berbagi bawaan sistem** (`navigator.share`), kalau ada. Di ponsel
 *    inilah yang sebenarnya orang cari — mengirim ke WhatsApp atau surel
 *    langsung, tanpa menempel manual. API ini praktis hanya ada di peramban
 *    ponsel, jadi di desktop jalur ini otomatis terlewat.
 * 2. **Salin ke papan klip**, sebagai jalur baku desktop sekaligus jaring
 *    pengaman kalau lembar berbagi gagal.
 *
 * Yang dibagikan `window.location.href`, bukan tautan yang disusun sendiri.
 * Menyusun ulang berarti menebak host dan protokolnya, dan tebakan itu meleset
 * begitu portalnya dibuka lewat alamat lain — IP jaringan lokal saat mencoba
 * dari ponsel, misalnya.
 */
function ShareButton({ dataset }: { dataset: Dataset }) {
  const { copy, copiedKey } = useCopyToClipboard()
  const copied = copiedKey === 'share'

  // Dataset beraturan akses tidak terbuka untuk semua orang. Penyalinnya tetap
  // bekerja, tapi pesannya menyebut batasan itu — mengira sudah membagikan
  // sesuatu lalu penerimanya melihat 403 adalah kebingungan yang bisa dicegah
  // dengan satu kalimat.
  const restricted = (dataset.accessRules?.length ?? 0) > 0
  const message = restricted
    ? 'Tautan disalin. Hanya yang berhak bisa membukanya.'
    : 'Tautan dataset disalin.'

  async function share() {
    const url = window.location.href

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: dataset.title ?? 'Dataset', url })
        return
      } catch (error) {
        // Dibatalkan sendiri oleh pengguna BUKAN kegagalan. Menyalin diam-diam
        // setelah ia menutup lembar berbagi sama saja mengabaikan keputusannya.
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }
      }
    }

    await copy(url, 'share', message)
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="border-line-300 text-ink-700 hover:bg-surface-100 flex w-full items-center justify-center gap-2 rounded-[9px] border bg-white px-[18px] py-[11px] text-sm font-bold transition-colors sm:w-auto"
    >
      {copied ? (
        <Check className="text-success size-4" strokeWidth={2.6} />
      ) : (
        <Share2 className="size-4" strokeWidth={2.3} />
      )}
      {copied ? 'Tersalin' : 'Bagikan'}
    </button>
  )
}

function AboutCard({ dataset }: { dataset: Dataset }) {
  return (
    <div className="border-line-200 bg-surface rounded-[14px] border p-4 sm:p-[22px]">
      <h3 className="text-ink-900 mb-2.5 text-base font-bold">Tentang dataset ini</h3>
      <p className="text-ink-600 text-[14.5px] leading-[1.65]">
        {dataset.notes || 'Belum ada deskripsi untuk dataset ini.'}
      </p>
    </div>
  )
}
