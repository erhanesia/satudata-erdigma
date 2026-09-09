import { ChevronLeft, ChevronRight, Download, Info, Loader2 } from 'lucide-react'
import { useState } from 'react'

import { ApiError } from '@/shared/api/errors'
import { Reveal } from '@/shared/components/motion/Reveal'
import { SelectMenu } from '@/shared/components/ui/SelectMenu'
import { pageFromUrl, useUrlState } from '@/shared/hooks/useUrlState'
import { useToast } from '@/shared/components/ui/toastStore'
import { formatDateTime, formatNumber, sanitizeFileName } from '@/shared/lib/format'
import type { AuditAction } from '@/shared/types/api'

import type { AccessType } from '../api/adminApi'
import { FormatBadge } from '../components/FormatBadge'
import { exportDownloadLogs } from '../api/adminApi'
import { useAuditLogs, useDownloadLogs } from '../hooks/useAdminLogs'

/**
 * Baris per halaman, sama di seluruh aplikasi.
 *
 * Angkanya disamakan dengan halaman berpaginasi lain supaya berpindah antar
 * layar tidak mengubah panjang daftar yang dibaca orang. Sebelumnya tiap
 * halaman memakai angkanya sendiri, dan yang terasa bukan angkanya melainkan
 * tinggi halamannya yang berubah-ubah tanpa alasan yang bisa dijelaskan.
 */
const PAGE_SIZE = 10

/**
 * Pilihan penyaring jenis akses.
 *
 * Tabel ini mencatat dua peristiwa yang mudah dikira satu: berkas yang
 * benar-benar diunduh, dan berkas yang cuma dibuka di peramban lewat
 * pratinjau. Keduanya sama-sama mengeluarkan bita dari server sehingga
 * sama-sama dicatat, tetapi hanya yang pertama yang menambah angka unduhan
 * di halaman dataset.
 *
 * Nilainya kode milik back-end; tulisannya yang dibaca orang ada di sini,
 * dan hanya di sini.
 */
const ACCESS_OPTIONS: { value: AccessType; label: string }[] = [
  { value: 'DOWNLOAD', label: 'Diunduh' },
  { value: 'PREVIEW', label: 'Dibuka' },
]

/**
 * Halaman Log — dua tab, mengikuti desain: **Download** dan **Audit**.
 *
 * Tab yang tidak terlihat TIDAK ikut memanggil endpoint-nya. Log unduhan berisi
 * puluhan ribu baris; menariknya hanya karena tab-nya ada di pohon komponen
 * adalah pemborosan yang tidak kelihatan dari layar.
 */
export default function AdminLogPage() {
  /*
    `page` ikut dideklarasikan di sini meski komponen ini tidak membacanya.

    Kedua tab berbagi satu parameter `page`, dan tanpa deklarasi ini berpindah
    tab akan membawa serta nomor halaman tab sebelumnya. Halaman 7 dari log
    unduhan menjadi halaman 7 dari jejak audit yang mungkin cuma punya dua,
    dan yang tampil tabel kosong.

    Dengan `page` dikenali di sini, useUrlState menghapusnya sendiri setiap
    kali tab berganti, aturan yang sama dengan saat penyaring berganti.
  */
  const [urlState, setUrlState] = useUrlState({ tab: 'download', page: '1' })
  const tab = urlState.tab === 'audit' ? 'audit' : 'download'
  const setTab = (nilai: 'download' | 'audit') => setUrlState({ tab: nilai })

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
  /*
    Penyaringnya di URL, status mengekspor tidak.

    Yang masuk URL menerangkan "sedang melihat apa", dan itu yang berguna
    dibagikan atau dibuka ulang. Status mengekspor cuma menerangkan "sedang
    sibuk", dan alamat yang membawanya ikut akan membuat tombolnya mati saat
    tautannya dibuka orang lain.
  */
  const [urlState, setUrlState] = useUrlState({
    from: '',
    to: '',
    accessType: '',
    page: '1',
  })

  // URL berbasis 1 karena dibaca manusia; API berbasis 0. Konversinya cuma
  // di baris ini dan di pemanggilan paginasinya.
  const page = pageFromUrl(urlState.page) - 1
  const fromDate = urlState.from
  const toDate = urlState.to
  /*
    Nilai dari URL diperiksa terhadap daftar yang sah, tidak diteruskan mentah.

    Server memang menolak jenis akses yang tidak dikenal dengan 400, tetapi
    membiarkannya sampai ke sana berarti orang yang salah mengetik alamat
    melihat pesan galat merah alih-alih tabel biasa tanpa penyaring.
  */
  const accessType: AccessType | '' =
    urlState.accessType === 'DOWNLOAD' || urlState.accessType === 'PREVIEW'
      ? urlState.accessType
      : ''

  const [exporting, setExporting] = useState(false)
  const toast = useToast()

  const query = useDownloadLogs(
    page,
    PAGE_SIZE,
    fromDate || undefined,
    toDate || undefined,
    accessType || undefined,
  )
  const rows = query.data?.content ?? []

  const menyaring = Boolean(fromDate || toDate || accessType)

  // Halamannya dikembalikan sendiri oleh useUrlState begitu penyaring berubah;
  // alasannya ada di sana, dan sekarang berlaku sama di seluruh halaman.

  async function exportCsv() {
    setExporting(true)
    try {
      const { blob, fileName } = await exportDownloadLogs(
        fromDate || undefined,
        toDate || undefined,
        // Penyaring yang sama dengan yang sedang dilihat. Berkasnya memuat data
        // pribadi, jadi selisih antara layar dan berkas bukan sekadar merepotkan.
        accessType || undefined,
      )
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
        <DateInput
          value={fromDate}
          onChange={(v) => setUrlState({ from: v })}
          label="Tanggal awal"
        />
        <DateInput
          value={toDate}
          onChange={(v) => setUrlState({ to: v })}
          label="Tanggal akhir"
        />

        <SelectMenu
          value={accessType}
          onChange={(v) => setUrlState({ accessType: v })}
          options={ACCESS_OPTIONS}
          placeholder="Semua akses"
          ariaLabel="Saring menurut jenis akses"
          className="min-w-[170px]"
        />

        {menyaring ? (
          <button
            type="button"
            onClick={() =>
              setUrlState({ from: '', to: '', accessType: '' })
            }
            className="text-[13.5px] font-semibold text-[#4F6BED] hover:underline"
          >
            Bersihkan penyaring
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
        columns={['Waktu', 'Pengguna', 'Dataset', 'Format', 'Channel', 'Aksi']}
        loading={query.isPending}
        failed={query.isError}
        empty={rows.length === 0}
        /*
          Dua pesan yang berbeda untuk dua keadaan yang berbeda.

          "Belum ada yang tercatat" pada tabel yang sedang disaring adalah
          kebohongan kecil yang mahal: pembacanya menyimpulkan sistemnya kosong,
          padahal yang kosong cuma irisan yang sedang ia minta.

          Katanya juga bukan lagi "unduhan", karena tabel ini memuat pratinjau
          juga sejak ada penyaring yang memisahkan keduanya.
        */
        emptyMessage={
          menyaring
            ? 'Tidak ada yang cocok dengan penyaring ini.'
            : 'Belum ada akses berkas tercatat.'
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
            <Cell nowrap>
              <FormatList formats={formatsOf(l)} />
            </Cell>
            <Cell nowrap>{channel(l.channel)}</Cell>
            <Cell nowrap>
              {/*
                Kolom ini dulu berjudul "Disclaimer" dan menampilkan tiga keadaan:
                "Pratinjau", "Disetujui", dan "Tidak". Tiga keadaan untuk dua
                pertanyaan yang berbeda, dan salah satunya tidak pernah terjadi.

                "Tidak" mustahil: DownloadService menolak unduhan yang tidak
                menyertakan persetujuan SEBELUM satu baris log pun ditulis, jadi
                tidak ada baris DOWNLOAD yang persetujuannya bernilai salah.
                Cabangnya berwarna merah selama berbulan-bulan tanpa pernah sekali
                pun tergambar.

                Yang tersisa dua keadaan yang menjawab satu pertanyaan yang sama,
                yaitu apa yang orang itu lakukan. Persetujuannya sendiri tetap
                tersimpan dan tetap ikut di kolom `persetujuan` pada ekspor CSV,
                tempat catatan kepatuhan memang seharusnya berada.
              */}
              {l.accessType === 'PREVIEW' ? (
                <span className="text-[#6B7280]">Dibuka</span>
              ) : (
                <span className="text-[#137A46]">Diunduh</span>
              )}
            </Cell>
          </tr>
        ))}
      </DataTable>

      <TableFooter
        page={page}
        totalPages={query.data?.totalPages ?? 0}
        totalRows={query.data?.totalElements ?? 0}
        onPindah={(h) => setUrlState({ page: String(h + 1) })}
        unit="baris"
      />
    </div>
  )
}

function TabAudit() {
  // Berbagi parameter `page` dengan tab unduhan. Yang menjaga keduanya tidak
  // tertukar adalah penghapusan `page` saat tab berganti, di komponen induk.
  const [urlState, setUrlState] = useUrlState({ page: '1' })
  const page = pageFromUrl(urlState.page) - 1
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
        onPindah={(h) => setUrlState({ page: String(h + 1) })}
        unit="aktivitas"
      />
    </div>
  )
}

/**
 * Format apa saja yang terlibat dalam satu baris log.
 *
 * <h2>Kenapa dua sumber</h2>
 *
 * Kolom `formats` baru ada sejak baris log berhenti mewakili satu berkas dan
 * mulai mewakili satu peristiwa. Baris yang ditulis sebelum itu tidak
 * memilikinya, dan jumlahnya puluhan ribu; menampilkannya kosong berarti
 * membuang keterangan yang sebenarnya masih ada di nama berkasnya.
 *
 * Jadi kolomnya dipakai kalau ada, dan nama berkas dipakai kalau tidak.
 * Baris pembukaan dataset tidak punya keduanya, dan itu memang benar: membuka
 * dataset tidak menyentuh berkas mana pun.
 */
function formatsOf(l: { formats?: string; fileName?: string }): string[] {
  if (l.formats) {
    return l.formats
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean)
  }
  const fromName = extensionOf(l.fileName)
  return fromName ? [fromName] : []
}

/** "komentar-tiktok-mbg.xlsx" -> "XLSX". */
function extensionOf(fileName: string | undefined): string | null {
  if (!fileName) return null
  const points = fileName.lastIndexOf('.')
  if (points < 0) return null
  return fileName.slice(points + 1).toUpperCase()
}

/**
 * Menggambar format sebagai badge, bukan teks.
 *
 * Warnanya sama dengan yang dipakai di halaman Dataset panel admin, lewat
 * komponen yang sama, supaya "CSV" berarti hal yang sama dan terlihat sama di
 * mana pun ia muncul.
 *
 * Satu baris bisa memuat lebih dari satu, karena satu aksi unduh boleh
 * mengambil beberapa berkas sekaligus. `flex-wrap` menahannya tetap rapi
 * ketika jumlahnya banyak, alih-alih mendorong lebar kolomnya.
 */
function FormatList({ formats }: { formats: string[] }) {
  if (formats.length === 0) {
    return <span className="text-[#9CA3AF]">—</span>
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {formats.map((f) => (
        <FormatBadge key={f} ext={f} />
      ))}
    </div>
  )
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
