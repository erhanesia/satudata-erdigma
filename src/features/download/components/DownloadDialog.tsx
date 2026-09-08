import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Download, Loader2, Lock, Scale, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ApiError } from '@/shared/api/errors'
import { useToast } from '@/shared/components/ui/toastStore'
import { cn } from '@/shared/lib/cn'
import { formatBytes } from '@/shared/lib/format'
import type { Dataset } from '@/shared/types/api'

import { useDownloadDataset } from '../hooks/useDownloadDataset'

interface DownloadDialogProps {
  dataset: Dataset
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Modal persetujuan sebelum mengunduh.
 *
 * Bukan formalitas antarmuka: server menolak permintaan tanpa `agreement=true`
 * dan menyimpan nilainya di audit log bersama identitas pengunduh. Karena itu
 * centangnya harus benar-benar diklik pengguna — tidak boleh dicentang otomatis
 * demi memangkas satu langkah.
 *
 * Ditulis langsung di atas primitif Radix, bukan memakai `Dialog` bersama,
 * karena kepala modalnya berbeda bentuk: ikon peringatan 46px, judul 19px, dan
 * subjudul berisi nama berkas. Yang tetap didapat dari Radix adalah hal yang
 * paling mudah salah kalau ditulis sendiri — kunci fokus, tutup dengan Esc, dan
 * menyembunyikan latar dari pembaca layar.
 */
export function DownloadDialog({ dataset, open, onOpenChange }: DownloadDialogProps) {
  const [agreed, setAgreed] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const download = useDownloadDataset()
  const toast = useToast()

  const allFiles = dataset.resources ?? []
  const slug = dataset.slug ?? ''

  // Persetujuan diulang setiap kali modal dibuka. Menyimpannya antar-pembukaan
  // berarti unduhan kedua terjadi tanpa pengguna menyatakan apa pun.
  //
  // Pilihan berkas justru sebaliknya: seluruhnya dicentang di awal, karena
  // menekan "Unduh" tanpa memilih apa pun paling sering berarti "ambil
  // semuanya". Mengosongkannya memaksa satu langkah tambahan untuk perkara yang
  // sudah jelas.
  useEffect(() => {
    if (!open) return
    setAgreed(false)
    setSelected(allFiles.map((r) => r.id ?? '').filter(Boolean))
    // Sengaja hanya bergantung pada `open`: memasukkan daftar berkasnya akan
    // membatalkan pilihan pengguna setiap kali data dataset di-refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const chosen = allFiles.filter((r) => selected.includes(r.id ?? ''))
  // Ukuran yang ditulis di kepala modal mengikuti YANG DIPILIH, bukan total
  // seluruh berkas. Angka yang tidak berubah saat centangnya dilepas akan
  // terbaca sebagai janji yang keliru tentang apa yang akan terunduh.
  const size =
    chosen.length > 0
      ? formatBytes(chosen.reduce((t, r) => t + (r.sizeBytes ?? 0), 0))
      : '—'
  const downloading = download.isPending

  function run() {
    if (!agreed || downloading) return
    download.mutate(
      {
        slug,
        agreement: true,
        files: chosen.map((r) => ({ resourceId: r.id, fileName: r.fileName })),
      },
      {
        onSuccess: ({ totalByte, requested, failed }) => {
          onOpenChange(false)
          if (failed.length === 0) {
            toast.success(
              `${requested} file terunduh (${formatBytes(totalByte)})`,
            )
          } else {
            // Jumlahnya disebut apa adanya. Sebagian berkas sudah benar-benar
            // tersimpan; melaporkannya sebagai kegagalan total akan membuat
            // orang mengunduh ulang semuanya.
            toast.error(
              `${requested - failed.length} dari ${requested} file terunduh. Gagal: ${failed.join(', ')}.`,
            )
          }
        },
        onError: (error) => {
          toast.error(error instanceof ApiError ? error.message : 'Unduhan gagal.')
        },
      },
    )
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="animate-overlay-in fixed inset-0 z-[120] bg-[#101828]/55" />

        <DialogPrimitive.Content className="animate-modal-in fixed top-1/2 left-1/2 z-[120] max-h-[calc(100dvh-2rem)] w-[calc(100vw-2.5rem)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[18px] bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.4)]">
          <div className="flex items-start gap-3.5 px-4 pt-5 sm:px-6 sm:pt-6">
            <span className="flex size-[46px] shrink-0 items-center justify-center rounded-xl bg-[#FEF0C7]">
              <TriangleAlert className="size-6 text-[#B54708]" strokeWidth={2.2} aria-hidden />
            </span>

            <div className="flex-1">
              <DialogPrimitive.Title className="text-ink-900 mb-1 text-[19px] font-extrabold tracking-[-0.4px]">
                Persetujuan Penggunaan Data
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-ink-500 text-[13.5px]">
                Anda akan mengunduh <b className="text-ink-900">{dataset.title}</b> · {size}
              </DialogPrimitive.Description>
            </div>

            <DialogPrimitive.Close
              aria-label="Tutup"
              className="text-ink-400 hover:text-ink-700 px-1.5 py-0.5 text-[22px] leading-none transition-colors"
            >
              ×
            </DialogPrimitive.Close>
          </div>

          <div className="px-4 pt-[18px] pb-1 sm:px-6">
            <div className="border-line-100 flex flex-col gap-3.5 rounded-xl border bg-[#F8FAFC] px-[18px] py-4">
              <TermRow color="#1B54C4" icon={<Lock className="size-[19px] shrink-0" strokeWidth={2.1} />}>
                Data ini bersifat{' '}
                <b>rahasia dan hanya untuk keperluan internal PT Erdigma</b>. Dilarang
                menyebarluaskan, membagikan, atau mempublikasikan ke pihak eksternal dalam bentuk
                apa pun.
              </TermRow>

              <TermRow color="#B42318" icon={<Scale className="size-[19px] shrink-0" strokeWidth={2.1} />}>
                Apabila terjadi <b>kebocoran data</b> akibat kelalaian pengguna, akan dikenakan{' '}
                <b>sanksi</b> sesuai kebijakan keamanan informasi dan peraturan perusahaan yang
                berlaku.
              </TermRow>
            </div>

            {allFiles.length > 0 ? (
              <div className="pt-[18px]">
                <div className="mb-2.5 flex items-center justify-between gap-3">
                  <span className="text-ink-900 text-[14px] font-bold">
                    Pilih file yang diunduh
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelected(
                        selected.length === allFiles.length
                          ? []
                          : allFiles.map((r) => r.id ?? '').filter(Boolean),
                      )
                    }
                    className="text-brand text-[13px] font-bold hover:underline"
                  >
                    {selected.length === allFiles.length ? 'Bersihkan pilihan' : 'Pilih semua'}
                  </button>
                </div>

                <div className="border-line-100 flex max-h-[240px] flex-col overflow-y-auto rounded-xl border">
                  {allFiles.map((r) => {
                    const id = r.id ?? ''
                    const on = selected.includes(id)
                    return (
                      <label
                        key={id}
                        className="border-line-100 hover:bg-surface-100 flex cursor-pointer items-center gap-3 border-b px-3.5 py-3 transition-colors last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setSelected((previous) =>
                              previous.includes(id) ? previous.filter((x) => x !== id) : [...previous, id],
                            )
                          }
                          className="size-[18px] shrink-0 accent-[#1B54C4]"
                        />
                        <FileBadge ext={r.formatName ?? ''} />
                        <span className="min-w-0 flex-1">
                          <span className="text-ink-900 block truncate text-[14px] font-bold">
                            {r.label || r.fileName || 'Berkas'}
                          </span>
                          {/*
                            Baris kedua memakai NAMA BERKAS sesungguhnya, bukan
                            keterangan umum per jenis seperti pada mockup.
                            Kalimat "Seluruh baris tanpa format" terdengar
                            meyakinkan tapi belum tentu benar untuk berkas yang
                            diunggah orang lain; nama berkasnya selalu benar,
                            dan itulah yang akan mendarat di komputer mereka.
                          */}
                          <span className="text-ink-500 block truncate font-mono text-[12px]">
                            {r.fileName}
                          </span>
                        </span>
                        <span className="text-ink-600 shrink-0 text-[13px]">
                          {formatBytes(r.sizeBytes)}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : null}

            <label className="flex cursor-pointer items-start gap-[11px] px-1 pt-4 pb-1.5">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-px size-[18px] shrink-0 accent-[#1B54C4]"
              />
              <span className="text-ink-900 text-[13.5px] leading-[1.5] font-semibold">
                Saya telah membaca dan menyetujui ketentuan di atas, serta bertanggung jawab penuh
                atas penggunaan data ini.
              </span>
            </label>
          </div>

          <div className="flex flex-col gap-2.5 px-4 pt-3 pb-5 sm:flex-row sm:px-6 sm:pb-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="border-line-300 text-ink-700 hover:bg-surface-100 rounded-[9px] border bg-white px-5 py-[13px] text-[14.5px] font-bold transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={run}
              disabled={!agreed || downloading || chosen.length === 0}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-[9px] py-[13px] text-[14.5px] font-bold transition-colors',
                agreed && !downloading && chosen.length > 0
                  ? 'bg-brand hover:bg-brand-hover cursor-pointer text-white'
                  : 'cursor-not-allowed bg-[#EAECF0] text-[#98A2B3]',
              )}
            >
              {downloading ? (
                <>
                  <Loader2 className="size-[17px] animate-spin" />
                  Mengunduh…
                </>
              ) : (
                <>
                  <Download className="size-[17px]" strokeWidth={2.3} aria-hidden />
                  Setuju &amp; Unduh
                  {chosen.length > 0 ? ` ${chosen.length} file` : ''}
                </>
              )}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/**
 * Satu butir ketentuan: ikon di kiri, kalimatnya di kanan.
 *
 * Menerima IKON UTUH, bukan potongan jalur SVG seperti dulu. Bentuk lama
 * memaksa komponen ini menggambar sendiri elemen <svg> pembungkusnya, sehingga
 * setiap butir baru menuntut jalur mentah yang ditulis tangan. Sekarang
 * pemanggilnya cukup menyodorkan ikon dari pustaka.
 */
function TermRow({
  color,
  icon,
  children,
}: {
  color: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-[11px]">
      {/* Warnanya diwariskan lewat `color` pada pembungkus, bukan ditanam di
          tiap ikon — ikon lucide memakai `currentColor` secara bawaan. */}
      <span className="mt-px flex shrink-0" style={{ color }} aria-hidden>
        {icon}
      </span>
      <div className="text-ink-700 text-[13.5px] leading-[1.55]">{children}</div>
    </div>
  )
}

/** Warna lencana disamakan dengan panel admin, supaya satu berkas terlihat sama di mana pun. */
const FILE_COLORS: Record<string, [string, string]> = {
  CSV: ['#1B54C4', '#EDF2FF'],
  XLSX: ['#137A46', '#E7F8EF'],
  PDF: ['#B4231B', '#FEF3F2'],
  DOCX: ['#1D4ED8', '#EFF4FF'],
}

function FileBadge({ ext }: { ext: string }) {
  const [color, latar] = FILE_COLORS[ext] ?? ['#4B5563', '#F1F3F7']
  return (
    <span
      className="shrink-0 rounded-md px-2 py-1 text-[11px] font-extrabold tracking-[0.4px]"
      style={{ color: color, background: latar }}
    >
      {ext || '—'}
    </span>
  )
}
