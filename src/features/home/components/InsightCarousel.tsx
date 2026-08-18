import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { Reveal } from '@/shared/components/motion/Reveal'

import { MiniBars, MiniDonut, MiniLine } from './InsightCharts'

/**
 * Enam kartu Data Insight, persis daftar `insightItems` di berkas desain —
 * urutan, judul, warna, dan angka grafiknya.
 *
 * ⚠️ Angka pada grafik ini **milik desain, bukan dari database.** Keenam dataset
 * yang ditunjuk memang ada di katalog, tapi isinya masih metadata saja: tabel
 * `dataset_row` kosong untuk semuanya (hanya `penjualan-furnitur-2025` yang
 * punya 10.000 baris sungguhan). Begitu dataset-dataset ini diisi, grafik di
 * sini seharusnya beralih memakai `GET /api/v1/datasets/{slug}/summary` seperti
 * halaman detail — bentuk kartunya tidak perlu berubah.
 *
 * Slug-nya sengaja tidak dikarang: keenamnya cocok dengan `dataset.slug` di
 * database, sehingga kartu benar-benar membuka halaman detail yang ada.
 */
interface InsightItem {
  slug: string
  title: string
  color: string
  chart: ReactNode
}

const JINGGA = '#F97316'

const INSIGHTS: readonly InsightItem[] = [
  {
    slug: 'penjualan-bulanan',
    title: 'Kinerja Penjualan',
    color: '#1D4ED8',
    chart: (
      <MiniBars
        values={[70, 52, 38, 60, 44, 58]}
        colors={['#1D4ED8', JINGGA, '#1D4ED8', JINGGA, '#1D4ED8', JINGGA]}
      />
    ),
  },
  {
    slug: 'uptime-layanan',
    title: 'Uptime Layanan',
    color: '#7C3AED',
    chart: <MiniLine values={[96, 98, 97, 99, 98, 99.4, 99.1]} color="#7C3AED" />,
  },
  {
    slug: 'biaya-operasional',
    title: 'Biaya Operasional',
    color: '#BE123C',
    chart: (
      <MiniBars
        values={[40, 55, 48, 62, 58, 70]}
        colors={['#BE123C', JINGGA, '#BE123C', JINGGA, '#BE123C', JINGGA]}
      />
    ),
  },
  {
    slug: 'engagement-kampanye',
    title: 'Engagement Kampanye',
    color: '#A21CAF',
    chart: (
      <MiniDonut
        segments={[
          { value: 42, color: '#A21CAF' },
          { value: 28, color: JINGGA },
          { value: 18, color: '#0EA5A0' },
          { value: 12, color: '#FACC15' },
        ]}
      />
    ),
  },
  {
    slug: 'pelatihan-karyawan',
    title: 'Pelatihan Karyawan',
    color: '#B45309',
    chart: <MiniLine values={[40, 55, 60, 72, 80, 88]} color="#B45309" />,
  },
  {
    slug: 'utilisasi-sdm',
    title: 'Utilisasi Tim',
    color: '#0EA5A0',
    chart: (
      <MiniBars
        values={[60, 72, 55, 80, 68, 75]}
        colors={['#0EA5A0', JINGGA, '#0EA5A0', JINGGA, '#0EA5A0', JINGGA]}
      />
    ),
  },
] as const

/** Jarak satu kali tekan panah, sama dengan `scrollBy(±340)` di desain. */
const LANGKAH = 340

/**
 * Jeda animasi masuk. Nilai awalnya melanjutkan urutan hero — bilah statistik
 * mulai pada 560ms, jadi kartu pertama menyusul setelahnya. Hanya berlaku saat
 * kartu memang sudah terlihat sejak halaman dimuat; lihat `Reveal`.
 */
const JEDA_AWAL = 660
const JEDA_ANTAR = 70

export function InsightCarousel() {
  const rel = useRef<HTMLDivElement>(null)

  function geser(arah: -1 | 1) {
    rel.current?.scrollBy({ left: arah * LANGKAH, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <TombolGeser arah={-1} onClick={() => geser(-1)} />
      <TombolGeser arah={1} onClick={() => geser(1)} />

      <div
        ref={rel}
        className="flex snap-x snap-mandatory gap-[18px] overflow-x-auto px-0.5 pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {INSIGHTS.map((item, i) => (
          // Pembungkus Reveal-lah yang menjadi item flex, jadi ukuran dan
          // snap-nya pindah ke sini — kartu di dalamnya cukup mengisi penuh.
          <Reveal
            key={item.slug}
            delay={JEDA_AWAL + i * JEDA_ANTAR}
            className="shrink-0 basis-[300px] snap-start"
          >
            <Link
              to={paths.datasetDetail(item.slug)}
              className="border-line-200 hover:border-brand-border flex h-full flex-col gap-4 rounded-2xl border bg-white p-[22px] text-left shadow-[0_6px_20px_-12px_rgba(16,24,40,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-12px_rgba(16,24,40,0.28)]"
            >
              <div className="flex items-center gap-3.5">
                <AvatarInsight color={item.color} />
                <span className="text-ink-900 text-lg leading-[1.2] font-bold">{item.title}</span>
              </div>

              <div className="flex h-[130px] items-center justify-center rounded-[10px] border border-[#EEF1F5] bg-[#FBFCFE] p-2.5">
                {item.chart}
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  )
}

/** Lingkaran 52px berikon orang — `avatar()` di desain. */
function AvatarInsight({ color }: { color: string }) {
  return (
    <div
      className="flex size-[52px] shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      <svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={1.9}>
        <circle cx={12} cy={8} r={3.4} />
        <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
      </svg>
    </div>
  )
}

function TombolGeser({ arah, onClick }: { arah: -1 | 1; onClick: () => void }) {
  const Ikon = arah === -1 ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={arah === -1 ? 'Sebelumnya' : 'Berikutnya'}
      className={`border-line-200 text-ink-600 absolute top-1/2 z-[3] flex size-10 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-[0_4px_14px_-4px_rgba(16,24,40,0.2)] transition-colors hover:bg-[#F8FAFC] ${
        arah === -1 ? 'left-[-14px]' : 'right-[-14px]'
      }`}
    >
      <Ikon className="size-5" strokeWidth={2.4} />
    </button>
  )
}
