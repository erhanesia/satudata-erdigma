import { Check, Download, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { DownloadDialog } from '@/features/download/components/DownloadDialog'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { Reveal } from '@/shared/components/motion/Reveal'
import { RichText } from '@/shared/components/ui/RichText'
import { SkeletonCardList } from '@/shared/components/ui/Skeleton'
import { useCopyToClipboard } from '@/shared/hooks/useCopyToClipboard'
import { formatDateTime, formatRelative } from '@/shared/lib/format'
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
          <DataExplorer
            slug={dataset.slug ?? ''}
            files={dataset.resources ?? []}
            onRequestDownload={() => setDownloadOpen(true)}
          />
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
            "Diunggah" menjawab "sejak kapan dataset ini ada di katalog", dan
            jawaban itu memang tidak pernah berubah. Kapan datanya terakhir
            berubah adalah pertanyaan lain, dan dijawab baris di bawahnya.
          */}
          <span className="text-ink-500">
            · Diunggah{' '}
            {dataset.realtime ? 'streaming real-time' : formatDateTime(dataset.createdAt)}
          </span>
        </div>

        <FreshnessLine dataset={dataset} />
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
/**
 * Dua fakta yang menentukan apakah data ini layak dipakai.
 *
 * <h2>Kenapa dipisah dari baris identitas di atasnya</h2>
 *
 * Baris di atas menjawab "dataset ini milik siapa dan sejak kapan ada".
 * Baris ini menjawab pertanyaan yang sama sekali berbeda, dan justru yang
 * dibawa hampir setiap pembaca: <b>apakah data ini masih cukup baru untuk
 * keputusan yang sedang saya ambil.</b> Menggabungkannya jadi satu baris
 * panjang membuat keduanya sama-sama sulit dipindai.
 *
 * <h2>Periode data disebut lebih dulu, dan itu disengaja</h2>
 *
 * Ini yang paling sering disalahpahami di katalog data. Dataset yang diunggah
 * hari ini tetapi isinya Januari sampai Juni 2025 BUKAN data baru — ia data
 * lama yang baru masuk katalog. Pembaca yang cuma melihat "diperbarui 12 jam
 * lalu" akan menyimpulkan sebaliknya, dan kesimpulan itu dipakai mengambil
 * keputusan.
 *
 * Kolomnya sudah lama ada dan sudah terisi di sebagian besar dataset, tetapi
 * tidak pernah digambar di halaman ini. Yang tampil selama ini cuma di kartu
 * kecil pada daftar koleksi.
 *
 * <h2>Kenapa banyak dataset TIDAK punya periode data</h2>
 *
 * Yang mengisinya hanya seed. Formulir tambah dataset tidak punya isian untuk
 * ruas ini, dan itu disengaja mengikuti desain — lihat catatannya di
 * `AdminDatasetNewPage`. Akibatnya setiap dataset yang benar-benar diterbitkan
 * lewat panel admin tidak akan pernah memilikinya.
 *
 * Keadaan itu diketahui dan diterima untuk sekarang. Tampilannya tetap
 * dipertahankan, bukan dibuang, karena ruasnya masih hidup di database dan di
 * API: begitu isian di formulir dikembalikan, baris ini langsung bekerja tanpa
 * ada yang perlu ditulis ulang. Membuangnya sekarang berarti menulisnya lagi
 * nanti, dan yang menulis ulang belum tentu tahu pertimbangan yang sudah
 * dibuat di sini.
 *
 * <h2>"Data diperbarui", bukan "diperbarui"</h2>
 *
 * Kata "data" di situ menahan salah baca. `lastUpdatedAt` hanya bergeser saat
 * ISI datasetnya berubah: diterbitkan, berkas ditambah, dibuang, atau diganti.
 * Menyunting judul, deskripsi, topik, atau aturan akses TIDAK menggesernya.
 *
 * Pemisahan itu disengaja dan mengikuti cara portal data pada umumnya
 * membedakan perubahan data dari perubahan metadata. Kalau memperbaiki satu
 * salah ketik ikut menggeser angkanya, angka itu berhenti berarti apa-apa —
 * dan lebih buruk, pembaca mengira datanya yang baru.
 */
function FreshnessLine({ dataset }: { dataset: Dataset }) {
  /*
    Disembunyikan kalau datasetnya belum pernah diperbarui sejak diunggah.

    Keduanya disetel pada detik yang sama saat penerbitan, jadi tanpa
    penjagaan ini dataset yang baru terbit menampilkan dua tanggal yang
    menyatakan hal yang sama — dan pembaca berhenti mempercayai keduanya.
    Ambang satu menit, bukan kesamaan persis, karena keduanya ditulis lewat
    dua panggilan yang berbeda dan bisa terpaut beberapa milidetik.
  */
  const diperbarui = (() => {
    if (dataset.realtime) return null
    if (!dataset.lastUpdatedAt || !dataset.createdAt) return null
    const selisih =
      new Date(dataset.lastUpdatedAt).getTime() - new Date(dataset.createdAt).getTime()
    return Number.isNaN(selisih) || selisih < 60_000 ? null : dataset.lastUpdatedAt
  })()

  // Tidak ada satu pun yang bisa dikatakan: barisnya tidak digambar sama
  // sekali, alih-alih menyisakan baris kosong yang terlihat seperti data
  // yang gagal dimuat.
  if (!dataset.coverage && !diperbarui) {
    return null
  }

  return (
    <div className="text-ink-500 mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px]">
      {dataset.coverage ? (
        <span>
          Periode data{' '}
          <span className="text-ink-700 font-semibold">{dataset.coverage}</span>
        </span>
      ) : null}

      {dataset.coverage && diperbarui ? <span aria-hidden>·</span> : null}

      {diperbarui ? (
        /*
          Yang tampil waktu relatif, yang tersimpan waktu persisnya di `title`.

          "3 hari lalu" langsung terbaca tanpa menghitung, dan itu yang
          dibutuhkan saat memindai. Tetapi orang yang mengutip dataset ini di
          laporan butuh tanggal yang sesungguhnya, dan menahan kursor lebih
          murah daripada memaksa semua pembaca membaca stempel waktu penuh.
        */
        <span title={formatDateTime(diperbarui)}>
          Data diperbarui{' '}
          <span className="text-ink-700 font-semibold">
            {formatRelative(diperbarui)}
          </span>
        </span>
      ) : null}
    </div>
  )
}

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
      {/* Deskripsi kini bisa memuat penekanan, daftar, dan tautan. Yang
          digambar tetap melewati pembersih di dalam RichText, apa pun asal
          barisnya dan kapan pun ia ditulis. */}
      {dataset.notes ? (
        <RichText html={dataset.notes} />
      ) : (
        <p className="text-ink-600 text-[14.5px] leading-[1.65]">
          Belum ada deskripsi untuk dataset ini.
        </p>
      )}
    </div>
  )
}
