import { ChevronLeft, ChevronRight } from 'lucide-react'

import { cn } from '@/shared/lib/cn'

interface PaginationProps {
  /** Halaman aktif, berbasis 1 (bukan `number` dari Spring yang berbasis 0). */
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  /**
   * Menampilkan "‹ Sebelumnya" / "Berikutnya ›" alih-alih ikon panah.
   *
   * Desain memakai dua bentuk berbeda: teks pada katalog dataset, ikon pada
   * paginasi tabel di Data Explorer yang ruangnya jauh lebih sempit.
   */
  labels?: boolean
}

/** Jumlah tombol nomor yang tampak sekaligus, mengikuti desain. */
const JENDELA = 5

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
  labels = false,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const mulai = Math.max(1, Math.min(page - 2, totalPages - (JENDELA - 1)))
  const selesai = Math.min(totalPages, mulai + (JENDELA - 1))
  const nomor: number[] = []
  for (let n = mulai; n <= selesai; n += 1) nomor.push(n)

  return (
    <nav className={cn('flex items-center gap-1.5', className)} aria-label="Navigasi halaman">
      <TombolArah
        arah="prev"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        label={labels ? 'Sebelumnya' : undefined}
      />
      {nomor.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPageChange(n)}
          aria-current={n === page ? 'page' : undefined}
          aria-label={`Halaman ${n}`}
          className={cn(
            'h-9.5 min-w-9 rounded-[var(--radius-control)] border text-sm font-bold',
            n === page
              ? 'bg-brand border-brand text-white'
              : 'bg-surface border-line-200 text-ink-700 hover:bg-surface-100',
          )}
        >
          {n}
        </button>
      ))}
      <TombolArah
        arah="next"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        label={labels ? 'Berikutnya' : undefined}
      />
    </nav>
  )
}

function TombolArah({
  arah,
  disabled,
  onClick,
  label,
}: {
  arah: 'prev' | 'next'
  disabled: boolean
  onClick: () => void
  label?: string | undefined
}) {
  const Ikon = arah === 'prev' ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={arah === 'prev' ? 'Halaman sebelumnya' : 'Halaman berikutnya'}
      className={cn(
        'flex h-9.5 items-center rounded-[var(--radius-control)] border',
        label ? 'px-3.5 text-sm font-semibold' : 'px-3',
        disabled
          ? 'border-line-100 bg-surface-50 text-[#c7cfdb]'
          : 'border-line-200 bg-surface text-ink-700 hover:bg-surface-100',
      )}
    >
      {label ? (
        arah === 'prev' ? (
          <>‹&nbsp;{label}</>
        ) : (
          <>{label}&nbsp;›</>
        )
      ) : (
        <Ikon className="size-4" />
      )}
    </button>
  )
}
