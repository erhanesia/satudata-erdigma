import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'

import { cn } from '@/shared/lib/cn'

interface CheckboxProps {
  id: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string
  /** Biarkan label membungkus ke beberapa baris (mis. teks persetujuan panjang). */
  multiline?: boolean
  className?: string
}

/**
 * Kotak centang berbasis Radix — bukan `<input type=checkbox>` yang digayakan
 * dengan CSS. Radix menjaga peran ARIA dan status `aria-checked` tetap benar,
 * yang hilang begitu elemen aslinya disembunyikan demi tampilan.
 */
export function Checkbox({
  id,
  checked,
  onCheckedChange,
  label,
  multiline = false,
  className,
}: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'text-ink-700 flex cursor-pointer gap-2.5 rounded-lg px-2 py-1.5 text-sm',
        multiline ? 'items-start' : 'items-center',
        checked && !multiline ? 'bg-[#f4f7ff] font-semibold' : '',
        !multiline ? 'hover:bg-surface-100' : '',
        className,
      )}
    >
      <CheckboxPrimitive.Root
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
        className={cn(
          'flex size-[18px] shrink-0 items-center justify-center rounded border',
          multiline ? 'mt-0.5' : '',
          checked ? 'bg-brand border-brand' : 'border-line-300 bg-surface',
        )}
      >
        <CheckboxPrimitive.Indicator>
          <Check className="size-3 text-white" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      <span className={cn('min-w-0', multiline ? 'leading-relaxed' : 'truncate')}>{label}</span>
    </label>
  )
}
