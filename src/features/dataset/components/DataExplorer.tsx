import { FileText } from 'lucide-react'
import { useState } from 'react'

import { EmptyState } from '@/shared/components/feedback/StateViews'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { SkeletonTable } from '@/shared/components/ui/Skeleton'
import { cn } from '@/shared/lib/cn'
import { formatNumber } from '@/shared/lib/format'
import type { DatasetResource, DatastoreRow } from '@/shared/types/api'

import { useDatastore } from '../hooks/useDatasets'
import { FilePreview } from './FilePreview'

const PAGE_SIZE = 10

interface ColumnMeta {
  machineName: string
  displayName: string
  dataType: string
}

/**
 * Penjelajah isi dataset.
 *
 * Paginasi dilakukan di server, bukan di browser. Dataset contoh saja sudah
 * 10.000 baris; menariknya sekaligus lalu memotong di sisi klien berarti
 * mengirim berkas belasan megabita untuk menampilkan sepuluh baris.
 *
 * Dua tampilan sesuai desain: tabel biasa, dan tiruan lembar kerja Excel yang
 * memakai huruf kolom serta nomor baris. Yang kedua bukan gimmick — banyak
 * pengguna portal data membaca dan memverifikasi angka dalam bentuk itu.
 */
export function DataExplorer({
  slug,
  files = [],
}: {
  slug: string
  /**
   * SELURUH berkas milik dataset, bukan hanya yang bukan tabel.
   *
   * Sakelarnya menampilkan satu tombol per berkas — tidak lebih, tidak kurang.
   * Sebelumnya ada dua tombol tetap, "Tabel" dan "Excel", yang sebenarnya dua
   * cara MENGGAMBAR data yang sama. Untuk dataset berisi CSV, tombol kedua itu
   * berbunyi "Excel" dan terbaca sebagai klaim tentang jenis berkasnya —
   * padahal berkasnya CSV. Label yang salah tentang jenis berkas di katalog
   * data lebih berbahaya daripada kehilangan satu gaya tampilan.
   */
  files?: DatasetResource[]
}) {
  const [page, setPage] = useState(1)

  // Berkas utama didahulukan sebagai pilihan awal — itu yang paling sering
  // ingin dilihat orang.
  const mainIndex = files.findIndex((r) => r.tableSource)
  const [activeId, setActiveId] = useState<string>(
    () => files[mainIndex >= 0 ? mainIndex : 0]?.id ?? '',
  )

  const active = files.find((r) => r.id === activeId) ?? files[0]

  /*
   * Punya tabel atau tidak ditentukan oleh JUMLAH BARISNYA, bukan oleh
   * penanda berkas utama.
   *
   * Dulu yang dipakai `tableSource`, dan itu keliru sejak satu dataset boleh
   * memuat lebih dari satu berkas bertabel: berkas kedua — CSV yang sah dan
   * sudah terbaca isinya — tetap dianggap tidak bisa ditampilkan, padahal
   * berkas yang sama tampil normal kalau diunggah sendirian.
   */
  const showTable = (active?.rowCount ?? 0) > 0

  /*
   * Halaman kembali ke satu setiap kali berkasnya berganti. Tanpa ini,
   * berpindah dari Excel 61.876 baris di halaman 300 ke CSV lima baris
   * meminta halaman yang tidak ada, dan yang tampil adalah tabel kosong —
   * terlihat seperti berkasnya gagal dibaca.
   */
  const selectFile = (id: string) => {
    setActiveId(id)
    setPage(1)
  }

  const query = useDatastore(slug, active?.id, page - 1, PAGE_SIZE, showTable)

  if (files.length === 0) {
    return (
      <EmptyState
        title="Belum ada berkas untuk dataset ini"
        description="Metadata dataset sudah tersedia, tetapi belum ada satu pun berkas yang diunggah."
      />
    )
  }

  const header = (
    <div className="flex flex-wrap items-center gap-3">
      <h3 className="text-ink-900 text-base font-bold">Data Explorer</h3>
      <ViewSwitch value={active?.id ?? ''} onChange={selectFile} files={files} />
    </div>
  )

  // Berkas dokumen menggantikan seluruh isi kartu, termasuk penghitung baris
  // dan paginasi — keduanya tidak berarti apa-apa untuk sebuah PDF.
  if (!showTable) {
    return (
      <div className="border-line-200 bg-surface rounded-[14px] border p-5">
        <div className="mb-3.5">{header}</div>
        <div key={active?.id} className="animate-tab-in">
          {active ? <FilePreview slug={slug} files={active} /> : null}
        </div>
      </div>
    )
  }

  return (
    <div className="border-line-200 bg-surface rounded-[14px] border p-5">
      <QueryBoundary query={query} loading={<SkeletonTable rows={PAGE_SIZE} />}>
        {(datastore) => {
          const columns: ColumnMeta[] = (datastore.columns ?? []).map((k) => ({
            machineName: k.machineName ?? '',
            displayName: k.displayName ?? k.machineName ?? '',
            dataType: k.dataType ?? '',
          }))
          const rows = (datastore.rows ?? []) as DatastoreRow[]
          const totalPages = datastore.totalPages ?? 1

          return (
            <>
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
                {header}
                <div className="text-ink-500 text-[13px]">
                  {formatNumber(active?.rowCount ?? 0)} baris · {columns.length} kolom
                </div>
              </div>

              {/*
                Kunci animasi memuat BERKAS dan halaman sekaligus, dan keduanya
                diambil dari JAWABAN SERVER, bukan dari tab yang sedang aktif.

                Dulu kuncinya halaman saja, dan itu membuat perpindahan
                antar-berkas bertabel tidak beranimasi sama sekali: berpindah
                berkas mengembalikan halaman ke 1, jadi kalau sebelumnya memang
                di halaman 1, kuncinya tidak berubah. React memakai ulang
                elemen yang sama, tidak ada yang dipasang ulang, dan animasi
                masuknya tidak pernah diputar.

                Mengikuti tab pun belum cukup. Selama berkas baru masih
                diambil, react-query menahan isi yang lama supaya tabelnya
                tidak berkedip kosong — kunci yang mengikuti tab akan memutar
                animasi untuk isi LAMA, lalu menukar isinya diam-diam begitu
                data baru tiba. Persis terbalik. Yang dipakai jawaban server,
                supaya animasinya jatuh tepat ketika isinya memang berubah.
              */}
              {rows.length === 0 ? (
                <EmptyState title="Halaman ini kosong" />
              ) : (
                <div
                  key={`${datastore.resourceId ?? ''}-${datastore.page ?? 0}`}
                  className="animate-tab-in"
                >
                  <PlainTable columns={columns} rows={rows} />
                </div>
              )}

              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-ink-500 text-[13px]">
                  Halaman {page} dari {totalPages}
                </div>
                <TablePagination page={page} totalPages={totalPages} onChange={setPage} />
              </div>
            </>
          )
        }}
      </QueryBoundary>
    </div>
  )
}

/** Nama yang dipakai orang untuk tiap jenis berkas. */
const KIND_LABELS: Record<string, string> = {
  PDF: 'PDF',
  DOCX: 'Word',
  CSV: 'CSV',
  XLSX: 'Excel',
}

function ViewSwitch({
  value,
  onChange,
  files,
}: {
  value: string
  onChange: (value: string) => void
  files: DatasetResource[]
}) {
  // Satu berkas tidak perlu pemilih — tombol tunggal yang tidak bisa
  // diapa-apakan hanya menambah kebisingan.
  if (files.length < 2) {
    return null
  }

  // Jenis berkas dipakai sebagai label selama jenisnya masih membedakan. Dua
  // berkas CSV dalam satu dataset akan menghasilkan dua tombol bertuliskan
  // "CSV" yang tidak bisa dibedakan, jadi untuk itu dipakai nama berkasnya.
  const kinds = files.map((r) => (r.formatName ?? '').toUpperCase())
  const kindIsUnique = new Set(kinds).size === kinds.length

  return (
    <div className="flex flex-wrap rounded-[9px] bg-[#EEF1F5] p-[3px]">
      {files.map((r) => {
        const kind = (r.formatName ?? '').toUpperCase()
        return (
          <SwitchButton key={r.id} active={value === r.id} onClick={() => onChange(r.id ?? '')}>
            <FileText className="size-3.5" />
            {kindIsUnique ? (KIND_LABELS[kind] ?? kind) : r.label || r.fileName}
          </SwitchButton>
        )
      })}
    </div>
  )
}

function SwitchButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-bold transition-colors',
        active
          ? 'text-ink-900 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.12)]'
          : 'text-ink-500 bg-transparent',
      )}
    >
      {children}
    </button>
  )
}

function PlainTable({ columns, rows }: { columns: ColumnMeta[]; rows: DatastoreRow[] }) {
  return (
    <div className="border-line-100 overflow-x-auto rounded-[10px] border">
      <table className="w-full min-w-[560px] border-collapse">
        <thead className="bg-surface-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.machineName}
                scope="col"
                className="border-line-200 border-b-2 px-3.5 py-2.5 text-left whitespace-nowrap"
              >
                <div className="text-ink-900 text-[13px] font-bold">{column.displayName}</div>
                <div className="text-ink-400 font-mono text-[11px] font-semibold">
                  {column.dataType}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 ? 'bg-surface-25' : 'bg-surface'}>
              {columns.map((column) => (
                <td
                  key={column.machineName}
                  className="border-line-50 text-ink-700 border-b px-3.5 py-2.5 text-[13.5px] whitespace-nowrap"
                >
                  {toText(row[column.machineName])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Huruf kolom gaya spreadsheet: A…Z, lalu AA, AB, dan seterusnya.
 *
 * Desain hanya menyiapkan A–E karena dataset contohnya berkolom lima. Dataset
 * furnitur punya 17 kolom, jadi urutannya dihitung, bukan didaftar.
 */


/** Paginasi kecil khusus tabel — 34px, bukan 38px seperti katalog dataset. */
function TablePagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const from = Math.max(1, Math.min(page - 2, totalPages - 4))
  const rowNumber: number[] = []
  for (let n = from; n <= Math.min(totalPages, from + 4); n += 1) rowNumber.push(n)

  const direction =
    'border-line-200 text-ink-700 hover:bg-surface-100 h-[34px] rounded-lg border bg-white px-3 text-[13px] font-semibold transition-colors disabled:opacity-50'

  return (
    <nav className="flex gap-1.5" aria-label="Navigasi halaman tabel">
      <button
        type="button"
        className={direction}
        disabled={page <= 1}
        onClick={() => onChange(Math.max(1, page - 1))}
        aria-label="Halaman sebelumnya"
      >
        ‹
      </button>
      {rowNumber.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-current={n === page ? 'page' : undefined}
          className={cn(
            'h-[34px] min-w-[34px] rounded-lg border text-[13px] font-bold transition-colors',
            n === page
              ? 'bg-brand border-brand text-white'
              : 'border-line-200 text-ink-700 hover:bg-surface-100 bg-white',
          )}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className={direction}
        disabled={page >= totalPages}
        onClick={() => onChange(Math.min(totalPages, page + 1))}
        aria-label="Halaman berikutnya"
      >
        ›
      </button>
    </nav>
  )
}

/**
 * Nilai sel menjadi teks.
 *
 * Isi datastore disimpan sebagai JSONB, jadi tipenya berbeda-beda per kolom dan
 * tidak bisa diketahui saat kompilasi. `null` dan `undefined` menjadi tanda pisah,
 * bukan tulisan "null" — sel kosong memang kosong.
 */
function toText(value: unknown): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}
