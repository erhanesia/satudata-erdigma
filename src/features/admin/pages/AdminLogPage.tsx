import { ChevronLeft, ChevronRight, Download, Info, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { ApiError } from '@/shared/api/errors'
import { Reveal } from '@/shared/components/motion/Reveal'
import { useToast } from '@/shared/components/ui/toastStore'
import { formatDateTime, formatNumber, sanitizeFileName } from '@/shared/lib/format'
import type { AuditAction } from '@/shared/types/api'

import { exportDownloadLogs } from '../api/adminApi'
import { useAuditLogs, useDownloadLogs } from '../hooks/useAdminLogs'

const PAGE_SIZE = 25

/**
 * Halaman Log — dua tab, mengikuti desain: **Download** dan **Audit**.
 *
 * Tab yang tidak terlihat TIDAK ikut memanggil endpoint-nya. Log unduhan berisi
 * puluhan ribu baris; menariknya hanya karena tab-nya ada di pohon komponen
 * adalah pemborosan yang tidak kelihatan dari layar.
 */
export default function AdminLogPage() {
  const [tab, setTab] = useState<'download' | 'audit'>('download')

  return (
    <Reveal>
      <div className="overflow-hidden rounded-[14px] border border-[#E9EBF0] bg-white">
        <div className="flex border-b border-[#E9EBF0] px-2">
          <Tab active={tab === 'download'} onClick={() => setTab('download')}>
            Download
          </Tab>
          <Tab active={tab === 'audit'} onClick={() => setTab('audit')}>
            Audit
          </Tab>
        </div>

        {tab === 'download' ? <DownloadTab /> : <TabAudit />}
      </div>
    </Reveal>
  )
}

function DownloadTab() {
  const [page, setPage] = useState(0)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [exporting, setExporting] = useState(false)
  const toast = useToast()

  const query = useDownloadLogs(page, PAGE_SIZE, fromDate || undefined, toDate || undefined)
  const rows = query.data?.content ?? []

  function changeRange(change: () => void) {
    change()
    // Rentang baru berarti hasil baru. Tetap di halaman 7 menghasilkan tabel
    // kosong yang terlihat seperti "tidak ada data" padahal ada di halaman 1.
    setPage(0)
  }

  async function exportCsv() {
    setExporting(true)
    try {
      const { blob, fileName } = await exportDownloadLogs(fromDate || undefined, toDate || undefined)
      const url = URL.createObjectURL(blob)
      try {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = sanitizeFileName(fileName ?? 'log-unduhan.csv', 'log-unduhan.csv')
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
      toast.success('Log unduhan diekspor.')
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Ekspor gagal.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="animate-tab-in">
      {/*
        Keterangan retensi ini bukan hiasan hukum. Tabelnya memuat nama, email,
        dan alamat IP karyawan; siapa pun yang membukanya perlu tahu sejak baris
        pertama bahwa isinya data pribadi, bukan angka operasional biasa.
      */}
      <p className="flex items-start gap-2 border-b border-[#E9EBF0] bg-[#F8FAFC] px-4 py-3 text-[13.5px] leading-relaxed text-[#4B5563] sm:px-6">
        <Info className="mt-0.5 size-4 shrink-0 text-[#6B7280]" />
        Log ini memuat data pribadi dan disimpan maksimal 12 bulan sesuai UU PDP 27/2022.
      </p>

      <div className="flex flex-wrap items-center gap-2.5 px-4 py-4 sm:px-6 sm:py-5">
        <DateInput value={fromDate} onChange={(v) => changeRange(() => setFromDate(v))} label="Tanggal awal" />
        <DateInput
          value={toDate}
          onChange={(v) => changeRange(() => setToDate(v))}
          label="Tanggal akhir"
        />

        {fromDate || toDate ? (
          <button
            type="button"
            onClick={() =>
              changeRange(() => {
                setFromDate('')
                setToDate('')
              })
            }
            className="text-[13.5px] font-semibold text-[#4F6BED] hover:underline"
          >
            Bersihkan rentang
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => void exportCsv()}
          disabled={exporting || rows.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F2A37] px-6 py-3 text-[16px] font-bold text-white transition-colors hover:bg-[#111A24] disabled:cursor-not-allowed disabled:bg-[#E9EBF0] disabled:text-[#9CA3AF] sm:ml-auto sm:w-auto"
        >
          {exporting ? (
            <Loader2 className="size-[18px] animate-spin" />
          ) : (
            <Download className="size-[18px]" />
          )}
          Export CSV
        </button>
      </div>

      <DataTable
        columns={['Waktu', 'Pengguna', 'Dataset', 'Format', 'Channel', 'Disclaimer']}
        loading={query.isPending}
        failed={query.isError}
        empty={rows.length === 0}
        emptyMessage={
          fromDate || toDate
            ? 'Tidak ada unduhan pada rentang tanggal ini.'
            : 'Belum ada unduhan tercatat.'
        }
        fetching={query.isFetching && !query.isPending}
      >
        {rows.map((l) => (
          <tr key={l.id} className="transition-colors hover:bg-[#F8FAFC]">
            <Cell nowrap>{formatDateTime(l.downloadedAt)}</Cell>
            <Cell>
              <div className="font-semibold text-[#3C4A56]">{l.userName ?? '—'}</div>
              <div className="mt-0.5 text-[12.5px] text-[#9CA3AF]">{l.divisionCode ?? '—'}</div>
            </Cell>
            <Cell>{l.datasetSlug}</Cell>
            <Cell nowrap>{fileKindOf(l.fileName)}</Cell>
            <Cell nowrap>{channel(l.channel)}</Cell>
            <Cell nowrap>
              {/*
                Pratinjau memang tidak melewati modal persetujuan. Menuliskannya
                "Tidak" begitu saja akan terbaca seolah orang mengunduh tanpa
                menyetujui apa pun — padahal ia tidak mengunduh sama sekali.
              */}
              {l.accessType === 'PREVIEW' ? (
                <span className="text-[#6B7280]">Pratinjau</span>
              ) : l.agreementAccepted ? (
                <span className="text-[#137A46]">Disetujui</span>
              ) : (
                <span className="text-[#B4231B]">Tidak</span>
              )}
            </Cell>
          </tr>
        ))}
      </DataTable>

      <TableFooter
        page={page}
        totalPages={query.data?.totalPages ?? 0}
        totalRows={query.data?.totalElements ?? 0}
        onPindah={setPage}
        unit="baris"
      />
    </div>
  )
}

function TabAudit() {
  const [page, setPage] = useState(0)
  const query = useAuditLogs(page, PAGE_SIZE)
  const rows = query.data?.content ?? []

  return (
    <div className="animate-tab-in">
      <DataTable
        columns={['Waktu', 'Pelaku', 'Tindakan', 'Objek']}
        loading={query.isPending}
        failed={query.isError}
        empty={rows.length === 0}
        emptyMessage="Belum ada aktivitas tercatat."
        fetching={query.isFetching && !query.isPending}
      >
        {rows.map((a) => (
          <tr key={a.id} className="transition-colors hover:bg-[#F8FAFC]">
            <Cell nowrap>{formatDateTime(a.recordedAt)}</Cell>
            <Cell>
              <span className="font-semibold text-[#3C4A56]">{a.actorName ?? 'Sistem'}</span>
            </Cell>
            <Cell nowrap>
              <span className="font-semibold" style={{ color: actionColor(a.action) }}>
                {a.action}
              </span>
            </Cell>
            <Cell>
              <div className="font-mono text-[13.5px]">
                {a.objectType} · {a.objectSlug}
              </div>
              {/*
                Keterangannya tidak ada di desain, tapi tanpanya log audit tidak
                bisa menjawab "apa yang berubah" — dan itu satu-satunya alasan
                log ini dibuat. Ditaruh sebagai baris kedua supaya jumlah
                kolomnya tetap empat seperti desain.
              */}
              {a.detail ? (
                <div className="mt-0.5 text-[12.5px] text-[#9CA3AF]">{a.detail}</div>
              ) : null}
            </Cell>
          </tr>
        ))}
      </DataTable>

      <TableFooter
        page={page}
        totalPages={query.data?.totalPages ?? 0}
        totalRows={query.data?.totalElements ?? 0}
        onPindah={setPage}
        unit="aktivitas"
      />
    </div>
  )
}

/** "komentar-tiktok-mbg.xlsx" -> "XLSX". Nama berkas adalah sumber yang paling benar. */
function fileKindOf(fileName: string | undefined): string {
  if (!fileName) return '—'
  const points = fileName.lastIndexOf('.')
  if (points < 0) return '—'
  return fileName.slice(points + 1).toUpperCase()
}

function channel(value: string | undefined): string {
  if (value === 'API') return 'API'
  return 'Web'
}

/** Dikelompokkan menurut akibat, sama dengan panel "Aktivitas terakhir". */
function actionColor(action: AuditAction | undefined): string {
  switch (action) {
    case 'CREATE':
    case 'PUBLISH':
      return '#137A46'
    case 'REJECT':
    case 'DELETE':
      return '#B4231B'
    case 'ARCHIVE':
      return '#B45309'
    default:
      return '#1B54C4'
  }
}

function DateInput({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <input
      type="date"
      value={value}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="h-[52px] rounded-lg border border-[#E9EBF0] bg-white px-3.5 text-[16px] text-[#3C4A56] outline-none transition-colors focus:border-[#4F6BED]"
    />
  )
}

function Tab({
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
      className={[
        'border-b-2 px-[18px] py-3.5 text-[16px] font-bold transition-colors',
        active
          ? 'border-[#4F6BED] text-[#4F6BED]'
          : 'border-transparent text-[#6B7280] hover:text-[#3C4A56]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function DataTable({
  columns,
  loading,
  failed,
  empty,
  emptyMessage,
  fetching,
  children,
}: {
  columns: string[]
  loading: boolean
  failed: boolean
  empty: boolean
  emptyMessage: string
  fetching: boolean
  children: React.ReactNode
}) {
  return (
    /*
      Peredupan silang, bukan animasi masuk yang diputar ulang. Alasan
      lengkapnya ada di AdminDatasetPage: menandai pembungkus dengan key
      memaksa React membangun ulang seluruh tabel tiap kali data tiba, dan
      kerja sebesar itu dalam satu frame membuat geraknya tersendat.
    */
    <div
      className={[
        'overflow-x-auto transition-opacity duration-[220ms] ease-out',
        fetching ? 'opacity-40' : 'opacity-100',
      ].join(' ')}
    >
      <table className="w-full min-w-[880px] border-collapse">
        <thead>
          <tr>
            {columns.map((h) => (
              <th
                key={h}
                className="border-y border-[#E9EBF0] px-6 py-4 text-left text-[15px] font-medium text-[#6B7280]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <MessageRow columns={columns.length}>Memuat…</MessageRow>
          ) : failed ? (
            <MessageRow columns={columns.length}>
              Gagal dimuat. Halaman ini hanya bisa dibaca akun ADMIN.
            </MessageRow>
          ) : empty ? (
            <MessageRow columns={columns.length}>{emptyMessage}</MessageRow>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  )
}

function Cell({ children, nowrap }: { children: React.ReactNode; nowrap?: boolean }) {
  return (
    <td
      className={[
        'border-b border-[#F1F3F7] px-6 py-4 text-[14.5px] text-[#4B5563]',
        nowrap ? 'whitespace-nowrap' : '',
      ].join(' ')}
    >
      {children}
    </td>
  )
}

function MessageRow({ columns, children }: { columns: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={columns} className="p-8 text-center text-[14.5px] text-[#9CA3AF] sm:p-12">
        {children}
      </td>
    </tr>
  )
}

function TableFooter({
  page,
  totalPages,
  totalRows,
  onPindah,
  unit,
}: {
  page: number
  totalPages: number
  totalRows: number
  onPindah: (h: number) => void
  unit: string
}) {
  if (totalRows === 0) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <span className="text-[13.5px] text-[#6B7280]">
        {formatNumber(totalRows)} {unit} · halaman {page + 1} dari {totalPages}
      </span>

      <div className="flex items-center gap-2">
        <PageButton disabled={page === 0} onClick={() => onPindah(page - 1)}>
          <ChevronLeft className="size-4" />
          Sebelumnya
        </PageButton>
        <PageButton disabled={page + 1 >= totalPages} onClick={() => onPindah(page + 1)}>
          Berikutnya
          <ChevronRight className="size-4" />
        </PageButton>
      </div>
    </div>
  )
}

function PageButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-[#E9EBF0] bg-white px-3.5 py-2 text-[13.5px] font-semibold text-[#4B5563] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
    >
      {children}
    </button>
  )
}
