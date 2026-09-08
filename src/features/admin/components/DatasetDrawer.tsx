import * as DialogPrimitive from '@radix-ui/react-dialog'
import { User, X } from 'lucide-react'

import { useDataset } from '@/features/dataset/hooks/useDatasets'
import { CountUp } from '@/shared/components/motion/CountUp'
import { formatBytes, formatDateTime, formatNumber } from '@/shared/lib/format'

import { useAccessRuleNames } from '../hooks/useAccessOptions'

import { FormatBadge } from './FormatBadge'

interface DatasetDrawerProps {
  /** Slug dataset yang sedang dibuka; `null` menutup panel. */
  slug: string | null
  onClose: () => void
}

/**
 * Panel sisi kanan berisi ringkasan satu dataset, mengikuti desain panel admin.
 *
 * **Kenapa Radix Dialog, bukan `<div>` dengan `position: fixed`.** Panel ini
 * menutupi halaman dan berisi tautan serta tombol. Tanpa jebakan fokus,
 * pengguna papan ketik yang menekan Tab akan berjalan menembusnya ke tabel di
 * belakang — masih terlihat, tapi tidak bisa dicapai tetikus, dan tidak ada
 * cara keluar. Radix mengurus itu, Esc, dan penyembunyian latar dari pembaca
 * layar sekaligus.
 *
 * **Kenapa `recordView: false`.** Menengok dataset lewat panel pengelolaan
 * bukan kunjungan portal. Kalau ikut dihitung, angka "Total kunjungan" di
 * dasbor naik setiap kali admin menengok datanya sendiri — kartu yang mengukur
 * dirinya sendiri.
 */
export function DatasetDrawer({ slug, onClose }: DatasetDrawerProps) {
  const open = slug !== null
  const dataset = useDataset(slug ?? '', false)
  const d = dataset.data

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-[#101828]/40 data-[state=closed]:animate-[drawer-fade-out_180ms_ease-in] data-[state=open]:animate-[drawer-fade-in_220ms_ease-out]"
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={[
            'fixed top-0 right-0 z-50 flex h-full w-[calc(100vw-2rem)] max-w-[680px] flex-col bg-[#F1F3F7] shadow-2xl outline-none',
            'data-[state=open]:animate-[drawer-in_260ms_cubic-bezier(0.22,1,0.36,1)]',
            'data-[state=closed]:animate-[drawer-out_200ms_cubic-bezier(0.4,0,1,1)]',
          ].join(' ')}
        >
          <header className="flex items-start justify-between gap-4 border-b border-[#E9EBF0] bg-white px-4 py-5 sm:px-7 sm:py-6">
            <div className="min-w-0">
              <div className="text-[12.5px] font-semibold tracking-[1px] text-[#6B7280] uppercase">
                {d?.division?.code ?? ' '}
              </div>
              <DialogPrimitive.Title className="mt-1 truncate text-[20px] leading-tight font-bold text-[#2E3646] sm:text-[26px]">
                {d?.title ?? (dataset.isPending ? 'Memuat…' : 'Dataset')}
              </DialogPrimitive.Title>
              <div className="mt-1.5 truncate font-mono text-[13.5px] text-[#6B7280]">
                {d?.slug ?? slug ?? ''}
              </div>
            </div>
            <DialogPrimitive.Close
              aria-label="Tutup"
              className="-mt-1 -mr-1 shrink-0 rounded-lg p-2 text-[#9CA3AF] transition-colors hover:bg-[#F1F3F7] hover:text-[#3C4A56]"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </header>

          <div className="flex-1 overflow-y-auto p-5">
            {dataset.isPending ? (
              <LoadingBlock />
            ) : dataset.isError ? (
              <div className="rounded-[10px] border border-[#FEE4E2] bg-[#FEF3F2] p-5 text-[14px] text-[#B4231B]">
                Detail dataset gagal dimuat.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                <Card title="Diunggah oleh">
                  {d?.uploadedBy ? (
                    <div className="flex items-center gap-4 px-5 py-4">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#E9EBF0]">
                        <User className="size-5 text-[#6B7280]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[15.5px] font-semibold text-[#2E3646]">
                          {d.uploadedBy.name}
                        </div>
                        <div className="mt-0.5 truncate text-[13.5px] text-[#6B7280]">
                          {[d.uploadedBy.position, d.uploadedBy.divisionCode]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[12.5px] text-[#9CA3AF]">Diunggah</div>
                        <div className="mt-0.5 text-[13.5px] text-[#4B5563]">
                          {formatDateTime(d.createdAt)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Dataset lama yang terbit sebelum kolom uploaded_by ada
                    // memang tidak punya pemilik tercatat. Menebak siapa yang
                    // paling mungkin mengunggahnya justru memalsukan jejak.
                    <EmptyNote>Pengunggahnya tidak tercatat.</EmptyNote>
                  )}
                </Card>

                <Card title="File">
                  {(d?.resources ?? []).length === 0 ? (
                    <EmptyNote>
                      Dataset ini belum punya berkas
                      {d?.realtime ? ' — datanya dialirkan langsung lewat API.' : '.'}
                    </EmptyNote>
                  ) : (
                    <ul className="divide-y divide-[#F1F3F7]">
                      {(d?.resources ?? []).map((r) => (
                        <li key={r.id} className="flex items-center gap-4 px-5 py-4">
                          <FormatBadge ext={r.formatName ?? ''} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px] text-[#2E3646]">
                              {r.fileName ?? '—'}
                            </div>
                          </div>
                          <div className="shrink-0 text-[13.5px] text-[#4B5563]">
                            {formatBytes(r.sizeBytes)}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>

                <section className="overflow-hidden rounded-[10px] border border-[#E9EBF0] bg-white">
                  <div className="border-b border-[#E9EBF0] px-5 py-3.5">
                    <h3 className="text-[15px] font-semibold text-[#2E3646]">
                      Siapa yang boleh melihat
                    </h3>
                    {/*
                      Desain menulis "Tag posisi dari HRIS." di baris ini.
                      Sejak changeset 47 kalimatnya akhirnya benar: sumbernya
                      memang HRIS, hanya lewat tiga sumbu dan bukan satu.
                    */}
                    <p className="mt-0.5 text-[13px] text-[#9CA3AF]">
                      {(d?.accessRules ?? []).length === 0
                        ? 'Terbuka untuk seluruh karyawan.'
                        : 'Hanya yang cocok dengan salah satu aturan di bawah yang bisa membuka dan mengunduh.'}
                    </p>
                  </div>

                  {(d?.accessRules ?? []).length > 0 ? (
                    <AccessRuleBadges rules={d?.accessRules ?? []} />
                  ) : null}
                </section>

                <div className="flex items-center justify-between gap-4 rounded-[10px] border border-[#E9EBF0] bg-white px-5 py-5">
                  <div>
                    <div className="text-[15px] font-semibold text-[#2E3646]">Total download</div>
                    <div className="mt-0.5 text-[13px] text-[#9CA3AF]">
                      Tercatat sejak dataset ini terbit.
                    </div>
                  </div>
                  <div className="text-[24px] sm:text-[30px] leading-none font-bold tracking-[-0.6px] text-[#2E3646]">
                    <CountUp value={d?.downloads ?? 0} format={formatNumber} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/**
 * Lencana aturan akses, dengan UUID sudah diterjemahkan jadi nama.
 *
 * Dipisah jadi komponen sendiri semata-mata karena butuh hook: panel induknya
 * merender daftar aturan di tengah pohon JSX, dan hook tidak bisa dipanggil di
 * sana.
 *
 * Ongkosnya satu permintaan daftar posisi (dipakai bersama seluruh halaman lewat
 * cache React Query) ditambah satu permintaan per karyawan yang ditunjuk.
 * Terjangkau karena panel ini hanya terbuka untuk SATU dataset. Kolom akses di
 * tabel di belakangnya sengaja tidak melakukan ini — di sana lima puluh baris
 * akan berarti lima puluh panggilan, dan yang ditampilkan cukup jumlahnya.
 */
function AccessRuleBadges({
  rules,
}: {
  rules: { ruleType?: string; ruleValue?: string }[]
}) {
  const cleaned = rules.filter(
    (rule): rule is { ruleType: string; ruleValue: string } =>
      Boolean(rule.ruleType && rule.ruleValue),
  )
  const nameOf = useAccessRuleNames(cleaned)

  return (
    <div className="flex flex-wrap gap-2 px-5 py-4">
      {cleaned.map((rule) => (
        <span
          key={`${rule.ruleType}:${rule.ruleValue}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F1F3F7] px-3.5 py-2 text-[14px] font-semibold text-[#3C4A56]"
        >
          <span className="text-[11px] font-bold text-[#9CA3AF]">
            {rule.ruleType === 'JOB_LEVEL'
              ? 'Jenjang'
              : rule.ruleType === 'POSITION'
                ? 'Posisi'
                : 'Karyawan'}
          </span>
          {nameOf(rule)}
        </span>
      ))}
    </div>
  )
}

function Card({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[10px] border border-[#E9EBF0] bg-white">
      <div className="flex items-center gap-2 border-b border-[#E9EBF0] px-5 py-3.5">
        {icon}
        <h3 className="text-[15px] font-semibold text-[#2E3646]">{title}</h3>
      </div>
      {children}
    </section>
  )
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-5 text-[14px] text-[#9CA3AF]">{children}</p>
}

function LoadingBlock() {
  return (
    <div className="flex flex-col gap-3.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-28 animate-pulse rounded-[10px] border border-[#E9EBF0] bg-white"
        />
      ))}
    </div>
  )
}
