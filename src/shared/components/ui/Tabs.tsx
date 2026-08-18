import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

export const Tabs = TabsPrimitive.Root

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <TabsPrimitive.List
      className={cn('border-line-200 flex gap-1 overflow-x-auto border-b', className)}
    >
      {children}
    </TabsPrimitive.List>
  )
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        'text-ink-500 -mb-px border-b-2 border-transparent px-4 py-3 text-[14.5px] font-semibold whitespace-nowrap',
        'data-[state=active]:border-brand data-[state=active]:text-brand data-[state=active]:font-bold',
      )}
    >
      {children}
    </TabsPrimitive.Trigger>
  )
}

export function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  return (
    // Radix melepas isi tab yang tidak aktif dari DOM, jadi setiap perpindahan
    // memasang ulang elemennya — animasi masuk cukup dipasang sebagai kelas,
    // tanpa perlu state atau key tambahan.
    <TabsPrimitive.Content
      value={value}
      className="animate-tab-in pt-6 focus-visible:outline-none"
    >
      {children}
    </TabsPrimitive.Content>
  )
}
