import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { formatCompact, formatNumber } from '@/shared/lib/format'

interface Point {
  date?: string
  total?: number
}

interface DownloadChartProps {
  data: Point[]
  loading: boolean
  failed: boolean
}

/**
 * Kurva unduhan harian pada dasbor admin.
 *
 * Berkas desain menggambar SVG sendiri; di sini dipakai recharts, pustaka yang
 * sudah ada di proyek dan menjadi dasar grafik halaman detail dataset. Alasannya
 * bukan sekadar konsistensi: kurva 30 titik tanpa tooltip hanya memberi bentuk,
 * sedangkan yang biasanya ingin diketahui orang justru "hari apa yang tinggi
 * itu, dan berapa persisnya".
 */
export function DownloadChart({ data, loading, failed }: DownloadChartProps) {
  if (loading) {
    return <div className="h-[240px] animate-pulse rounded-lg bg-[#F1F3F7]" />
  }

  if (failed) {
    return (
      <div className="flex h-[240px] items-center justify-center text-[14px] text-[#B4231B]">
        Grafik gagal dimuat.
      </div>
    )
  }

  const hasContent = data.some((d) => (d.total ?? 0) > 0)
  if (!hasContent) {
    return (
      <div className="flex h-[240px] flex-col items-center justify-center gap-1.5 px-6 text-center">
        <p className="text-[15px] font-semibold text-[#3C4A56]">
          Belum ada unduhan dalam 30 hari terakhir
        </p>
        <p className="text-[13.5px] text-[#9CA3AF]">
          Grafiknya kosong karena memang belum ada yang mengunduh — bukan karena gagal dimuat.
        </p>
      </div>
    )
  }

  const points = data.map((d) => ({
    date: d.date ?? '',
    label: dayLabel(d.date),
    total: d.total ?? 0,
  }))

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid stroke="#E9EBF0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E9EBF0' }}
            // Tiga puluh label tidak muat berdampingan; recharts akan
            // menyembunyikan sebagian sendiri, tapi jaraknya jadi tidak rata.
            // Menampilkan tiap hari kelima membuat sumbunya terbaca sekaligus
            // tetap memperlihatkan rentangnya.
            /*
              Tiga puluh label tidak pernah muat berdampingan, jadi sebagian
              harus disembunyikan. Yang menentukan berapa banyak adalah lebar
              layar, bukan angka tetap.

              Dulu di sini interval={4}, yang memaksa enam label pada lebar
              berapa pun. Di layar 360px area gambarnya tinggal sekitar 224px
              setelah dikurangi sumbu Y dan padding, sehingga tiap label cuma
              kebagian 37px, sementara "27 Agu" pada 12px butuh sekitar 42px.
              Labelnya bertabrakan.

              preserveStartEnd dengan minTickGap menyerahkan keputusannya kepada
              recharts: ia menjatuhkan label secukupnya agar jarak minimum
              terpenuhi, dan selalu mempertahankan tanggal pertama serta terakhir
              supaya rentangnya tetap terbaca. Satu setelan yang benar di ponsel
              maupun di layar lebar.
            */
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => formatCompact(v)}
          />
          <Tooltip
            cursor={{ stroke: '#CBD2DC', strokeWidth: 1 }}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #E9EBF0',
              boxShadow: '0 4px 16px rgba(16,24,40,.08)',
              fontSize: 13,
            }}
            labelFormatter={(_, payload) => fullDate(payload?.[0]?.payload?.date)}
            formatter={(value: number) => [formatNumber(value), 'Unduhan']}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="#4F6BED"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            activeDot={{ r: 4, fill: '#4F6BED' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** "2026-08-21" -> "21/8" — cukup pendek untuk 30 label di satu sumbu. */
function dayLabel(iso: string | undefined): string {
  if (!iso) return ''
  const [, month, day] = iso.split('-')
  return `${Number(day)}/${Number(month)}`
}

function fullDate(iso: unknown): string {
  if (typeof iso !== 'string' || !iso) return ''
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
