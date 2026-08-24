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
const COLORS = ['#1B54C4', '#7C3AED', '#0EA5A0', '#B45309', '#BE123C', '#0F766E', '#A21CAF', '#047857']

/** Jumlah kelompok maksimum yang ditampilkan agar sumbu tetap terbaca. */
const MAX_GROUPS = 12

function isNumeric(columns: DatasetColumn): boolean {
  const kind = (columns.dataType ?? '').toLowerCase()
  return kind.includes('numeric') || kind.includes('number') || kind.includes('int')
}

function isDateColumn(columns: DatasetColumn): boolean {
  const kind = (columns.dataType ?? '').toLowerCase()
  return kind.includes('date') || kind.includes('time')
}

/**
 * Kolom yang hampir pasti unik per baris: pengenal, nama orang, alamat.
 *
 * Mengelompokkan 10.000 baris berdasarkan `order_id` menghasilkan 10.000
 * kelompok berisi satu baris — grafik yang benar secara teknis tapi tidak
 * memberi tahu apa pun.
 */
const IDENTITY_PATTERN = /(^|_)(id|code|code)$|name|name|address|alamat|email|phone|telepon/i

/** Kolom yang biasanya ingin dijumlahkan, bukan sekadar dihitung. */
const MEASURE_PATTERN = /total|amount|revenue|sales|value|count|harga|price|qty|quantity/i

/**
 * Menebak kelompok awal yang masuk akal.
 *
 * Ini heuristik, bukan kebenaran — pengguna tetap bisa mengganti lewat dropdown.
 * Tujuannya supaya grafik pertama yang dilihat sudah bermakna, bukan deretan
 * ratusan batang setinggi satu.
 */
function pickInitialGroupBy(candidate: DatasetColumn[]): string {
  const suitable = candidate.find(
    (k) => !isDateColumn(k) && !IDENTITY_PATTERN.test(k.machineName ?? ''),
  )
  return (suitable ?? candidate[0])?.machineName ?? ''
}

function pickInitialMetric(candidate: DatasetColumn[]): string {
  // Tanpa kolom ukuran yang jelas, lebih jujur menghitung baris daripada
  // menjumlahkan sesuatu seperti "tahun" yang angkanya tidak bermakna kalau
  // ditotal.
  return candidate.find((k) => MEASURE_PATTERN.test(k.machineName ?? ''))?.machineName ?? ''
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
  const categoryColumns = useMemo(() => columns.filter((k) => !isNumeric(k)), [columns])
  const numericColumns = useMemo(() => columns.filter(isNumeric), [columns])

  const [groupBy, setGroupBy] = useState(() => pickInitialGroupBy(categoryColumns))
  const [metric, setMetric] = useState(() => pickInitialMetric(numericColumns))

  const query = useDatasetSummary(slug, groupBy, metric || undefined, rowCount > 0 && !!groupBy)

  if (rowCount === 0 || categoryColumns.length === 0) {
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
              {categoryColumns.map((columns) => (
                <option key={columns.id} value={columns.machineName ?? ''}>
                  {columns.displayName ?? columns.machineName}
                </option>
              ))}
            </Select>
          </label>

          {numericColumns.length > 0 ? (
            <label className="flex items-center gap-1.5">
              <span className="text-ink-500 text-[12px]">Jumlahkan</span>
              <Select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                className="h-9 text-[12.5px]"
                aria-label="Kolom yang dijumlahkan"
              >
                <option value="">— hanya hitung baris —</option>
                {numericColumns.map((columns) => (
                  <option key={columns.id} value={columns.machineName ?? ''}>
                    {columns.displayName ?? columns.machineName}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
      </div>

      <QueryBoundary query={query} loading={<Skeleton className="h-72 w-full" />}>
          {(summary) => {
            const groups = (summary.groups ?? []).slice(0, MAX_GROUPS)
            const useCount = Boolean(metric)

            if (groups.length === 0) {
              return <EmptyState title="Tidak ada kelompok untuk ditampilkan" />
            }

            const data = groups.map((g) => ({
              label: g.label ?? '(kosong)',
              value: useCount ? (g.sum ?? 0) : (g.count ?? 0),
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
                        formatter={(v: number) => [formatNumber(v), useCount ? 'Jumlah' : 'Baris']}
                        contentStyle={{
                          borderRadius: 10,
                          border: '1px solid #E3E7ED',
                          fontSize: 13,
                        }}
                      />
                      <Bar dataKey="nilai" radius={[4, 4, 0, 0]}>
                        {data.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <p className="text-ink-400 mt-3 text-[12px]">
                  Dihitung dari {formatNumber(summary.totalRows)} baris.
                  {(summary.groups?.length ?? 0) > MAX_GROUPS
                    ? ` Menampilkan ${MAX_GROUPS} kelompok teratas dari ${summary.groups?.length}.`
                    : ''}
                </p>
              </>
            )
          }}
      </QueryBoundary>
    </>
  )
}
