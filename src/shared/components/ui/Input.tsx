import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'bg-surface border-line-300 text-ink-900 placeholder:text-ink-400 h-11 w-full rounded-[var(--radius-control)] border px-3.5 text-sm',
        'focus:border-brand focus:outline-none',
        'disabled:bg-surface-100 disabled:text-ink-400',
        className,
      )}
      {...props}
    />
  )
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  // Sengaja memakai <select> bawaan, bukan tiruan berbasis div. Elemen asli
  // sudah membawa navigasi papan ketik, pembacaan oleh screen reader, dan
  // tampilan picker asli di perangkat sentuh — tiga hal yang mahal ditiru dan
  // sering salah.
  return (
    <select
      className={cn(
        'bg-surface border-line-300 text-ink-900 h-11 rounded-[var(--radius-control)] border px-3 text-sm font-semibold',
        'focus:border-brand focus:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
