import { ChevronLeft, ChevronRight, User } from 'lucide-react'
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

const ORANGE = '#F97316'

const INSIGHTS: readonly InsightItem[] = [
  {
    slug: 'penjualan-bulanan',
    title: 'Kinerja Penjualan',
    color: '#1D4ED8',
    chart: (
      <MiniBars
        values={[70, 52, 38, 60, 44, 58]}
        colors={['#1D4ED8', ORANGE, '#1D4ED8', ORANGE, '#1D4ED8', ORANGE]}
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
        colors={['#BE123C', ORANGE, '#BE123C', ORANGE, '#BE123C', ORANGE]}
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
          { value: 28, color: ORANGE },
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
        colors={['#0EA5A0', ORANGE, '#0EA5A0', ORANGE, '#0EA5A0', ORANGE]}
      />
    ),
  },
] as const

/** Jarak satu kali tekan panah, sama dengan `scrollBy(±340)` di desain. */
const STEP_PX = 340

/**
 * Jeda animasi masuk. Nilai awalnya melanjutkan urutan hero — bilah statistik
 * mulai pada 560ms, jadi kartu pertama menyusul setelahnya. Hanya berlaku saat
 * kartu memang sudah terlihat sejak halaman dimuat; lihat `Reveal`.
 */
const FIRST_DELAY = 660
const SLIDE_GAP = 70

export function InsightCarousel() {
  const rel = useRef<HTMLDivElement>(null)

  function scrollBy(direction: -1 | 1) {
    rel.current?.scrollBy({ left: direction * STEP_PX, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <ScrollButton direction={-1} onClick={() => scrollBy(-1)} />
      <ScrollButton direction={1} onClick={() => scrollBy(1)} />

      <div
        ref={rel}
        className="flex snap-x snap-mandatory gap-[18px] overflow-x-auto px-0.5 pt-1 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {INSIGHTS.map((item, i) => (
          // Pembungkus Reveal-lah yang menjadi item flex, jadi ukuran dan
          // snap-nya pindah ke sini — kartu di dalamnya cukup mengisi penuh.
          <Reveal
            key={item.slug}
            delay={FIRST_DELAY + i * SLIDE_GAP}
            className="shrink-0 basis-[300px] snap-start"
          >
            <Link
              to={paths.datasetDetail(item.slug)}
              className="border-line-200 hover:border-brand-border flex h-full flex-col gap-4 rounded-2xl border bg-white p-[22px] text-left shadow-[0_6px_20px_-12px_rgba(16,24,40,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_-12px_rgba(16,24,40,0.28)]"
            >
              <div className="flex items-center gap-3.5">
                <InsightAvatar color={item.color} />
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
function InsightAvatar({ color }: { color: string }) {
  return (
    <div
      className="flex size-[52px] shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      <User className="size-[26px] text-white" strokeWidth={1.9} aria-hidden />
    </div>
  )
}

function ScrollButton({ direction, onClick }: { direction: -1 | 1; onClick: () => void }) {
  const Icon = direction === -1 ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === -1 ? 'Sebelumnya' : 'Berikutnya'}
      /*
        Disembunyikan di ponsel. Tombolnya menjorok 14px ke luar wadah — di
        layar lebar itu jatuh di margin, tapi pada layar sempit ia menempel ke
        tepi dan menutupi kartu. Lagi pula tidak ada yang hilang: di perangkat
        sentuh carousel-nya digeser dengan jari, bukan ditekan tombolnya.
      */
      className={`border-line-200 text-ink-600 absolute top-1/2 z-[3] hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border bg-white shadow-[0_4px_14px_-4px_rgba(16,24,40,0.2)] transition-colors hover:bg-[#F8FAFC] sm:flex ${
        direction === -1 ? 'left-[-14px]' : 'right-[-14px]'
      }`}
    >
      <Icon className="size-5" strokeWidth={2.4} />
    </button>
  )
}
