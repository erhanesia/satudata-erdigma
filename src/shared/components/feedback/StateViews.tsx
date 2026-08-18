import { AlertTriangle, Inbox, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'

import { ApiError } from '@/shared/api/errors'
import { Button } from '@/shared/components/ui/Button'
import { cn } from '@/shared/lib/cn'

/**
 * Keadaan kosong.
 *
 * Penting untuk aplikasi ini: dari sembilan dataset, hanya satu yang punya
 * berkas dan isi tabel. Tanpa tampilan kosong yang jelas, delapan halaman lain
 * akan terlihat seperti rusak, padahal memang belum ada datanya.
 */
export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'border-line-200 bg-surface flex flex-col items-center rounded-[var(--radius-card)] border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      <Inbox className="text-ink-400 size-9" strokeWidth={1.6} />
      <p className="text-ink-900 mt-4 text-base font-bold">{title}</p>
      {description ? <p className="text-ink-500 mt-1.5 max-w-md text-sm">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

/**
 * Keadaan galat.
 *
 * Yang ditampilkan hanya `error.message`, yang sudah disaring `toApiError`.
 * Badan galat mentah dari server tidak pernah sampai ke layar — isinya bisa
 * memuat jejak tumpukan atau nama tabel.
 */
export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error: unknown
  onRetry?: () => void
  className?: string
}) {
  const pesan =
    error instanceof ApiError
      ? error.message
      : 'Terjadi kesalahan saat memuat data. Coba muat ulang halaman.'

  return (
    <div
      role="alert"
      className={cn(
        'border-danger/20 bg-danger-bg flex flex-col items-center rounded-[var(--radius-card)] border px-6 py-12 text-center',
        className,
      )}
    >
      <AlertTriangle className="text-danger size-9" strokeWidth={1.6} />
      <p className="text-ink-900 mt-4 text-base font-bold">Gagal memuat data</p>
      <p className="text-ink-600 mt-1.5 max-w-md text-sm">{pesan}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Coba lagi
        </Button>
      ) : null}
    </div>
  )
}
