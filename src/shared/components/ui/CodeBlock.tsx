import { Check, Copy } from 'lucide-react'

import { useCopyToClipboard } from '@/shared/hooks/useCopyToClipboard'
import { cn } from '@/shared/lib/cn'

export function CodeBlock({
  code,
  copyKey = 'code',
  className,
}: {
  code: string
  copyKey?: string
  className?: string
}) {
  const { copy, copiedKey } = useCopyToClipboard()
  const copied = copiedKey === copyKey

  return (
    <div className={cn('relative', className)}>
      {/* Isi kode dirender sebagai teks di dalam <pre>, tidak pernah sebagai
          HTML. Contoh kode memuat karakter seperti < dan & yang akan berubah
          makna kalau disisipkan sebagai markup. */}
      <pre className="overflow-x-auto rounded-[11px] bg-[#0F172A] p-4.5 font-mono text-[12.8px] leading-relaxed text-[#E2E8F0]">
        {code}
      </pre>
      <button
        type="button"
        onClick={() => void copy(code, copyKey)}
        className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-[7px] bg-white/12 px-3 py-1.5 text-[12px] font-semibold text-[#CBD5E1] hover:bg-white/20"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? 'Tersalin' : 'Salin'}
      </button>
    </div>
  )
}
