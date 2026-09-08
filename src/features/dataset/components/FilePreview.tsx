import { useQuery } from '@tanstack/react-query'
import { Download, FileText } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { ErrorState } from '@/shared/components/feedback/StateViews'
import { useIsMobile } from '@/shared/hooks/useMediaQuery'
import { formatBytes } from '@/shared/lib/format'
import type { DatasetResource } from '@/shared/types/api'

import { fetchPreviewFile } from '../api/datasetApi'

/**
 * Menampilkan isi berkas dokumen di dalam halaman.
 *
 * PDF digambar peramban sendiri lewat `<iframe>`. Word diurai di sisi klien
 * menjadi HTML, sehingga tabel, gambar, dan tata letaknya ikut tampil.
 *
 * **Kenapa lewat XHR, bukan `<iframe src="/api/…">` langsung.** Navigasi iframe
 * tidak membawa header autentikasi, sehingga server menjawab 401 dan yang
 * tampil hanya halaman galat kosong. Berkasnya diambil lebih dulu, lalu
 * dibungkus jadi blob URL atau diurai di tempat.
 */
export function FilePreview({
  slug,
  files,
  onRequestDownload,
}: {
  slug: string
  files: DatasetResource
  /**
   * Dipanggil saat pratinjau tidak bisa digambar dan pengguna memilih mengunduh.
   *
   * Sengaja berupa callback, bukan mengunduh sendiri di sini: unduhan harus
   * lewat modal persetujuan, karena server MENOLAK permintaan tanpa
   * `agreement=true` dan persetujuannya ikut tercatat di log unduhan.
   */
  onRequestDownload?: () => void
}) {
  const kind = (files.formatName ?? '').toUpperCase()
  if (kind === 'PDF') {
    return <PdfPreview slug={slug} files={files} onRequestDownload={onRequestDownload} />
  }
  if (kind === 'DOCX') {
    return <WordPreview slug={slug} files={files} onRequestDownload={onRequestDownload} />
  }
  return <UnsupportedFile files={files} />
}

/**
 * Batas ukuran berkas yang masih digambar di halaman.
 *
 * Menguraikan dokumen berarti membongkar seluruh isinya ke memori tab, dan
 * gambarnya ikut dijadikan data URL yang membengkak sekitar sepertiga. Di atas
 * batas ini yang ditawarkan unduhan, bukan tab yang membeku lalu mati tanpa
 * penjelasan.
 */
const MAX_RENDER_BYTES = 25 * 1024 * 1024

function PdfPreview({
  slug,
  files,
  onRequestDownload,
}: {
  slug: string
  files: DatasetResource
  onRequestDownload?: () => void
}) {
  const id = files.id ?? ''
  const [url, setUrl] = useState<string | null>(null)

  /*
    Di ponsel, PDF tidak digambar melainkan ditawarkan untuk diunduh.

    Penampil PDF bawaan `<iframe>` tidak bisa diandalkan di peramban ponsel.
    Safari iOS khususnya sering menggambar halaman pertama saja, tidak bisa
    digulung, atau justru membuka penampil terpisah yang menutup seluruh
    aplikasi. Hasilnya bukan pratinjau yang jelek, melainkan pratinjau yang
    tidak bisa dipakai.

    Kuncinya `enabled` di bawah, bukan sekadar menyembunyikan iframe-nya dengan
    CSS. Berkasnya diambil lebih dulu lewat XHR, jadi menyembunyikannya berarti
    ponsel tetap mengunduh PDF puluhan megabita lalu membuangnya — boros kuota
    untuk sesuatu yang tidak pernah tampil.
  */
  const isMobile = useIsMobile()

  const query = useQuery({
    queryKey: ['preview', 'pdf', slug, id],
    queryFn: () => fetchPreviewFile(slug, id),
    enabled: id.length > 0 && !isMobile,
    // Blob berukuran megabita; menahannya di cache react-query untuk berkas
    // yang mungkin tidak dibuka lagi hanya memakan memori tab.
    gcTime: 0,
  })

  /*
   * Blob URL WAJIB dicabut. Setiap `createObjectURL` menahan seluruh isi berkas
   * di memori sampai `revokeObjectURL` dipanggil atau tab ditutup — berpindah
   * antar-berkas beberapa kali tanpa mencabutnya cukup untuk membuat tab
   * kehabisan memori pada PDF puluhan megabita.
   */
  useEffect(() => {
    if (!query.data) return
    const objectUrl = URL.createObjectURL(query.data)
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [query.data])

  if (isMobile) {
    return <DownloadInstead files={files} onRequestDownload={onRequestDownload} />
  }

  if (query.isPending) return <LoadingBlock height="h-[720px]" />
  if (query.isError) return <ErrorState error={query.error} />

  return (
    <div className="border-line-200 bg-surface animate-tab-in overflow-hidden rounded-[14px] border">
      <HeadCell files={files} />
      {url ? (
        <iframe
          src={url}
          title={files.label || files.fileName || 'Pratinjau PDF'}
          className="h-[65dvh] min-h-[380px] w-full border-0 bg-[#F1F3F7] sm:h-[720px]"
        />
      ) : null}
    </div>
  )
}

/**
 * Pilihan yang diberikan ke pengurai Word.
 *
 * <h2>`renderAltChunks: false` — ini penjagaan, bukan selera</h2>
 *
 * Berkas `.docx` boleh menyisipkan potongan **HTML mentah** lewat `altChunk`.
 * Menggambarnya berarti HTML dari berkas unggahan masuk apa adanya ke halaman,
 * dan itu jalur paling langsung menuju XSS pada fitur ini. Ia dimatikan di sini
 * sebagai lapisan pertama; lapisan yang benar-benar menahan tetap sandbox pada
 * iframe-nya.
 *
 * <h2>`useBase64URL: true`</h2>
 *
 * Gambar di dalam dokumen dijadikan data URL, bukan blob URL. Blob URL milik
 * dokumen induk, dan menyandarkan tampilan pada kepemilikan itu berarti
 * pratinjaunya rusak begitu sandbox-nya diperketat suatu saat nanti. Data URL
 * berdiri sendiri, dan tidak menyisakan URL yang harus dicabut.
 *
 * <h2>Yang sengaja dibiarkan menyala</h2>
 *
 * Header, footer, dan catatan kaki ikut digambar. Pada dokumen resmi justru di
 * situlah nomor surat dan tanggal berlaku berada — melewatkannya membuat
 * pratinjau terlihat lengkap padahal kehilangan bagian yang menentukan.
 *
 */
const WORD_OPTIONS = {
  className: 'docx',
  inWrapper: true,
  breakPages: true,
  renderHeaders: true,
  renderFooters: true,
  renderFootnotes: true,
  renderEndnotes: true,
  useBase64URL: true,
  renderAltChunks: false,
  renderComments: false,
  experimental: false,
} as const

/** Latar halaman di dalam iframe, supaya dokumennya duduk seperti di aplikasi Word. */
const WORD_FRAME_CSS = `
  html, body { margin: 0; padding: 0; background: #F1F3F7; }
  body { overflow: auto; -webkit-text-size-adjust: 100%; }
  .docx-wrapper { padding: 24px 16px; }
  .docx-wrapper > section.docx {
    box-shadow: 0 1px 3px rgba(16,24,40,.12);
    margin-bottom: 20px;
  }
`

/**
 * Menggambar dokumen Word utuh di dalam halaman.
 *
 * <h2>Kenapa di dalam iframe ber-sandbox</h2>
 *
 * Yang digambar di sini berasal dari <b>berkas yang diunggah orang</b>, dan ia
 * berubah menjadi elemen HTML sungguhan. Itu persis bentuk masalah yang membuat
 * XSS ada. Iframe-nya karena itu diberi `sandbox` TANPA `allow-scripts`:
 * apa pun yang berhasil menyelinap menjadi skrip tidak akan pernah dijalankan,
 * dan gaya CSS dari dokumen tidak bisa merembes ke halaman di sekitarnya.
 *
 * `allow-same-origin` diberikan karena isinya ditulis dari sini, dan tanpa itu
 * dokumen di dalam iframe tidak bisa disentuh induknya. Kombinasi berbahaya
 * yang harus dihindari adalah `allow-scripts` BERSAMA `allow-same-origin` —
 * konten seperti itu bisa melepas sandbox-nya sendiri. Di sini yang kedua saja
 * yang diberikan, jadi tidak ada yang bisa dilepas.
 *
 * Pengurainya sendiri tidak saya anggap tepercaya. Ia memang tidak menyalin
 * HTML dari berkasnya kecuali lewat `altChunk` yang sudah dimatikan, tetapi
 * yang menahan tetap sandbox-nya — bukan keyakinan pada isi pustaka pihak
 * ketiga.
 */
function WordPreview({
  slug,
  files,
  onRequestDownload,
}: {
  slug: string
  files: DatasetResource
  onRequestDownload?: () => void
}) {
  const id = files.id ?? ''

  /*
    Di ponsel, dokumen Word ditawarkan untuk diunduh, bukan digambar.

    Ini KEPUTUSAN, bukan batasan teknis, dan bedanya perlu ditulis supaya tidak
    ada yang membuang waktu mengiranya kerusakan. Word bisa digambar di ponsel:
    yang tampil HTML biasa, dan satu-satunya persoalan cuma lebarnya, yang
    sudah terbukti bisa diatasi dengan membiarkan isinya mengalir selebar layar.

    Yang dipilih adalah menyamakan perilakunya dengan PDF: di ponsel, dokumen
    dibuka lewat aplikasi di perangkat masing-masing. Dua jenis berkas dokumen
    yang berperilaku berbeda di layar yang sama lebih membingungkan daripada
    keduanya sama-sama menawarkan unduhan.

    Perhatikan `enabled` di bawah: berkasnya tidak diambil sama sekali. Sekadar
    menyembunyikan tampilannya berarti ponsel tetap mengunduh berkasnya lalu
    membuangnya, boros kuota untuk sesuatu yang tidak pernah tampil.
  */
  const isMobile = useIsMobile()
  const tooLarge = (files.sizeBytes ?? 0) > MAX_RENDER_BYTES
  const skip = isMobile || tooLarge

  const query = useQuery({
    queryKey: ['preview', 'docx', slug, id],
    queryFn: () => fetchPreviewFile(slug, id),
    enabled: id.length > 0 && !skip,
    gcTime: 0,
  })

  const frame = useRef<HTMLIFrameElement>(null)
  const [drawing, setDrawing] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const blob = query.data
    const element = frame.current
    if (!blob || !element) return

    const doc = element.contentDocument
    if (!doc) return

    // `cancelled` menjaga dari hasil yang datang terlambat: berpindah tab berkas
    // saat penguraian masih jalan akan menggambar dokumen LAMA ke dalam iframe
    // yang sudah berganti isi.
    let cancelled = false
    setDrawing(true)
    setFailed(false)

    doc.open()
    doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>')
    doc.close()

    const style = doc.createElement('style')
    style.textContent = WORD_FRAME_CSS
    doc.head.appendChild(style)

    /*
      Pengurainya dimuat di sini, bukan lewat import biasa di atas berkas.

      Ia berukuran sekitar 170 kB dan hanya berguna untuk berkas Word, sementara
      halaman detail dataset dibuka semua orang -- termasuk yang datasetnya cuma
      CSV dan tidak akan pernah menyentuhnya. Import biasa membuat seluruh
      pengunjung membayar muatan itu di setiap kunjungan.
    */
    void import('docx-preview')
      .then(({ renderAsync }) => {
        // Ditinggalkan kalau berkasnya sudah berganti selagi pustakanya dimuat.
        if (cancelled) return null
        return renderAsync(blob, doc.body, doc.head, WORD_OPTIONS)
      })
      .then(() => {
        if (!cancelled) setDrawing(false)
      })
      .catch(() => {
        if (!cancelled) {
          setDrawing(false)
          setFailed(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [query.data])

  if (skip) {
    return (
      <DownloadInstead
        files={files}
        onRequestDownload={onRequestDownload}
        reason={
          tooLarge
            ? `Berkas ini lebih besar dari ${formatBytes(MAX_RENDER_BYTES)}, terlalu berat untuk digambar di halaman.`
            : 'Di layar ponsel, dokumen Word dibuka lewat aplikasi di perangkat Anda.'
        }
      />
    )
  }

  if (query.isPending) return <LoadingBlock height="h-[720px]" />
  if (query.isError) return <ErrorState error={query.error} />

  return (
    <div className="border-line-200 bg-surface animate-tab-in overflow-hidden rounded-[14px] border">
      <HeadCell files={files} />

      {failed ? (
        <div className="px-[22px] py-10 text-center">
          <p className="text-ink-600 text-[14px] leading-relaxed">
            Dokumen ini tidak bisa digambar di halaman. Berkasnya mungkin memakai
            fitur Word yang belum didukung, atau isinya rusak.
          </p>
          {onRequestDownload ? (
            <button
              type="button"
              onClick={onRequestDownload}
              className="bg-ink-900 mt-4 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-bold text-white transition-colors hover:opacity-90"
            >
              <Download className="size-[18px]" />
              Unduh berkasnya
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={failed ? 'hidden' : 'relative'}>
        {drawing ? (
          <div className="absolute inset-0 z-10 animate-pulse bg-[#F1F3F7]">
            <span className="sr-only">Menggambar dokumen…</span>
          </div>
        ) : null}

        {/*
          `key` pada id berkas: berpindah antar tab berkas harus memasang iframe
          BARU, bukan menulis ulang isi iframe lama. Menulis ulang menyisakan
          gaya dan elemen dokumen sebelumnya kalau penguraiannya gagal di
          tengah jalan.
        */}
        <iframe
          key={id}
          ref={frame}
          // Tanpa `allow-scripts`. Lihat catatan di atas komponen ini.
          sandbox="allow-same-origin"
          title={files.label || files.fileName || 'Pratinjau dokumen Word'}
          className="h-[65dvh] min-h-[380px] w-full border-0 bg-[#F1F3F7] sm:h-[720px]"
        />
      </div>
    </div>
  )
}

/**
 * Pengganti pratinjau: keterangan singkat plus tombol unduh.
 *
 * Dipakai untuk dua keadaan yang berbeda, dan `reason` yang membedakan
 * kalimatnya: PDF di layar ponsel, dan berkas apa pun yang terlalu besar untuk
 * digambar. Keduanya bukan kegagalan, melainkan pilihan yang diambil sadar.
 *
 * Kalimatnya menyebut alasannya, bukan sekadar "tidak tersedia". Pengguna yang
 * tidak diberi tahu kenapa akan mengira aplikasinya rusak atau berkasnya
 * bermasalah, lalu mencoba berkali-kali.
 *
 * Tombolnya membuka modal persetujuan yang sama dengan tombol Unduh di atas,
 * bukan mengunduh langsung. Server menolak permintaan tanpa `agreement=true`,
 * dan persetujuannya ikut tercatat di log unduhan — memotong jalur itu berarti
 * unduhan yang gagal, atau lebih buruk, catatan audit yang menyatakan sesuatu
 * yang tidak terjadi.
 */
function DownloadInstead({
  files,
  onRequestDownload,
  reason,
}: {
  files: DatasetResource
  onRequestDownload?: () => void
  /** Alasan selain layar sempit, mis. berkasnya terlalu besar. */
  reason?: string
}) {
  const kind = (files.formatName ?? 'berkas').toUpperCase()

  return (
    <div className="border-line-200 bg-surface animate-tab-in rounded-[14px] border p-[22px]">
      <HeadCell files={files} tight />

      <p className="text-ink-500 mt-3.5 text-[13px] leading-relaxed">
        {reason ??
          `Pratinjau ${kind} tidak bisa ditampilkan di layar ponsel.`}{' '}
        Unduh berkasnya untuk membukanya dengan aplikasi di perangkat Anda.
      </p>

      {onRequestDownload ? (
        <button
          type="button"
          onClick={onRequestDownload}
          className="bg-ink-900 mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-[15px] font-bold text-white transition-colors active:opacity-90"
        >
          <Download className="size-[18px]" />
          Unduh {kind} · {formatBytes(files.sizeBytes)}
        </button>
      ) : (
        /* Tanpa callback, tombolnya tidak digambar sama sekali. Tombol yang
           tidak melakukan apa-apa lebih buruk daripada tidak ada tombol. */
        <p className="text-ink-500 mt-3.5 text-[13px] leading-relaxed">
          Pakai tombol <strong className="font-semibold">Unduh</strong> di atas untuk
          mengambilnya.
        </p>
      )}
    </div>
  )
}

function UnsupportedFile({ files }: { files: DatasetResource }) {
  return (
    <div className="border-line-200 bg-surface animate-tab-in rounded-[14px] border p-[22px]">
      <HeadCell files={files} tight />
      <p className="text-ink-500 mt-3.5 text-[13px] leading-relaxed">
        Jenis berkas ini belum bisa ditampilkan di halaman. Pakai tombol{' '}
        <strong className="font-semibold">Unduh</strong> di atas untuk mengambilnya.
      </p>
    </div>
  )
}

function HeadCell({ files, tight }: { files: DatasetResource; tight?: boolean }) {
  return (
    <div
      className={[
        'flex flex-wrap items-center justify-between gap-3',
        tight ? '' : 'border-line-200 border-b px-[22px] py-3.5',
      ].join(' ')}
    >
      <div className="min-w-0">
        <div className="text-ink-900 truncate text-[15px] font-bold">
          {files.label || files.fileName || 'Berkas'}
        </div>
        <div className="text-ink-500 truncate font-mono text-[12.5px]">{files.fileName}</div>
      </div>
      <div className="text-ink-600 shrink-0 text-[13px]">
        {(files.formatName ?? '').toUpperCase()} · {formatBytes(files.sizeBytes)}
      </div>
    </div>
  )
}

function LoadingBlock({ height }: { height: string }) {
  return (
    <div
      className={['border-line-200 animate-pulse rounded-[14px] border bg-[#F1F3F7]', height].join(
        ' ',
      )}
    >
      <span className="sr-only">Memuat pratinjau…</span>
      <FileText className="sr-only" />
    </div>
  )
}
