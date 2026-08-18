import { Layers } from 'lucide-react'
import { Link } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { EmptyState } from '@/shared/components/feedback/StateViews'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { DivisionAvatar } from '@/shared/components/ui/DivisionAvatar'
import { PageContainer, PageHeading } from '@/shared/components/ui/PageContainer'
import { SkeletonCardList } from '@/shared/components/ui/Skeleton'

import { useCollections } from '../hooks/useCollections'

export default function CollectionListPage() {
  const query = useCollections()

  return (
    <PageContainer className="py-10">
      <PageHeading
        title="Koleksi"
        description="Kumpulan dataset yang dikurasi untuk satu tema analisis."
      />

      <QueryBoundary query={query} loading={<SkeletonCardList count={3} />}>
        {(collections) =>
          collections.length === 0 ? (
            <EmptyState
              title="Belum ada koleksi"
              description="Koleksi dibuat oleh divisi penerbit untuk mengelompokkan dataset yang saling terkait."
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {collections.map((koleksi) => (
                <Link
                  key={koleksi.id}
                  to={paths.collectionDetail(koleksi.slug ?? '')}
                  className="border-line-200 bg-surface hover:border-brand-border rounded-[var(--radius-card)] border p-5"
                >
                  <div className="flex items-start gap-4">
                    <DivisionAvatar code={koleksi.division?.code} logoBg={koleksi.division?.logoBg} />
                    <div className="min-w-0">
                      <h2 className="text-ink-900 text-base font-bold">{koleksi.name}</h2>
                      <p className="text-ink-500 mt-1 text-[13px]">{koleksi.division?.name}</p>
                      <p className="text-ink-600 mt-2.5 line-clamp-2 text-[13.5px] leading-relaxed">
                        {koleksi.description}
                      </p>
                      <p className="text-ink-500 mt-3 inline-flex items-center gap-1.5 text-[12.5px]">
                        <Layers className="size-3.5" />
                        {koleksi.datasetCount} dataset
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
        }
      </QueryBoundary>
    </PageContainer>
  )
}
