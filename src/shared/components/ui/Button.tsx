import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold ' +
    'transition-colors disabled:cursor-not-allowed disabled:opacity-60 ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white hover:bg-brand-hover disabled:bg-line-200 disabled:text-ink-400',
        secondary: 'bg-surface text-ink-900 border border-line-300 hover:bg-surface-100',
        tinted: 'bg-brand-tint text-brand border border-brand-border hover:bg-[#e2ebff]',
        ghost: 'bg-transparent text-ink-600 hover:bg-surface-100',
        danger: 'bg-danger-bg text-danger border border-danger/20 hover:bg-[#fee4e2]',
        success: 'bg-success-bg text-success border border-success-border',
      },
      size: {
        sm: 'h-9 px-3 text-[13px]',
        md: 'h-11 px-4 text-sm',
        lg: 'h-12 px-5 text-[15px]',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children?: ReactNode
}

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  // `type` sengaja diberi nilai bawaan "button". Bawaan HTML adalah "submit",
  // yang membuat tombol biasa di dalam <form> ikut mengirim formulir tanpa
  // diminta — sumber bug yang sulit dilacak.
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
}
