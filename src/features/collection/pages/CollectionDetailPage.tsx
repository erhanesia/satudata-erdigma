import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { DatasetCard } from '@/features/dataset/components/DatasetCard'
import { EmptyState } from '@/shared/components/feedback/StateViews'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { DivisionAvatar } from '@/shared/components/ui/DivisionAvatar'
import { PageContainer } from '@/shared/components/ui/PageContainer'
import { SkeletonCardList } from '@/shared/components/ui/Skeleton'

import { useCollection } from '../hooks/useCollections'

export default function CollectionDetailPage() {
  const { slug = '' } = useParams()
  const query = useCollection(slug)

  return (
    <PageContainer className="py-10">
      <Link
        to={paths.collections}
        className="text-ink-500 hover:text-ink-900 mb-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold"
      >
        <ArrowLeft className="size-4" />
        Semua koleksi
      </Link>

      <QueryBoundary query={query} loading={<SkeletonCardList count={3} />}>
        {(koleksi) => (
          <>
            <div className="flex flex-wrap items-start gap-4">
              <DivisionAvatar code={koleksi.division?.code} logoBg={koleksi.division?.logoBg} size="lg" />
              <div className="min-w-[260px] flex-1">
                <h1 className="text-ink-900 text-2xl font-extrabold tracking-[-0.4px]">
                  {koleksi.name}
                </h1>
                <p className="text-ink-500 mt-1.5 text-[13.5px]">{koleksi.division?.name}</p>
                <p className="text-ink-600 mt-3 max-w-2xl text-sm leading-relaxed">
                  {koleksi.description}
                </p>
              </div>
            </div>

            <h2 className="text-ink-900 mt-9 mb-4 text-lg font-extrabold">
              {koleksi.datasetCount} dataset dalam koleksi ini
            </h2>

            {koleksi.datasets && koleksi.datasets.length > 0 ? (
              <div className="flex flex-col gap-3">
                {koleksi.datasets.map((dataset) => (
                  <DatasetCard key={dataset.id} dataset={dataset} />
                ))}
              </div>
            ) : (
              <EmptyState title="Koleksi ini belum berisi dataset" />
            )}
          </>
        )}
      </QueryBoundary>
    </PageContainer>
  )
}
