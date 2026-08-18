import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { EmptyState } from '@/shared/components/feedback/StateViews'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { Select } from '@/shared/components/ui/Input'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { formatCompact, formatNumber } from '@/shared/lib/format'
import type { DatasetColumn } from '@/shared/types/api'

import { useDatasetSummary } from '../hooks/useDatasets'

/** Warna batang, diambil dari palet divisi pada desain. */
const WARNA = ['#1B54C4', '#7C3AED', '#0EA5A0', '#B45309', '#BE123C', '#0F766E', '#A21CAF', '#047857']

/** Jumlah kelompok maksimum yang ditampilkan agar sumbu tetap terbaca. */
const MAKS_KELOMPOK = 12

function apakahNumerik(kolom: DatasetColumn): boolean {
  const tipe = (kolom.dataType ?? '').toLowerCase()
  return tipe.includes('numeric') || tipe.includes('number') || tipe.includes('int')
}

function apakahTanggal(kolom: DatasetColumn): boolean {
  const tipe = (kolom.dataType ?? '').toLowerCase()
  return tipe.includes('date') || tipe.includes('time')
}

/**
 * Kolom yang hampir pasti unik per baris: pengenal, nama orang, alamat.
 *
 * Mengelompokkan 10.000 baris berdasarkan `order_id` menghasilkan 10.000
 * kelompok berisi satu baris — grafik yang benar secara teknis tapi tidak
 * memberi tahu apa pun.
 */
const POLA_IDENTITAS = /(^|_)(id|kode|code)$|name|nama|address|alamat|email|phone|telepon/i

/** Kolom yang biasanya ingin dijumlahkan, bukan sekadar dihitung. */
const POLA_UKURAN = /total|amount|revenue|sales|nilai|jumlah|harga|price|qty|quantity/i

/**
 * Menebak kelompok awal yang masuk akal.
 *
 * Ini heuristik, bukan kebenaran — pengguna tetap bisa mengganti lewat dropdown.
 * Tujuannya supaya grafik pertama yang dilihat sudah bermakna, bukan deretan
 * ratusan batang setinggi satu.
 */
function pilihGroupByAwal(kandidat: DatasetColumn[]): string {
  const layak = kandidat.find(
    (k) => !apakahTanggal(k) && !POLA_IDENTITAS.test(k.machineName ?? ''),
  )
  return (layak ?? kandidat[0])?.machineName ?? ''
}

function pilihMetrikAwal(kandidat: DatasetColumn[]): string {
  // Tanpa kolom ukuran yang jelas, lebih jujur menghitung baris daripada
  // menjumlahkan sesuatu seperti "tahun" yang angkanya tidak bermakna kalau
  // ditotal.
  return kandidat.find((k) => POLA_UKURAN.test(k.machineName ?? ''))?.machineName ?? ''
}

export function SummaryChart({
  slug,
  columns,
  rowCount,
}: {
  slug: string
  columns: DatasetColumn[]
  rowCount: number
}) {
  const kolomKategori = useMemo(() => columns.filter((k) => !apakahNumerik(k)), [columns])
  const kolomNumerik = useMemo(() => columns.filter(apakahNumerik), [columns])

  const [groupBy, setGroupBy] = useState(() => pilihGroupByAwal(kolomKategori))
  const [metric, setMetric] = useState(() => pilihMetrikAwal(kolomNumerik))

  const query = useDatasetSummary(slug, groupBy, metric || undefined, rowCount > 0 && !!groupBy)

  if (rowCount === 0 || kolomKategori.length === 0) {
    return (
      <EmptyState
        title="Ringkasan belum tersedia"
        description="Grafik ringkasan dibuat dari isi tabel. Dataset ini belum memiliki baris data di datastore."
      />
    )
  }

  return (
    <>
      {/* Desain hanya menampilkan grafik jadi, karena datanya di prototipe
          sudah dipilihkan. Di sini kolomnya bisa 17, jadi dua pemilih ini yang
          membuat grafiknya berguna — ditaruh di bawah judul kartu supaya baris
          judul tetap seperti desain. */}
      <div className="mb-3 flex flex-wrap justify-end gap-2">
          <label className="flex items-center gap-1.5">
            <span className="text-ink-500 text-[12px]">Kelompokkan</span>
            <Select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="h-9 text-[12.5px]"
              aria-label="Kelompokkan berdasarkan"
            >
              {kolomKategori.map((kolom) => (
                <option key={kolom.id} value={kolom.machineName ?? ''}>
                  {kolom.displayName ?? kolom.machineName}
                </option>
              ))}
            </Select>
          </label>

          {kolomNumerik.length > 0 ? (
            <label className="flex items-center gap-1.5">
              <span className="text-ink-500 text-[12px]">Jumlahkan</span>
              <Select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="h-9 text-[12.5px]"
                aria-label="Kolom yang dijumlahkan"
              >
                <option value="">— hanya hitung baris —</option>
                {kolomNumerik.map((kolom) => (
                  <option key={kolom.id} value={kolom.machineName ?? ''}>
                    {kolom.displayName ?? kolom.machineName}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
      </div>

      <QueryBoundary query={query} loading={<Skeleton className="h-72 w-full" />}>
          {(summary) => {
            const kelompok = (summary.groups ?? []).slice(0, MAKS_KELOMPOK)
            const pakaiJumlah = Boolean(metric)

            if (kelompok.length === 0) {
              return <EmptyState title="Tidak ada kelompok untuk ditampilkan" />
            }

            const data = kelompok.map((g) => ({
              label: g.label ?? '(kosong)',
              nilai: pakaiJumlah ? (g.sum ?? 0) : (g.count ?? 0),
            }))

            return (
              <>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <CartesianGrid stroke="#EEF1F5" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: '#475467' }}
                        tickLine={false}
                        axisLine={{ stroke: '#D0D5DD' }}
                        interval={0}
                        angle={data.length > 6 ? -25 : 0}
                        textAnchor={data.length > 6 ? 'end' : 'middle'}
                        height={data.length > 6 ? 60 : 30}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#98A2B3' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v: number) => formatCompact(v)}
                      />
                      <Tooltip
                        cursor={{ fill: '#F8FAFC' }}
                        formatter={(v: number) => [formatNumber(v), pakaiJumlah ? 'Jumlah' : 'Baris']}
                        contentStyle={{
                          borderRadius: 10,
                          border: '1px solid #E3E7ED',
                          fontSize: 13,
                        }}
                      />
                      <Bar dataKey="nilai" radius={[4, 4, 0, 0]}>
                        {data.map((_, i) => (
                          <Cell key={i} fill={WARNA[i % WARNA.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-ink-400 mt-3 text-[12px]">
                  Dihitung dari {formatNumber(summary.totalRows)} baris.
                  {(summary.groups?.length ?? 0) > MAKS_KELOMPOK
                    ? ` Menampilkan ${MAKS_KELOMPOK} kelompok teratas dari ${summary.groups?.length}.`
                    : ''}
                </p>
              </>
            )
          }}
      </QueryBoundary>
    </>
  )
}
