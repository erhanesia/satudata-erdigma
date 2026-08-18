import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

/** Lebar isi seragam di seluruh halaman: 1200px, sesuai desain. */
export function PageContainer({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn('mx-auto max-w-[1200px] px-5', className)}>{children}</div>
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-ink-900 text-2xl font-extrabold tracking-[-0.4px]">{title}</h1>
        {description ? <p className="text-ink-500 mt-1.5 text-sm">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
