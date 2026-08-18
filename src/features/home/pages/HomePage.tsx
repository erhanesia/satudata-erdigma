import { Link } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { useDivisions } from '@/features/division/hooks/useDivisions'
import { useDatasets, useTopics } from '@/features/dataset/hooks/useDatasets'
import { useStats } from '@/features/stats/hooks/useStats'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { CountUp } from '@/shared/components/motion/CountUp'
import { Reveal } from '@/shared/components/motion/Reveal'
import { DivisionAvatar } from '@/shared/components/ui/DivisionAvatar'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { formatCompact, formatRelative } from '@/shared/lib/format'

import { HeroSearch } from '../components/HeroSearch'
import { InsightCarousel } from '../components/InsightCarousel'
import { TopicIcon } from '../components/TopicIcon'

/**
 * Beranda.
 *
 * Urutan bagian dan seluruh nilai tata letaknya mengikuti berkas desain:
 * hero → bilah statistik → Data Insight → Dataset terbaru → Divisi teratas →
 * kartu fitur. Tiap bagian membawa `max-width` dan padding-nya sendiri, sama
 * seperti di desain, jadi tidak dibungkus satu wadah bersama.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <StatStrip />
      <DataInsight />
      <DatasetTerbaru />
      <DivisiTeratas />
      <Fitur />
    </>
  )
}

/** Jarak mulai animasi masuk, dalam milidetik. */
function jeda(ms: number) {
  return { animationDelay: `${ms}ms` }
}

/**
 * Selang antar kartu dalam satu kisi.
 *
 * Cukup terasa sebagai urutan, cukup singkat supaya kartu terakhir tidak
 * tertinggal jauh. Nilainya sejalan dengan stagger chip di hero (45ms), hanya
 * sedikit lebih longgar karena kartunya jauh lebih besar.
 */
const JEDA_KARTU = 70

/**
 * Saat bilah statistik mulai masuk — dan sekaligus saat angkanya mulai
 * berhitung naik. Satu nilai untuk keduanya supaya kartu dan isinya tidak
 * pernah bergerak sendiri-sendiri.
 */
const JEDA_BILAH_STATISTIK = 560

/**
 * Hero beranda.
 *
 * Ukuran, warna, dan jarak diambil apa adanya dari berkas ekspor desain:
 * lebar isi 900px, judul clamp(40px,7vw,84px) dengan tracking −2.5px dan
 * line-height 0.98, baris kedua #98A2B3.
 */
function Hero() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-[900px] px-5 pt-[72px] pb-[60px] text-center">
        <h1 className="mb-[26px] text-[clamp(40px,7vw,84px)] leading-[0.98] font-extrabold tracking-[-2.5px]">
          <span className="animate-rise text-ink-900 block" style={jeda(0)}>
            Portal data
          </span>
          <span className="animate-rise block text-[#98A2B3]" style={jeda(90)}>
            internal Erdigma
          </span>
        </h1>

        <p
          className="animate-rise text-ink-700 mx-auto mb-[30px] max-w-[620px] text-[clamp(16px,1.8vw,21px)] font-semibold"
          style={jeda(200)}
        >
          Jelajahi data antar-divisi dan akses API untuk kebutuhan analitik &amp; pengembangan.
        </p>

        <div className="animate-rise" style={jeda(300)}>
          <HeroSearch />
        </div>

        <ChipTopik />
      </div>
    </section>
  )
}

/** Pintasan bertopik di bawah kotak pencarian. */
function ChipTopik() {
  const { data: topics, isPending } = useTopics()

  if (isPending) {
    return (
      <div className="mx-auto mt-[34px] flex max-w-[760px] flex-wrap justify-center gap-3">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-[45px] w-36 rounded-full" />
        ))}
      </div>
    )
  }

  const daftar = [
    ...(topics ?? []).map((t) => ({
      nama: t.name ?? '',
      ke: `${paths.datasets}?topics=${encodeURIComponent(t.name ?? '')}`,
    })),
    // Chip terakhir bukan topik dari database, melainkan pintasan ke
    // dokumentasi API — sama seperti pada desain.
    { nama: 'Real-time APIs', ke: paths.apiDocs },
  ]

  return (
    <div className="mx-auto mt-[34px] flex max-w-[760px] flex-wrap items-center justify-center gap-3">
      {daftar.map((item, i) => (
        <Link
          key={item.nama}
          to={item.ke}
          style={jeda(420 + i * 45)}
          className="animate-rise border-line-200 text-ink-900 hover:border-brand-border hover:bg-brand-tint inline-flex items-center gap-[9px] rounded-full border bg-white px-5 py-[11px] text-[15px] font-bold shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-8px_rgba(16,24,40,0.25)]"
        >
          <TopicIcon name={item.nama} />
          {item.nama}
        </Link>
      ))}
    </div>
  )
}

/**
 * Bilah statistik.
 *
 * Garis pemisahnya bukan border tiap sel, melainkan `gap: 1px` di atas latar
 * abu — trik dari desain yang membuat sekat tetap rapi berapa pun jumlah kolom
 * yang muat.
 */
function StatStrip() {
  const query = useStats()

  return (
    <section className="mx-auto max-w-[1200px] px-5 py-11">
      <QueryBoundary
        query={query}
        loading={<Skeleton className="animate-fade h-[120px] w-full rounded-2xl" />}
      >
        {(stats) => {
          const sel = [
            {
              nilai: stats.totalDataset,
              label: 'Total Data Set',
              sub: `lintas ${stats.totalTopic ?? 0} topik`,
            },
            { nilai: stats.totalFormat, label: 'Jenis Data', sub: 'CSV · XLSX · GEOJSON · KML · API' },
            { nilai: stats.totalDivision, label: 'Total Kontributor', sub: 'divisi kontributor' },
            { nilai: stats.totalTopic, label: 'Topik Data', sub: 'kategori tematik' },
            // Sel kelima mengikuti desain. Sempat terpaksa berbunyi 'Panggilan
            // API' karena portal tidak menghitung kunjungan sama sekali; sejak
            // changeset 00023 angkanya ada sungguhan — tiap pembukaan halaman
            // detail dataset menaikkan penghitungnya.
            { nilai: stats.totalViews, label: 'Total Views', sub: 'kunjungan halaman dataset' },
            { nilai: stats.totalDownloads, label: 'Total Unduhan', sub: 'akumulatif' },
          ]

          return (
            <div
              className="animate-rise bg-line-200 border-line-200 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-px overflow-hidden rounded-2xl border"
              style={jeda(JEDA_BILAH_STATISTIK)}
            >
              {sel.map((s) => (
                <div key={s.label} className="bg-white px-[22px] py-6">
                  {/* `tabular-nums` menyamakan lebar tiap digit. Tanpa itu angka
                      yang sedang berhitung bergoyang ke kiri-kanan tiap bingkai,
                      karena "1" jauh lebih sempit daripada "8". */}
                  <div className="text-ink-900 text-[clamp(24px,2.4vw,32px)] font-extrabold tracking-[-1px] tabular-nums">
                    <CountUp value={s.nilai} format={formatCompact} delay={JEDA_BILAH_STATISTIK} />
                  </div>
                  <div className="text-ink-600 mt-[3px] text-[13.5px] font-semibold">{s.label}</div>
                  <div className="text-ink-400 mt-0.5 text-xs">{s.sub}</div>
                </div>
              ))}
            </div>
          )
        }}
      </QueryBoundary>
    </section>
  )
}

function DataInsight() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 pt-6 pb-5">
      {/* 600ms melanjutkan urutan hero: bilah statistik mulai pada 560ms. */}
      <SectionHeading title="Data Insight" ke={paths.datasets} label="Lihat semua" delay={600} />
      <InsightCarousel />
    </section>
  )
}

function DatasetTerbaru() {
  const query = useDatasets({ sort: 'updated', page: 0, size: 4 })

  return (
    <section className="mx-auto max-w-[1200px] px-5 pt-2 pb-5">
      <SectionHeading title="Dataset terbaru" ke={paths.datasets} label="Lihat semua" />

      <QueryBoundary query={query} loading={<KisiSkeleton tinggi="h-[150px]" minKolom={300} />}>
        {(page) => (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
            {page.content?.map((dataset, i) => (
              <Reveal key={dataset.id} delay={i * JEDA_KARTU}>
                <Link
                  to={paths.datasetDetail(dataset.slug ?? '')}
                  className="border-line-200 hover:border-brand-border flex h-full flex-col gap-2.5 rounded-[14px] border bg-white p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(16,24,40,0.28)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-brand bg-brand-tint rounded-md px-[9px] py-[3px] text-xs font-bold">
                      {dataset.division?.code}
                    </span>
                    <span className="text-success bg-success-bg rounded-md px-[9px] py-[3px] text-xs font-bold">
                      Baru
                    </span>
                  </div>

                  <div className="text-ink-900 text-base leading-[1.3] font-bold">
                    {dataset.title}
                  </div>

                  <div className="text-ink-500 mt-auto flex flex-wrap gap-2 text-[12.5px]">
                    <span>Diperbarui {formatRelative(dataset.lastUpdatedAt, dataset.realtime)}</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </QueryBoundary>
    </section>
  )
}

function DivisiTeratas() {
  const query = useDivisions()

  return (
    <section className="mx-auto max-w-[1200px] px-5 py-7">
      <SectionHeading title="Divisi teratas" ke={paths.divisions} label="Lihat semua divisi" />

      <QueryBoundary query={query} loading={<KisiSkeleton tinggi="h-[84px]" minKolom={280} />}>
        {(divisions) => (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
            {divisions.slice(0, 4).map((divisi, i) => (
              <Reveal key={divisi.id} delay={i * JEDA_KARTU}>
                <Link
                  to={`${paths.datasets}?divisions=${encodeURIComponent(divisi.code ?? '')}`}
                  className="border-line-200 hover:border-brand-border flex h-full items-center gap-3.5 rounded-[14px] border bg-white p-[18px] text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(16,24,40,0.28)]"
                >
                  <DivisionAvatar
                    code={divisi.code}
                    logoBg={divisi.logoBg}
                    className="size-12 rounded-[11px] text-[15px] font-extrabold"
                  />
                  <div className="min-w-0">
                    <div className="text-ink-900 text-[14.5px] leading-[1.25] font-bold">
                      {divisi.name}
                    </div>
                    <div className="text-ink-500 mt-1 text-[12.5px]">
                      {formatCompact(divisi.apiCalls)} API calls ·{' '}
                      {formatCompact(divisi.downloads)} unduhan
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </QueryBoundary>
    </section>
  )
}

/**
 * Kartu fitur.
 *
 * Ikonnya jalur SVG asli dari desain, bukan padanan dari lucide — bentuk yang
 * mirip-tapi-tidak-sama langsung terlihat saat ketiganya berjejer.
 */
const FITUR = [
  {
    jalur: 'M12 3v12m0 0 4-4m-4 4-4-4M4 21h16',
    judul: 'Akses & unduh data',
    teks: 'Unduh dataset lengkap dalam CSV, XLSX, GEOJSON, atau KML.',
    cta: 'Jelajahi datasets',
    ke: paths.datasets,
  },
  {
    jalur: 'M4 19V9M10 19V4M16 19v-7M22 19H2',
    judul: 'Chart interaktif real-time',
    teks: 'Visualisasikan dan bandingkan data langsung di browser.',
    cta: 'Lihat contoh',
    ke: paths.datasetDetail('penjualan-furnitur-2025'),
  },
  {
    jalur: 'M4 6h16M4 12h16M4 18h10',
    judul: 'Data lintas divisi',
    teks: 'Temukan dan gabungkan data dari 8 divisi dalam satu katalog.',
    cta: 'Lihat divisi',
    ke: paths.divisions,
  },
] as const

function Fitur() {
  return (
    <section className="bg-surface border-line-200 border-t border-b">
      <div className="mx-auto max-w-[1200px] px-5 py-[52px]">
        <Reveal className="mb-[30px]">
          <h2 className="text-ink-900 mb-2 text-[26px] font-extrabold tracking-[-0.7px]">
            Semua yang Anda butuhkan untuk memakai data
          </h2>
          <p className="text-ink-500 text-base">
            Dari eksplorasi cepat hingga integrasi skala produksi.
          </p>
        </Reveal>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-[18px]">
          {FITUR.map(({ jalur, judul, teks, cta, ke }, i) => (
            <Reveal
              key={judul}
              delay={i * JEDA_KARTU}
              className="border-line-200 h-full rounded-[14px] border bg-[#FBFCFE] p-6"
            >
              <div className="bg-brand-tint mb-3.5 flex size-[42px] items-center justify-center rounded-[11px]">
                <svg
                  width={20}
                  height={20}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#1B54C4"
                  strokeWidth={2.2}
                  aria-hidden
                >
                  <path d={jalur} />
                </svg>
              </div>

              <div className="text-ink-900 mb-1.5 text-[16.5px] font-bold">{judul}</div>
              <p className="text-ink-500 mb-3 text-sm leading-[1.5]">{teks}</p>

              <Link to={ke} className="text-brand text-sm font-bold">
                {cta} →
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Judul bagian beserta tombol "Lihat semua".
 *
 * Di desain tombol itu bergaya kotak putih bergaris, bukan tautan biru —
 * bedanya kentara karena ia muncul di empat bagian sekaligus.
 */
function SectionHeading({
  title,
  ke,
  label,
  delay = 0,
}: {
  title: string
  ke: string
  label: string
  delay?: number
}) {
  return (
    <Reveal delay={delay} className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-ink-900 text-[23px] font-extrabold tracking-[-0.6px]">{title}</h2>
      <Link
        to={ke}
        className="border-line-300 text-ink-900 hover:bg-surface-100 rounded-lg border bg-white px-4 py-[9px] text-sm font-semibold transition-colors"
      >
        {label} →
      </Link>
    </Reveal>
  )
}

function KisiSkeleton({ tinggi, minKolom }: { tinggi: string; minKolom: number }) {
  return (
    <div
      className="grid gap-3.5"
      style={{ gridTemplateColumns: `repeat(auto-fill,minmax(${minKolom}px,1fr))` }}
    >
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className={`${tinggi} rounded-[14px]`} />
      ))}
    </div>
  )
}
