import { Clock, Database, Download } from 'lucide-react'
import { Link } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { DivisionAvatar } from '@/shared/components/ui/DivisionAvatar'
import { Badge } from '@/shared/components/ui/Badge'
import { formatCompact, formatRelative } from '@/shared/lib/format'
import type { DatasetLite } from '@/shared/types/api'

export function DatasetCard({ dataset }: { dataset: DatasetLite }) {
  const slug = dataset.slug ?? ''

  return (
    <article className="border-line-200 bg-surface hover:border-brand-border rounded-[var(--radius-card)] border p-5 transition-colors">
      <div className="flex gap-4">
        <DivisionAvatar code={dataset.division?.code} logoBg={dataset.division?.logoBg} />

        <div className="min-w-0 flex-1">
          <h3 className="text-ink-900 text-base leading-snug font-bold">
            {/* Seluruh kartu bukan tautan; hanya judulnya. Kartu yang seluruhnya
                jadi tautan membuat pengguna sulit menyalin teks di dalamnya. */}
            <Link to={paths.datasetDetail(slug)} className="hover:text-brand">
              {dataset.title}
            </Link>
          </h3>

          <p className="text-ink-500 mt-1 text-[13px]">{dataset.division?.name}</p>

          {dataset.notes ? (
            <p className="text-ink-600 mt-2.5 line-clamp-2 text-[13.5px] leading-relaxed">
              {dataset.notes}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {dataset.topics?.map((topic) => (
              <Badge key={topic} tone="brand">
                {topic}
              </Badge>
            ))}
            {dataset.formats?.map((format) => (
              <Badge key={format} tone="neutral" className="font-mono">
                {format}
              </Badge>
            ))}
          </div>

          <div className="text-ink-500 mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px]">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" />
              {formatRelative(dataset.lastUpdatedAt, dataset.realtime)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Download className="size-3.5" />
              {formatCompact(dataset.downloads)} unduhan
            </span>
            {dataset.coverage ? (
              <span className="inline-flex items-center gap-1.5">
                <Database className="size-3.5" />
                {dataset.coverage}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}
