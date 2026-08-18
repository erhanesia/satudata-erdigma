import { cn } from '@/shared/lib/cn'

/**
 * Penanda muat berbentuk blok abu.
 *
 * Dipakai alih-alih tulisan "Memuat…" supaya tinggi halaman tidak melompat saat
 * data tiba — pergeseran tata letak membuat pengguna kehilangan tempat baca dan
 * kadang salah klik.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('bg-line-100 animate-pulse rounded-lg', className)} aria-hidden />
}

export function SkeletonCardList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Memuat data">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-32 w-full" />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Memuat tabel">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-9 w-full" />
      ))}
    </div>
  )
}
