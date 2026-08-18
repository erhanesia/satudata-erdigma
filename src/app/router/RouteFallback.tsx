import { SkeletonCardList } from '@/shared/components/ui/Skeleton'

/** Tampilan sementara selama berkas halaman diunduh (lihat `lazy` di router). */
export function RouteFallback() {
  return (
    <div className="mx-auto max-w-[1200px] px-5 py-10">
      <SkeletonCardList count={4} />
    </div>
  )
}
