import { cva, type VariantProps } from 'class-variance-authority'
import type { HTMLAttributes } from 'react'

import { cn } from '@/shared/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-bold whitespace-nowrap',
  {
    variants: {
      tone: {
        brand: 'bg-brand-tint text-brand',
        neutral: 'bg-line-50 text-ink-600',
        success: 'bg-success-bg text-success',
        danger: 'bg-danger-bg text-danger',
        warning: 'bg-warning-bg text-warning',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}
