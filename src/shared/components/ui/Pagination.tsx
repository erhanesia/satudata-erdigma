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
const WINDOW_SIZE = 5

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
  labels = false,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const from = Math.max(1, Math.min(page - 2, totalPages - (WINDOW_SIZE - 1)))
  const lastIndex = Math.min(totalPages, from + (WINDOW_SIZE - 1))
  const rowNumber: number[] = []
  for (let n = from; n <= lastIndex; n += 1) rowNumber.push(n)

  return (
    <nav
      className={cn('flex flex-wrap items-center justify-center gap-1.5', className)}
      aria-label="Navigasi halaman"
    >
      <ArrowButton
        direction="prev"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        label={labels ? 'Sebelumnya' : undefined}
      />
      {rowNumber.map((n) => (
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
      <ArrowButton
        direction="next"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        label={labels ? 'Berikutnya' : undefined}
      />
    </nav>
  )
}

function ArrowButton({
  direction,
  disabled,
  onClick,
  label,
}: {
  direction: 'prev' | 'next'
  disabled: boolean
  onClick: () => void
  label?: string | undefined
}) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Halaman sebelumnya' : 'Halaman berikutnya'}
      className={cn(
        'flex h-9.5 items-center rounded-[var(--radius-control)] border',
        label ? 'px-3 text-sm font-semibold sm:px-3.5' : 'px-3',
        disabled
          ? 'border-line-100 bg-surface-50 text-[#c7cfdb]'
          : 'border-line-200 bg-surface text-ink-700 hover:bg-surface-100',
      )}
    >
      {label ? (
        direction === 'prev' ? (
          <>
            ‹<span className="hidden sm:inline">&nbsp;{label}</span>
          </>
        ) : (
          <>
            <span className="hidden sm:inline">{label}&nbsp;</span>›
          </>
        )
      ) : (
        <Icon className="size-4" />
      )}
    </button>
  )
}
