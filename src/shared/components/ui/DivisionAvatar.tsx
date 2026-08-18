import { cn } from '@/shared/lib/cn'

/**
 * Warna cadangan bila `logoBg` tidak terkirim dari server. Nilainya sama dengan
 * peta `LOGO_BG` di berkas desain.
 */
const WARNA_DIVISI: Record<string, string> = {
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
  const kode = code ?? '?'
  const warna = logoBg ?? WARNA_DIVISI[kode] ?? '#667085'

  const ukuran = {
    sm: 'size-8 text-[10px]',
    md: 'size-11 text-xs',
    lg: 'size-14 text-sm',
  }[size]

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl font-bold text-white',
        ukuran,
        className,
      )}
      // Warna divisi adalah data, bukan pilihan tata letak — jumlah divisi bisa
      // bertambah, jadi kelas Tailwind statis tidak cukup. Nilainya hanya masuk
      // properti CSS `background-color`, tidak pernah menjadi markup.
      style={{ backgroundColor: warna }}
      aria-hidden
    >
      {kode}
    </div>
  )
}
