import { useState } from 'react'

import { EmptyState } from '@/shared/components/feedback/StateViews'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { SkeletonTable } from '@/shared/components/ui/Skeleton'
import { cn } from '@/shared/lib/cn'
import { formatNumber } from '@/shared/lib/format'
import type { DatastoreRow } from '@/shared/types/api'

import { useDatastore } from '../hooks/useDatasets'

const UKURAN_HALAMAN = 10

interface KolomMeta {
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
export function DataExplorer({ slug, rowCount }: { slug: string; rowCount: number }) {
  const [halaman, setHalaman] = useState(1)
  const [tampilan, setTampilan] = useState<'tabel' | 'excel'>('tabel')
  const query = useDatastore(slug, halaman - 1, UKURAN_HALAMAN, rowCount > 0)

  if (rowCount === 0) {
    return (
      <EmptyState
        title="Belum ada isi tabel untuk dataset ini"
        description="Metadata dataset sudah tersedia, tetapi barisnya belum dimuat ke datastore. Data akan muncul di sini setelah tim data engineer mengunggahnya."
      />
    )
  }

  return (
    <div className="border-line-200 bg-surface rounded-[14px] border p-5">
      <QueryBoundary query={query} loading={<SkeletonTable rows={UKURAN_HALAMAN} />}>
        {(datastore) => {
          const kolom: KolomMeta[] = (datastore.columns ?? []).map((k) => ({
            machineName: k.machineName ?? '',
            displayName: k.displayName ?? k.machineName ?? '',
            dataType: k.dataType ?? '',
          }))
          const baris = (datastore.rows ?? []) as DatastoreRow[]
          const totalHalaman = datastore.totalPages ?? 1

          return (
            <>
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <h3 className="text-ink-900 text-base font-bold">Data Explorer</h3>
                  <SakelarTampilan nilai={tampilan} onGanti={setTampilan} />
                </div>
                <div className="text-ink-500 text-[13px]">
                  {formatNumber(rowCount)} baris · menampilkan {kolom.length} dari {kolom.length}{' '}
                  kolom
                </div>
              </div>

              {baris.length === 0 ? (
                <EmptyState title="Halaman ini kosong" />
              ) : (
                /*
                 * `key` wajib ada. Tanpa itu React memakai ulang elemen yang
                 * sama saat tampilan berganti, sehingga animasi CSS-nya tidak
                 * pernah diputar ulang — hanya isinya yang tiba-tiba berganti.
                 *
                 * Memakai `animate-tab-in` yang sama dengan tab di atasnya,
                 * bukan kurva baru: berpindah Tabel/Excel dan berpindah tab
                 * adalah tindakan sejenis, jadi geraknya sebaiknya sama.
                 */
                <div key={tampilan} className="animate-tab-in">
                  {tampilan === 'excel' ? (
                    <KisiExcel slug={slug} columns={kolom} rows={baris} />
                  ) : (
                    <TabelBiasa columns={kolom} rows={baris} />
                  )}
                </div>
              )}

              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-ink-500 text-[13px]">
                  Halaman {halaman} dari {totalHalaman}
                </div>
                <PaginasiTabel
                  halaman={halaman}
                  totalHalaman={totalHalaman}
                  onGanti={setHalaman}
                />
              </div>
            </>
          )
        }}
      </QueryBoundary>
    </div>
  )
}

function SakelarTampilan({
  nilai,
  onGanti,
}: {
  nilai: 'tabel' | 'excel'
  onGanti: (nilai: 'tabel' | 'excel') => void
}) {
  return (
    <div className="flex rounded-[9px] bg-[#EEF1F5] p-[3px]">
      <TombolSakelar aktif={nilai === 'tabel'} onClick={() => onGanti('tabel')}>
        Tabel
      </TombolSakelar>
      <TombolSakelar aktif={nilai === 'excel'} onClick={() => onGanti('excel')}>
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke={nilai === 'excel' ? '#137A46' : '#98A2B3'}
          strokeWidth={2}
          aria-hidden
        >
          <rect x={3} y={3} width={18} height={18} rx={2} />
          <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
        </svg>
        Excel
      </TombolSakelar>
    </div>
  )
}

function TombolSakelar({
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
        'flex items-center gap-1.5 rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-bold transition-colors',
        aktif
          ? 'text-ink-900 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.12)]'
          : 'text-ink-500 bg-transparent',
      )}
    >
      {children}
    </button>
  )
}

function TabelBiasa({ columns, rows }: { columns: KolomMeta[]; rows: DatastoreRow[] }) {
  return (
    <div className="border-line-100 overflow-x-auto rounded-[10px] border">
      <table className="w-full min-w-[560px] border-collapse">
        <thead className="bg-surface-50">
          <tr>
            {columns.map((kolom) => (
              <th
                key={kolom.machineName}
                scope="col"
                className="border-line-200 border-b-2 px-3.5 py-2.5 text-left whitespace-nowrap"
              >
                <div className="text-ink-900 text-[13px] font-bold">{kolom.displayName}</div>
                <div className="text-ink-400 font-mono text-[11px] font-semibold">
                  {kolom.dataType}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((baris, i) => (
            <tr key={i} className={i % 2 ? 'bg-surface-25' : 'bg-surface'}>
              {columns.map((kolom) => (
                <td
                  key={kolom.machineName}
                  className="border-line-50 text-ink-700 border-b px-3.5 py-2.5 text-[13.5px] whitespace-nowrap"
                >
                  {keTeks(baris[kolom.machineName])}
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
function hurufKolom(index: number): string {
  let sisa = index
  let hasil = ''
  do {
    hasil = String.fromCharCode(65 + (sisa % 26)) + hasil
    sisa = Math.floor(sisa / 26) - 1
  } while (sisa >= 0)
  return hasil
}

function KisiExcel({
  slug,
  columns,
  rows,
}: {
  slug: string
  columns: KolomMeta[]
  rows: DatastoreRow[]
}) {
  const selDasar =
    'min-w-[110px] border-r border-b border-[#E7EAEF] px-2.5 py-[5px] font-mono text-[13px] whitespace-nowrap bg-white'
  const selNomor =
    'w-11 min-w-11 sticky left-0 z-[1] bg-[#F0F2F5] border-r border-[#D6DBE2] border-b border-[#E7EAEF] text-center text-[11.5px] font-semibold text-[#5F6B7A]'

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#D6DBE2]">
      <div className="flex items-center gap-2 bg-[#107C41] px-3.5 py-2 text-white">
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} aria-hidden>
          <rect x={3} y={3} width={18} height={18} rx={2} />
          <path d="M8 8l8 8M16 8l-8 8" />
        </svg>
        <span className="text-[13px] font-bold">{slug}.xlsx</span>
        <span className="ml-auto text-[11.5px] opacity-85">Sheet1</span>
      </div>

      <div className="overflow-x-auto bg-white">
        <table className="w-full min-w-[620px] border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-[2] w-11 min-w-11 border-r border-b border-[#D6DBE2] bg-[#F0F2F5]" />
              {columns.map((_, i) => (
                <th
                  key={i}
                  className="min-w-[110px] border-r border-b border-[#D6DBE2] bg-[#F0F2F5] py-1 text-center text-[11.5px] font-bold text-[#5F6B7A]"
                >
                  {hurufKolom(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Baris 1 berisi nama kolom, persis seperti berkas Excel sungguhan
                yang barisan pertamanya adalah header. */}
            <tr>
              <td className={selNomor}>1</td>
              {columns.map((kolom) => (
                <td key={kolom.machineName} className={cn(selDasar, 'font-bold text-[#1F2A37]')}>
                  {kolom.displayName}
                </td>
              ))}
            </tr>
            {rows.map((baris, ri) => (
              <tr key={ri}>
                <td className={selNomor}>{ri + 2}</td>
                {columns.map((kolom) => (
                  <td key={kolom.machineName} className={cn(selDasar, 'text-[#1F2A37]')}>
                    {keTeks(baris[kolom.machineName])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** Paginasi kecil khusus tabel — 34px, bukan 38px seperti katalog dataset. */
function PaginasiTabel({
  halaman,
  totalHalaman,
  onGanti,
}: {
  halaman: number
  totalHalaman: number
  onGanti: (halaman: number) => void
}) {
  if (totalHalaman <= 1) return null

  const mulai = Math.max(1, Math.min(halaman - 2, totalHalaman - 4))
  const nomor: number[] = []
  for (let n = mulai; n <= Math.min(totalHalaman, mulai + 4); n += 1) nomor.push(n)

  const arah =
    'border-line-200 text-ink-700 hover:bg-surface-100 h-[34px] rounded-lg border bg-white px-3 text-[13px] font-semibold transition-colors disabled:opacity-50'

  return (
    <nav className="flex gap-1.5" aria-label="Navigasi halaman tabel">
      <button
        type="button"
        className={arah}
        disabled={halaman <= 1}
        onClick={() => onGanti(Math.max(1, halaman - 1))}
        aria-label="Halaman sebelumnya"
      >
        ‹
      </button>
      {nomor.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onGanti(n)}
          aria-current={n === halaman ? 'page' : undefined}
          className={cn(
            'h-[34px] min-w-[34px] rounded-lg border text-[13px] font-bold transition-colors',
            n === halaman
              ? 'bg-brand border-brand text-white'
              : 'border-line-200 text-ink-700 hover:bg-surface-100 bg-white',
          )}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        className={arah}
        disabled={halaman >= totalHalaman}
        onClick={() => onGanti(Math.min(totalHalaman, halaman + 1))}
        aria-label="Halaman berikutnya"
      >
        ›
      </button>
    </nav>
  )
}

function keTeks(nilai: unknown): string {
  if (nilai == null) return '—'
  if (typeof nilai === 'string' || typeof nilai === 'number' || typeof nilai === 'boolean') {
    return String(nilai)
  }
  return JSON.stringify(nilai)
}
