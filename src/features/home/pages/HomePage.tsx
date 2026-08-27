import { AlignLeft, BarChart3, Download } from 'lucide-react'
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
 * Data Insight dimatikan sementara. Dua alasan, dan yang kedua terlihat
 * pengguna.
 *
 * **Tumpang tindih.** Isinya sama dengan "Dataset terbaru" tepat di bawahnya —
 * keduanya daftar pintasan ke dataset, hanya beda bentuk.
 *
 * **Angkanya bukan data.** Keenam kartu di `InsightCarousel` adalah konstanta
 * yang ditulis tangan: judul, warna, dan setiap nilai grafiknya, tanpa satu pun
 * permintaan ke back-end. Slug tujuannya dibuat changeset 9, yang kini berpagar
 * `contextFilter: dev`. Di produksi kartunya tetap tergambar penuh sementara
 * datasetnya tidak ada, dan setiap klik berujung 404 — enam grafik yang bukan
 * milik siapa-siapa, tepat di sebelah bilah statistik yang jujur menyebut nol
 * dataset.
 *
 * Sengaja saklar, bukan kode yang dikomentari: `DataInsightSection` dan
 * `InsightCarousel` tetap ikut diperiksa compiler dan linter, jadi tidak
 * diam-diam membusuk sampai suatu hari mau dihidupkan lagi.
 *
 * Untuk menghidupkannya kembali, ubah nilai ini menjadi `true` — tetapi
 * sebaiknya setelah diputuskan seksi ini menampilkan apa: grafik dari data
 * sungguhan lewat `GET /api/v1/datasets/{slug}/summary`, atau dibuang karena
 * "Dataset terbaru" sudah menjawab kebutuhan yang sama.
 */
const SHOW_DATA_INSIGHT = false

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
      {SHOW_DATA_INSIGHT ? <DataInsightSection /> : null}
      <LatestDatasets />
      <TopDivisions />
      <FeatureSection />
    </>
  )
}

/** Jarak mulai animasi masuk, dalam milidetik. */
function delay(ms: number) {
  return { animationDelay: `${ms}ms` }
}

/**
 * Selang antar kartu dalam satu kisi.
 *
 * Cukup terasa sebagai urutan, cukup singkat supaya kartu terakhir tidak
 * tertinggal jauh. Nilainya sejalan dengan stagger chip di hero (45ms), hanya
 * sedikit lebih longgar karena kartunya jauh lebih besar.
 */
const CARD_DELAY = 70

/**
 * Saat bilah statistik mulai masuk — dan sekaligus saat angkanya mulai
 * berhitung naik. Satu nilai untuk keduanya supaya kartu dan isinya tidak
 * pernah bergerak sendiri-sendiri.
 */
const STAT_STRIP_DELAY = 560

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
      <div className="mx-auto max-w-[900px] px-4 pt-12 pb-10 text-center sm:px-5 sm:pt-[72px] sm:pb-[60px]">
        <h1 className="mb-[26px] text-[clamp(40px,7vw,84px)] leading-[0.98] font-extrabold tracking-[-2.5px]">
          <span className="animate-rise text-ink-900 block" style={delay(0)}>
            Portal data
          </span>
          <span className="animate-rise block text-[#98A2B3]" style={delay(90)}>
            internal Erdigma
          </span>
        </h1>

        <p
          className="animate-rise text-ink-700 mx-auto mb-[30px] max-w-[620px] text-[clamp(16px,1.8vw,21px)] font-semibold"
          style={delay(200)}
        >
          Jelajahi data antar-divisi dan akses API untuk kebutuhan analitik &amp; pengembangan.
        </p>

        <div className="animate-rise" style={delay(300)}>
          <HeroSearch />
        </div>

        <TopicChip />
      </div>
    </section>
  )
}

/** Pintasan bertopik di bawah kotak pencarian. */
function TopicChip() {
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

  const items = [
    ...(topics ?? []).map((t) => ({
      name: t.name ?? '',
      to: `${paths.datasets}?topics=${encodeURIComponent(t.name ?? '')}`,
    })),
  ]

  return (
    <div className="mx-auto mt-[34px] flex max-w-[760px] flex-wrap items-center justify-center gap-3">
      {items.map((item, i) => (
        <Link
          key={item.name}
          to={item.to}
          style={delay(420 + i * 45)}
          className="animate-rise border-line-200 text-ink-900 hover:border-brand-border hover:bg-brand-tint inline-flex items-center gap-[9px] rounded-full border bg-white px-5 py-[11px] text-[15px] font-bold shadow-[0_1px_2px_rgba(16,24,40,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_-8px_rgba(16,24,40,0.25)]"
        >
          <TopicIcon name={item.name} />
          {item.name}
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
    <section className="mx-auto max-w-[1200px] px-4 py-8 sm:px-5 sm:py-11">
      <QueryBoundary
        query={query}
        loading={<Skeleton className="animate-fade h-[120px] w-full rounded-2xl" />}
      >
        {(stats) => {
          const cell = [
            {
              value: stats.totalDataset,
              label: 'Total Data Set',
              sub: `lintas ${stats.totalTopic ?? 0} topik`,
            },
            { value: stats.totalFormat, label: 'Jenis Data', sub: 'CSV · XLSX · PDF · DOCX' },
            { value: stats.totalDivision, label: 'Total Kontributor', sub: 'divisi kontributor' },
            { value: stats.totalTopic, label: 'Topik Data', sub: 'kategori tematik' },
            // Sel kelima mengikuti desain. Sempat terpaksa berbunyi 'Panggilan
            // API' karena portal tidak menghitung kunjungan sama sekali; sejak
            // changeset 00023 angkanya ada sungguhan — tiap pembukaan halaman
            // detail dataset menaikkan penghitungnya.
            { value: stats.totalViews, label: 'Total Views', sub: 'kunjungan halaman dataset' },
            { value: stats.totalDownloads, label: 'Total Unduhan', sub: 'akumulatif' },
          ]

          return (
            <div
              className="animate-rise bg-line-200 border-line-200 grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-px overflow-hidden rounded-2xl border"
              style={delay(STAT_STRIP_DELAY)}
            >
              {cell.map((s) => (
                <div key={s.label} className="bg-white px-4 py-5 sm:px-[22px] sm:py-6">
                  {/* `tabular-nums` menyamakan lebar tiap digit. Tanpa itu angka
                      yang sedang berhitung bergoyang ke kiri-kanan tiap bingkai,
                      karena "1" jauh lebih sempit daripada "8". */}
                  <div className="text-ink-900 text-[clamp(24px,2.4vw,32px)] font-extrabold tracking-[-1px] tabular-nums">
                    <CountUp value={s.value} format={formatCompact} delay={STAT_STRIP_DELAY} />
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

function DataInsightSection() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 pt-6 pb-5 sm:px-5">
      {/* 600ms melanjutkan urutan hero: bilah statistik mulai pada 560ms. */}
      <SectionHeading title="Data Insight" to={paths.datasets} label="Lihat semua" delay={600} />
      <InsightCarousel />
    </section>
  )
}

function LatestDatasets() {
  const query = useDatasets({ sort: 'updated', page: 0, size: 4 })

  return (
    <section className="mx-auto max-w-[1200px] px-4 pt-2 pb-5 sm:px-5">
      <SectionHeading title="Dataset terbaru" to={paths.datasets} label="Lihat semua" />

      <QueryBoundary query={query} loading={<GridSkeleton height="h-[150px]" minColumns={300} />}>
        {(page) => (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-3.5">
            {page.content?.map((dataset, i) => (
              <Reveal key={dataset.id} delay={i * CARD_DELAY}>
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

function TopDivisions() {
  const query = useDivisions()

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-7 sm:px-5">
      <SectionHeading title="Divisi teratas" to={paths.divisions} label="Lihat semua divisi" />

      <QueryBoundary query={query} loading={<GridSkeleton height="h-[84px]" minColumns={280} />}>
        {(divisions) => (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3.5">
            {divisions.slice(0, 4).map((division, i) => (
              <Reveal key={division.id} delay={i * CARD_DELAY}>
                <Link
                  to={`${paths.datasets}?divisions=${encodeURIComponent(division.code ?? '')}`}
                  className="border-line-200 hover:border-brand-border flex h-full items-center gap-3.5 rounded-[14px] border bg-white p-[18px] text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(16,24,40,0.28)]"
                >
                  <DivisionAvatar
                    code={division.code}
                    logoBg={division.logoBg}
                    className="size-12 rounded-[11px] text-[15px] font-extrabold"
                  />
                  <div className="min-w-0">
                    <div className="text-ink-900 text-[14.5px] leading-[1.25] font-bold">
                      {division.name}
                    </div>
                    <div className="text-ink-500 mt-1 text-[12.5px]">
                      {formatCompact(division.downloads)} unduhan
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
 * Ikonnya dari lucide, bukan jalur SVG yang ditulis sendiri. Bentuknya memang
 * tidak identik dengan ekspor desain, tapi bedanya sebatas ketebalan garis —
 * dan itu jauh lebih murah daripada tiga jalur mentah yang harus dirawat.
 */
const FEATURES = [
  {
    Icon: Download,
    title: 'Akses & unduh data',
    text: 'Unduh dataset lengkap dalam CSV, XLSX, GEOJSON, atau KML.',
    cta: 'Jelajahi datasets',
    to: paths.datasets,
  },
  {
    Icon: BarChart3,
    title: 'Chart interaktif real-time',
    text: 'Visualisasikan dan bandingkan data langsung di browser.',
    cta: 'Lihat contoh',
    to: paths.datasetDetail('penjualan-furnitur-2025'),
  },
  {
    Icon: AlignLeft,
    title: 'Data lintas divisi',
    text: 'Temukan dan gabungkan data dari 8 divisi dalam satu katalog.',
    cta: 'Lihat divisi',
    to: paths.divisions,
  },
] as const

function FeatureSection() {
  return (
    <section className="bg-surface border-line-200 border-t border-b">
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-5 sm:py-[52px]">
        <Reveal className="mb-[30px]">
          <h2 className="text-ink-900 mb-2 text-[21px] font-extrabold tracking-[-0.7px] sm:text-[26px]">
            Semua yang Anda butuhkan untuk memakai data
          </h2>
          <p className="text-ink-500 text-base">
            Dari eksplorasi cepat hingga integrasi skala produksi.
          </p>
        </Reveal>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-[18px]">
          {FEATURES.map(({ Icon, title, text, cta, to }, i) => (
            <Reveal
              key={title}
              delay={i * CARD_DELAY}
              className="border-line-200 h-full rounded-[14px] border bg-[#FBFCFE] p-6"
            >
              <div className="bg-brand-tint mb-3.5 flex size-[42px] items-center justify-center rounded-[11px]">
                <Icon size={20} color="#1B54C4" strokeWidth={2.2} aria-hidden />
              </div>

              <div className="text-ink-900 mb-1.5 text-[16.5px] font-bold">{title}</div>
              <p className="text-ink-500 mb-3 text-sm leading-[1.5]">{text}</p>

              <Link to={to} className="text-brand text-sm font-bold">
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
  to,
  label,
  delay = 0,
}: {
  title: string
  to: string
  label: string
  delay?: number
}) {
  return (
    <Reveal delay={delay} className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-ink-900 text-[19px] font-extrabold tracking-[-0.6px] sm:text-[23px]">{title}</h2>
      <Link
        to={to}
        className="border-line-300 text-ink-900 hover:bg-surface-100 rounded-lg border bg-white px-4 py-[9px] text-sm font-semibold transition-colors"
      >
        {label} →
      </Link>
    </Reveal>
  )
}

function GridSkeleton({ height, minColumns }: { height: string; minColumns: number }) {
  return (
    <div
      className="grid gap-3.5"
      style={{ gridTemplateColumns: `repeat(auto-fill,minmax(min(100%,${minColumns}px),1fr))` }}
    >
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className={`${height} rounded-[14px]`} />
      ))}
    </div>
  )
}
