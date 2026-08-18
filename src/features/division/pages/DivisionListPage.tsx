import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { Reveal } from '@/shared/components/motion/Reveal'
import { DivisionAvatar } from '@/shared/components/ui/DivisionAvatar'
import { SearchField } from '@/shared/components/ui/SearchField'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { formatCompact } from '@/shared/lib/format'

import { useDivisions } from '../hooks/useDivisions'

/** Selang antar kartu, sama dengan kisi di beranda dan katalog. */
const JEDA_KARTU = 70

/**
 * Daftar divisi kontributor.
 *
 * Urutannya datang dari server dan memang menurun berdasarkan panggilan API —
 * sesuai keterangan di desain, "diurutkan berdasarkan aktivitas data". Tidak
 * ada pengurutan ulang di sini.
 */
export default function DivisionListPage() {
  const query = useDivisions()
  const [cari, setCari] = useState('')

  const hasil = useMemo(() => {
    const kunci = cari.trim().toLowerCase()
    if (!kunci) return query.data ?? []
    // Penyaringan di klien wajar di sini: jumlah divisi hanya belasan dan
    // seluruhnya sudah ada di memori. Tidak perlu bolak-balik ke server.
    return (query.data ?? []).filter(
      (d) =>
        (d.name ?? '').toLowerCase().includes(kunci) ||
        (d.code ?? '').toLowerCase().includes(kunci),
    )
  }, [query.data, cari])

  return (
    <div className="mx-auto max-w-[1200px] px-5 pt-7 pb-[60px]">
      <Reveal>
        <h1 className="text-ink-900 mb-1.5 text-[28px] font-extrabold tracking-[-0.8px]">Divisi</h1>

        <p className="text-ink-500 mb-5 text-[15px]">
          {/* Jumlah keseluruhan, bukan jumlah hasil pencarian — kalimat ini
              menerangkan portalnya, bukan isi layar saat itu. */}
          <b className="text-ink-900">{query.data?.length ?? 0}</b> divisi kontributor · diurutkan
          berdasarkan aktivitas data (6 bulan terakhir)
        </p>

        <SearchField
          value={cari}
          onChange={setCari}
          placeholder="Cari nama atau akronim divisi…"
          label="Cari divisi"
          className="mb-[22px] max-w-[420px]"
          inputClassName="py-3"
        />
      </Reveal>

      <QueryBoundary query={query} loading={<KisiSkeleton />}>
        {() =>
          hasil.length === 0 ? (
            <TidakAdaHasil onBersihkan={() => setCari('')} />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
              {hasil.map((divisi, i) => (
                <Reveal key={divisi.id} delay={i * JEDA_KARTU}>
                  <Link
                    to={`${paths.datasets}?divisions=${encodeURIComponent(divisi.code ?? '')}`}
                    className="border-line-200 bg-surface hover:border-brand-border flex h-full flex-col gap-3.5 rounded-[14px] border p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(16,24,40,0.28)]"
                  >
                    <div className="flex items-center gap-[13px]">
                      <DivisionAvatar
                        code={divisi.code}
                        logoBg={divisi.logoBg}
                        className="size-[52px] rounded-xl text-base font-extrabold"
                      />
                      <div className="min-w-0">
                        <h2 className="text-ink-900 text-[15px] leading-[1.25] font-bold">
                          {divisi.name}
                        </h2>
                        <div className="text-ink-400 mt-0.5 text-[12.5px]">{divisi.code}</div>
                      </div>
                    </div>

                    <dl className="border-line-100 flex gap-5 border-t pt-3">
                      <Statistik nilai={divisi.apiCalls} label="API calls" />
                      <Statistik nilai={divisi.downloads} label="unduhan" />
                    </dl>
                  </Link>
                </Reveal>
              ))}
            </div>
          )
        }
      </QueryBoundary>
    </div>
  )
}

function Statistik({ nilai, label }: { nilai: number | undefined; label: string }) {
  return (
    <div>
      <dd className="text-ink-900 text-[17px] font-extrabold">{formatCompact(nilai)}</dd>
      <dt className="text-ink-400 text-xs">{label}</dt>
    </div>
  )
}

/**
 * Desain tidak menyiapkan tampilan "tidak ada hasil" untuk halaman ini — di
 * prototipe kotak pencariannya selalu menemukan sesuatu. Bentuknya dipinjam
 * dari kartu kosong halaman Datasets, yang memang ada di desain, supaya tidak
 * ada bahasa visual baru yang muncul entah dari mana.
 */
function TidakAdaHasil({ onBersihkan }: { onBersihkan: () => void }) {
  return (
    <div className="border-line-300 bg-surface rounded-[14px] border border-dashed px-6 py-14 text-center">
      <div className="mb-2.5 text-[40px]" aria-hidden>
        🔍
      </div>
      <div className="text-ink-900 mb-1.5 text-[17px] font-bold">Divisi tidak ditemukan</div>
      <p className="text-ink-500 mb-[18px] text-sm">
        Coba kata kunci lain, atau kosongkan kotak pencarian.
      </p>
      <button
        type="button"
        onClick={onBersihkan}
        className="bg-brand hover:bg-brand-hover rounded-[9px] px-5 py-[11px] text-sm font-bold text-white transition-colors"
      >
        Kosongkan pencarian
      </button>
    </div>
  )
}

function KisiSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-[148px] rounded-[14px]" />
      ))}
    </div>
  )
}
