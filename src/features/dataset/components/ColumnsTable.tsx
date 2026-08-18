import { EmptyState } from '@/shared/components/feedback/StateViews'
import { Badge } from '@/shared/components/ui/Badge'
import type { DatasetColumn } from '@/shared/types/api'

const JUDUL = ['Nama tampilan', 'Machine name', 'Tipe', 'Unit', 'Deskripsi'] as const

export function ColumnsTable({ columns }: { columns: DatasetColumn[] }) {
  if (columns.length === 0) {
    return (
      <EmptyState
        title="Skema kolom belum didaftarkan"
        description="Metadata kolom akan muncul di sini setelah dataset diunggah beserta strukturnya."
      />
    )
  }

  return (
    <div className="border-line-200 bg-surface rounded-[14px] border p-5">
      <h3 className="text-ink-900 mb-3.5 text-base font-bold">Metadata kolom</h3>
      <div className="border-line-100 overflow-x-auto rounded-[10px] border">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="bg-surface-50">
              <tr>
                {JUDUL.map((judul) => (
                  <th
                    key={judul}
                    scope="col"
                    className="border-line-200 text-ink-600 border-b-2 px-3.5 py-3 text-left text-[12.5px] font-bold whitespace-nowrap"
                  >
                    {judul}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {columns.map((kolom) => (
                <tr key={kolom.id}>
                  <Sel>{kolom.displayName}</Sel>
                  <Sel mono>{kolom.machineName}</Sel>
                  <Sel>
                    <Badge tone="brand">{kolom.dataType}</Badge>
                  </Sel>
                  <Sel redup>{kolom.unit || '—'}</Sel>
                  <Sel redup>{kolom.description || '—'}</Sel>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  )
}

function Sel({
  children,
  mono,
  redup,
}: {
  children: React.ReactNode
  mono?: boolean
  redup?: boolean
}) {
  return (
    <td
      className={[
        'border-line-50 border-b px-3.5 py-3 text-[13.5px]',
        mono ? 'font-mono' : '',
        redup ? 'text-ink-500' : 'text-ink-700',
      ].join(' ')}
    >
      {children}
    </td>
  )
}
