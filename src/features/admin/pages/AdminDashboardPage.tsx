import { useState } from 'react'

import { useDatasets } from '@/features/dataset/hooks/useDatasets'
import { useDailyDownloads, useStats } from '@/features/stats/hooks/useStats'
import { CountUp } from '@/shared/components/motion/CountUp'
import { Reveal } from '@/shared/components/motion/Reveal'
import { formatDateTime, formatNumber } from '@/shared/lib/format'
import type { AuditAction } from '@/shared/types/api'

import { DatasetDrawer } from '../components/DatasetDrawer'
import { DownloadChart } from '../components/DownloadChart'
import { useAuditLogs } from '../hooks/useAdminLogs'

/**
 * Dashboard panel admin.
 *
 * Seluruh angka di halaman ini dihitung dari database, termasuk dua bagian yang
 * dulu sengaja dikosongkan karena belum ada sumbernya:
 *
 * - **Grafik unduhan 30 hari** kini dibaca dari `GET /api/v1/stats/downloads/daily`,
 *   yang mengelompokkan `download_log` per hari.
 * - **Aktivitas terakhir** dibaca dari `GET /api/v1/audit-logs`, tabel audit
 *   yang dibuat pada changeset 00025.
 *
 * Isi awal keduanya berupa data dummy yang di-seed lewat changeset 00029 — tapi
 * jalurnya nyata dari ujung ke ujung, jadi begitu ada unduhan atau penerbitan
 * sungguhan, angkanya ikut bergerak tanpa ada kode yang perlu diubah.
 */
export default function AdminDashboardPage() {
  const stats = useStats()
  const latest = useDatasets({ sort: 'created', page: 0, size: 5 })
  const audit = useAuditLogs(0, 6)
  const chart = useDailyDownloads(30)

  const [openSlug, setOpenSlug] = useState<string | null>(null)

  const cards = [
    { label: 'Total dataset', value: stats.data?.totalDataset },
    { label: 'Jenis file', value: stats.data?.totalFormat },
    { label: 'Kontributor', value: stats.data?.totalContributor },
    { label: 'Download 30 hari', value: stats.data?.totalDownloads30d },
    { label: 'Pengguna aktif', value: stats.data?.totalActiveUser },
  ]

  return (
    <div className="flex flex-col gap-3.5">
      <Reveal>
        <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((k, i) => (
            <Reveal key={k.label} delay={Math.min(i, 4) * 60}>
              <div className="rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.06)] sm:p-[22px_20px]">
                <div className="text-[26px] leading-[1.1] font-bold tracking-[-0.6px] text-[#2E3646] sm:text-[31px]">
                  {k.value === undefined ? '—' : <CountUp value={k.value} format={formatNumber} />}
                </div>
                <div className="mt-1.5 text-[16px] leading-[1.35] text-[#4B5563]">{k.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </Reveal>

      {/*
        Kedua panel HARUS sama tinggi. Grid meregangkan pembungkusnya secara
        bawaan, tapi itu tidak cukup: kartu di dalamnya perlu `h-full` supaya
        ikut meregang, dan daftarnya perlu `flex-1 min-h-0` supaya sisa ruangnya
        terisi. Tanpa keduanya, kartu yang isinya lebih pendek berhenti di
        tengah sel dan menyisakan celah menggantung di bawahnya.

        `min-h-0` bukan pelengkap — tanpa itu anak flex menolak menyusut di
        bawah tinggi isinya, dan alih-alih menggulir, kartunya yang melar.
      */}
      <div className="grid gap-3.5 xl:grid-cols-2">
        <Reveal delay={120} className="h-full">
          <div className="flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(16,24,40,.06)]">
            <div className="shrink-0 border-b border-[#E9EBF0] px-4 pt-5 pb-4 text-[16px] font-bold text-[#2E3646] sm:px-6 sm:pt-[22px]">
              Unggahan terbaru
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
            {latest.isPending ? (
              <Message>Memuat…</Message>
            ) : (latest.data?.content ?? []).length === 0 ? (
              <Message>Belum ada dataset.</Message>
            ) : (
              (latest.data?.content ?? []).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setOpenSlug(d.slug ?? null)}
                  className="flex w-full items-center gap-3.5 border-b border-[#E9EBF0] px-4 py-[18px] text-left transition-colors last:border-b-0 hover:bg-[#F8FAFC] sm:px-6"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] text-[#3C4A56]">{d.title}</span>
                    <span className="mt-0.5 block truncate text-[13.5px] text-[#4B5563]">
                      {[d.uploadedBy?.name, d.division?.code].filter(Boolean).join(' · ') || '—'}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-md bg-[#F1F3F7] px-2.5 py-1 text-[13px] font-bold text-[#4B5563]">
                    {(d.resources ?? []).length} file
                  </span>
                </button>
              ))
            )}
            </div>
          </div>
        </Reveal>

        <Reveal delay={180} className="h-full">
          <div className="flex h-full flex-col overflow-hidden rounded-lg bg-white shadow-[0_1px_2px_rgba(16,24,40,.06)]">
            <div className="shrink-0 border-b border-[#E9EBF0] px-4 pt-5 pb-4 text-[16px] font-bold text-[#2E3646] sm:px-6 sm:pt-[22px]">
              Aktivitas terakhir
            </div>

            {/*
              Sengaja BUKAN tombol, tidak seperti panel di sebelahnya. Baris
              audit adalah catatan kejadian, bukan pintu menuju keadaan sekarang
              — dan sebagian menunjuk ke hal yang sudah tidak ada lagi, seperti
              dataset yang diarsipkan atau dihapus. Membuatnya bisa diklik
              menjanjikan tujuan yang belum tentu ada.
            */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {audit.isPending ? (
                <Message>Memuat…</Message>
              ) : audit.isError ? (
                <Message>Jejak audit gagal dimuat.</Message>
              ) : (audit.data?.content ?? []).length === 0 ? (
                <Message>Belum ada aktivitas tercatat.</Message>
              ) : (
                (audit.data?.content ?? []).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-baseline gap-3 border-b border-[#E9EBF0] px-4 py-[15px] last:border-b-0 sm:px-6"
                  >
                    <span className="min-w-0 flex-1 text-[16px] text-[#3C4A56]">
                      {a.actorName ?? 'Sistem'}
                      {' — '}
                      <span style={{ color: actionColor(a.action) }} className="font-semibold">
                        {a.action}
                      </span>
                      {' — '}
                      <span className="text-[#6B7280]">dataset · {a.objectSlug}</span>
                    </span>
                    <span className="shrink-0 text-[13.5px] whitespace-nowrap text-[#6B7280]">
                      {formatDateTime(a.recordedAt)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </Reveal>
      </div>

      <Reveal delay={240}>
        <div className="rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.06)] sm:p-6">
          <div className="mb-[18px] text-[16px] font-bold text-[#2E3646]">
            Download harian · 30 hari
          </div>
          <DownloadChart
            data={chart.data?.days ?? []}
            loading={chart.isPending}
            failed={chart.isError}
          />
        </div>
      </Reveal>

      <DatasetDrawer slug={openSlug} onClose={() => setOpenSlug(null)} />
    </div>
  )
}

/**
 * Warna kata tindakan.
 *
 * Dikelompokkan menurut AKIBATNYA, bukan menurut abjad: hijau untuk yang
 * menambah, merah untuk yang menolak atau membuang, biru untuk yang mengubah
 * atau meneruskan. Dengan begitu satu pandangan ke daftar sudah menunjukkan
 * apakah ada sesuatu yang perlu diperhatikan.
 */
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

function Message({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-center text-[14.5px] text-[#9CA3AF] sm:px-6 sm:py-12">{children}</p>
}
