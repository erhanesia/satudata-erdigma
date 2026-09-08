import { cn } from '@/shared/lib/cn'

import { useToasts, type ToastTone } from './toastStore'

const STYLES: Record<ToastTone, string> = {
  info: 'bg-ink-900 text-white',
  success: 'bg-success text-white',
  error: 'bg-danger text-white',
}

export function Toaster() {
  const toasts = useToasts()

  return (
    // aria-live="polite" membuat screen reader membacakan pesan tanpa memotong
    // apa yang sedang dibaca pengguna. "assertive" akan terasa memaksa untuk
    // pemberitahuan sepele seperti "Disalin ke clipboard".
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-0 bottom-6 z-100 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto max-w-md rounded-[var(--radius-control)] px-4 py-3 text-sm font-semibold shadow-lg',
            STYLES[toast.tone],
          )}
        >
          {toast.message}
        </div>
      ))}
    </div>
  )
}
