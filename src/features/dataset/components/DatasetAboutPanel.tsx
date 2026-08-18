import { useToast } from '@/shared/components/ui/toastStore'
import { cn } from '@/shared/lib/cn'
import { formatDate } from '@/shared/lib/format'
import type { Dataset } from '@/shared/types/api'

/**
 * Lisensi belum punya kolom di database — nilainya sama untuk seluruh portal,
 * persis seperti di desain. Begitu tiap dataset boleh punya lisensi sendiri,
 * konstanta ini diganti field dari API.
 */
const LISENSI = 'Open Data Licence v1.0'

/**
 * Panel samping halaman detail: metadata terbitan.
 *
 * `position: sticky` **tidak** dipasang di sini, melainkan pada pembungkusnya di
 * halaman. Alasannya konkret: elemen sticky hanya bisa bergerak di dalam kotak
 * induknya. Kalau sticky dipasang di `aside` ini sementara induknya adalah
 * pembungkus setinggi isi panel, tidak ada ruang untuk bergerak sama sekali —
 * panel tampak diam di atas dan tertinggal saat halaman digulir.
 */
export function DatasetAboutPanel({ dataset }: { dataset: Dataset }) {
  const toast = useToast()

  const kode = dataset.division?.code ?? ''

  return (
    <aside className="flex flex-col gap-4">
      <div className="border-line-200 bg-surface rounded-[14px] border px-[18px] pt-1.5 pb-3.5">
        <h3 className="text-ink-900 mt-4 mb-1 text-[15px] font-bold">Tentang dataset</h3>

        <Baris label="Divisi" nilai={dataset.division?.name ?? '—'} />
        <Baris label="Kontak" nilai={`${kode.toLowerCase()}@erdigma.com`} mono />
        <Baris label="Dibuat" nilai={formatDate(dataset.createdAt)} />
        <Baris label="Lisensi" nilai={LISENSI} />

        <button
          type="button"
          onClick={() => toast.show('Riwayat versi belum tersedia — dataset baru punya satu versi.')}
          className="border-line-200 text-ink-900 mt-3 w-full rounded-[9px] border bg-[#F4F6F9] p-2.5 text-[13.5px] font-semibold transition-colors hover:bg-[#eceff4]"
        >
          Lihat riwayat (See history)
        </button>
      </div>

    </aside>
  )
}

function Baris({ label, nilai, mono }: { label: string; nilai: string; mono?: boolean }) {
  return (
    <div className="border-b border-[#F0F2F5] py-[11px]">
      <div className="text-ink-400 mb-[3px] text-[12px]">{label}</div>
      <div
        className={cn(
          'text-ink-900 text-[13.5px] font-semibold break-words',
          mono && 'font-mono',
        )}
      >
        {nilai}
      </div>
    </div>
  )
}
