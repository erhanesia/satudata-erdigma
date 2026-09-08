import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
}

/**
 * Modal berbasis Radix.
 *
 * Alasan memakai pustaka alih-alih `<div>` dengan `position: fixed`: dialog
 * yang benar harus mengunci fokus di dalamnya, mengembalikan fokus ke pemicu
 * saat ditutup, menutup lewat Esc, dan menyembunyikan latar dari screen reader.
 * Semua itu mudah terlewat kalau ditulis sendiri, dan akibatnya pengguna papan
 * ketik bisa terjebak di belakang modal.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        {/*
          Radix menunda pelepasan elemen sampai animasinya selesai, jadi
          `data-[state=closed]` benar-benar sempat diputar — bukan sekadar
          dilewati begitu dialognya ditutup.
        */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[#101828]/45 data-[state=closed]:animate-[overlay-out_150ms_ease-in_both] data-[state=open]:animate-[overlay-in_200ms_ease_both]" />
        <DialogPrimitive.Content
          className={cn(
            'bg-surface fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2',
            'max-h-[85dvh] overflow-y-auto rounded-[var(--radius-card)] p-4 shadow-xl sm:p-6',
            'data-[state=open]:animate-[modal-in_240ms_cubic-bezier(0.16,1,0.3,1)_both]',
            'data-[state=closed]:animate-[modal-out_160ms_cubic-bezier(0.4,0,1,1)_both]',
            className,
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-ink-900 text-lg font-bold">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="text-ink-500 mt-1 text-sm">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close
              aria-label="Tutup"
              className="text-ink-400 hover:bg-surface-100 hover:text-ink-700 -mt-1 -mr-1 shrink-0 rounded-lg p-1.5"
            >
              <X className="size-5" />
            </DialogPrimitive.Close>
          </div>

          {children}

          {footer ? <div className="mt-6 flex gap-3">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
