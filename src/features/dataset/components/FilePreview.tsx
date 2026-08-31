import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, FileText } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ErrorState } from '@/shared/components/feedback/StateViews'
import { formatBytes } from '@/shared/lib/format'
import type { DatasetResource } from '@/shared/types/api'

import { fetchDocumentText, fetchPdfPreview } from '../api/datasetApi'

/**
 * Menampilkan isi berkas dokumen di dalam halaman.
 *
 * PDF digambar peramban sendiri lewat `<iframe>`; Word tidak bisa digambar
 * peramban mana pun, jadi yang ditampilkan adalah teks paragrafnya.
 *
 * **Kenapa lewat XHR, bukan `<iframe src="/api/…">` langsung.** Navigasi iframe
 * tidak membawa header autentikasi, sehingga server menjawab 401 dan yang
 * tampil hanya halaman galat kosong. Berkasnya diambil lebih dulu, lalu
 * dibungkus jadi blob URL.
 */
export function FilePreview({
  slug,
  files,
}: {
  slug: string
  files: DatasetResource
}) {
  const kind = (files.formatName ?? '').toUpperCase()
  if (kind === 'PDF') {
    return <PdfPreview slug={slug} files={files} />
  }
  if (kind === 'DOCX') {
    return <WordPreview slug={slug} files={files} />
  }
  return <UnsupportedFile files={files} />
}

function PdfPreview({ slug, files }: { slug: string; files: DatasetResource }) {
  const id = files.id ?? ''
  const [url, setUrl] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['preview', 'pdf', slug, id],
    queryFn: () => fetchPdfPreview(slug, id),
    enabled: id.length > 0,
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

function WordPreview({ slug, files }: { slug: string; files: DatasetResource }) {
  const id = files.id ?? ''
  const query = useQuery({
    queryKey: ['preview', 'docx', slug, id],
    queryFn: ({ signal }) => fetchDocumentText(slug, id, signal),
    enabled: id.length > 0,
  })

  if (query.isPending) return <LoadingBlock height="h-[420px]" />
  if (query.isError) return <ErrorState error={query.error} />

  const paragraphs = query.data.paragraphs ?? []

  return (
    <div className="border-line-200 bg-surface animate-tab-in overflow-hidden rounded-[14px] border">
      <HeadCell files={files} />

      {/*
        Batasnya disebutkan di layar, bukan disimpan di dokumentasi. Pembaca
        yang mengira sudah melihat dokumen lengkap padahal tabel dan gambarnya
        hilang akan mengambil keputusan dari setengah isi.
      */}
      <p className="flex items-start gap-2 border-b border-[#FDE9CE] bg-[#FFF9F0] px-[22px] py-2.5 text-[12.5px] leading-relaxed text-[#B45309]">
        <AlertTriangle className="mt-px size-4 shrink-0" />
        <span>
          Yang ditampilkan hanya <strong className="font-semibold">teks paragrafnya</strong>. Tata
          letak, tabel, dan gambar tidak ikut — unduh berkasnya untuk melihat dokumen utuh.
        </span>
      </p>

      {paragraphs.length === 0 ? (
        <p className="text-ink-500 px-[22px] py-12 text-center text-[14px]">
          Dokumen ini tidak memuat teks yang bisa dibaca.
        </p>
      ) : (
        <div className="max-h-[720px] overflow-y-auto px-[22px] py-5">
          <div className="mx-auto flex max-w-[68ch] flex-col gap-3.5">
            {paragraphs.map((text, i) => (
              <p key={i} className="text-ink-700 text-[14.5px] leading-[1.75]">
                {text}
              </p>
            ))}
          </div>
        </div>
      )}

      {query.data.truncated ? (
        <p className="text-ink-500 border-line-200 border-t px-[22px] py-3 text-[12.5px]">
          Dokumen ini lebih panjang daripada yang ditampilkan. Unduh berkasnya untuk isi lengkap.
        </p>
      ) : null}
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
