import { cn } from '@/shared/lib/cn'

/**
 * Warna cadangan bila `logoBg` tidak terkirim dari server. Nilainya sama dengan
 * peta `LOGO_BG` di berkas desain.
 */
const DIVISION_COLORS: Record<string, string> = {
  SALES: '#1B54C4',
  IT: '#7C3AED',
  OPS: '#0EA5A0',
  HR: '#B45309',
  FIN: '#BE123C',
  PROD: '#0F766E',
  MKT: '#A21CAF',
  DNA: '#047857',
}

interface DivisionAvatarProps {
  code: string | undefined
  logoBg?: string | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function DivisionAvatar({ code, logoBg, size = 'md', className }: DivisionAvatarProps) {
  const initials = code ?? '?'
  const color = logoBg ?? DIVISION_COLORS[initials] ?? '#667085'

  const sizeClass = {
    sm: 'size-8 text-[10px]',
    md: 'size-11 text-xs',
    lg: 'size-14 text-sm',
  }[size]

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl font-bold text-white',
        sizeClass,
        className,
      )}
      // Warna divisi adalah data, bukan pilihan tata letak — jumlah divisi bisa
      // bertambah, jadi kelas Tailwind statis tidak cukup. Nilainya hanya masuk
      // properti CSS `background-color`, tidak pernah menjadi markup.
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initials}
    </div>
  )
}
