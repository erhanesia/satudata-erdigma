import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Loader2 } from 'lucide-react'
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
  const [setuju, setSetuju] = useState(false)
  const unduh = useDownloadDataset()
  const toast = useToast()

  // Persetujuan diulang setiap kali modal dibuka. Menyimpannya antar-pembukaan
  // berarti unduhan kedua terjadi tanpa pengguna menyatakan apa pun.
  useEffect(() => {
    if (open) setSetuju(false)
  }, [open])

  const berkas = dataset.resources?.[0]
  const slug = dataset.slug ?? ''
  // `fileSize` didahulukan supaya angka di modal sama persis dengan yang
  // tertulis di tombol "Unduh · …". Ukuran byte sebenarnya dipakai hanya kalau
  // metadata itu kosong — dua angka berbeda untuk berkas yang sama membuat
  // pengguna mengira ada dua berkas.
  const ukuran = dataset.fileSize || (berkas ? formatBytes(berkas.sizeBytes) : '—')
  const sedangUnduh = unduh.isPending

  function jalankan() {
    if (!setuju || sedangUnduh) return
    unduh.mutate(
      { slug, agreement: true },
      {
        onSuccess: ({ size }) => {
          onOpenChange(false)
          toast.success(`Berkas terunduh (${formatBytes(size)})`)
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

        <DialogPrimitive.Content className="animate-modal-in fixed top-1/2 left-1/2 z-[120] w-[calc(100vw-2.5rem)] max-w-[520px] overflow-hidden rounded-[18px] bg-white shadow-[0_24px_60px_-12px_rgba(16,24,40,0.4)]">
          <div className="flex items-start gap-3.5 px-6 pt-6">
            <span className="flex size-[46px] shrink-0 items-center justify-center rounded-xl bg-[#FEF0C7]">
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#B54708"
                strokeWidth={2.2}
                aria-hidden
              >
                <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              </svg>
            </span>

            <div className="flex-1">
              <DialogPrimitive.Title className="text-ink-900 mb-1 text-[19px] font-extrabold tracking-[-0.4px]">
                Persetujuan Penggunaan Data
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="text-ink-500 text-[13.5px]">
                Anda akan mengunduh <b className="text-ink-900">{dataset.title}</b> · {ukuran}
              </DialogPrimitive.Description>
            </div>

            <DialogPrimitive.Close
              aria-label="Tutup"
              className="text-ink-400 hover:text-ink-700 px-1.5 py-0.5 text-[22px] leading-none transition-colors"
            >
              ×
            </DialogPrimitive.Close>
          </div>

          <div className="px-6 pt-[18px] pb-1">
            <div className="border-line-100 flex flex-col gap-3.5 rounded-xl border bg-[#F8FAFC] px-[18px] py-4">
              <Ketentuan warna="#1B54C4" jalur={<PathGembok />}>
                Data ini bersifat{' '}
                <b>rahasia dan hanya untuk keperluan internal PT Erdigma</b>. Dilarang
                menyebarluaskan, membagikan, atau mempublikasikan ke pihak eksternal dalam bentuk
                apa pun.
              </Ketentuan>

              <Ketentuan warna="#B42318" jalur={<PathSanksi />}>
                Apabila terjadi <b>kebocoran data</b> akibat kelalaian pengguna, akan dikenakan{' '}
                <b>sanksi</b> sesuai kebijakan keamanan informasi dan peraturan perusahaan yang
                berlaku.
              </Ketentuan>
            </div>

            <label className="flex cursor-pointer items-start gap-[11px] px-1 pt-4 pb-1.5">
              <input
                type="checkbox"
                checked={setuju}
                onChange={(e) => setSetuju(e.target.checked)}
                className="mt-px size-[18px] shrink-0 accent-[#1B54C4]"
              />
              <span className="text-ink-900 text-[13.5px] leading-[1.5] font-semibold">
                Saya telah membaca dan menyetujui ketentuan di atas, serta bertanggung jawab penuh
                atas penggunaan data ini.
              </span>
            </label>
          </div>

          <div className="flex gap-2.5 px-6 pt-3 pb-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="border-line-300 text-ink-700 hover:bg-surface-100 rounded-[9px] border bg-white px-5 py-[13px] text-[14.5px] font-bold transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              onClick={jalankan}
              disabled={!setuju || sedangUnduh}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-[9px] py-[13px] text-[14.5px] font-bold transition-colors',
                setuju && !sedangUnduh
                  ? 'bg-brand hover:bg-brand-hover cursor-pointer text-white'
                  : 'cursor-not-allowed bg-[#EAECF0] text-[#98A2B3]',
              )}
            >
              {sedangUnduh ? (
                <>
                  <Loader2 className="size-[17px] animate-spin" />
                  Mengunduh…
                </>
              ) : (
                <>
                  <svg
                    width={17}
                    height={17}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.3}
                    aria-hidden
                  >
                    <path d="M12 3v12m0 0 4-4m-4 4-4-4M4 21h16" />
                  </svg>
                  Setuju &amp; Unduh
                </>
              )}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function Ketentuan({
  warna,
  jalur,
  children,
}: {
  warna: string
  jalur: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-[11px]">
      <svg
        width={19}
        height={19}
        viewBox="0 0 24 24"
        fill="none"
        stroke={warna}
        strokeWidth={2.1}
        className="mt-px shrink-0"
        aria-hidden
      >
        {jalur}
      </svg>
      <div className="text-ink-700 text-[13.5px] leading-[1.55]">{children}</div>
    </div>
  )
}

function PathGembok() {
  return (
    <>
      <rect x={4} y={10} width={16} height={11} rx={2} />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  )
}

function PathSanksi() {
  return <path d="M3 6h18M8 6V4h8v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
}
