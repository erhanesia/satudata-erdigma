import { EmptyState } from '@/shared/components/feedback/StateViews'
import { Badge } from '@/shared/components/ui/Badge'
import type { DatasetColumn } from '@/shared/types/api'

const TITLES = ['Nama tampilan', 'Machine name', 'Tipe', 'Unit', 'Deskripsi'] as const

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
                {TITLES.map((title) => (
                  <th
                    key={title}
                    scope="col"
                    className="border-line-200 text-ink-600 border-b-2 px-3.5 py-3 text-left text-[12.5px] font-bold whitespace-nowrap"
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {columns.map((column) => (
                <tr key={column.id}>
                  <Cell>{column.displayName}</Cell>
                  <Cell mono>{column.machineName}</Cell>
                  <Cell>
                    <Badge tone="brand">{column.dataType}</Badge>
                  </Cell>
                  <Cell muted>{column.unit || '—'}</Cell>
                  <Cell muted>{column.description || '—'}</Cell>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </div>
  )
}

function Cell({
  children,
  mono,
  muted,
}: {
  children: React.ReactNode
  mono?: boolean
  muted?: boolean
}) {
  return (
    <td
      className={[
        'border-line-50 border-b px-3.5 py-3 text-[13.5px]',
        mono ? 'font-mono' : '',
        muted ? 'text-ink-500' : 'text-ink-700',
      ].join(' ')}
    >
      {children}
    </td>
  )
}
