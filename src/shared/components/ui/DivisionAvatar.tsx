import { cn } from '@/shared/lib/cn'

/**
 * Palet warna divisi, sama dengan peta `LOGO_BG` di berkas desain dan sama pula
 * dengan yang dipakai changeset 42 saat mengisi `logo_bg`.
 */
const PALET = [
  '#047857',
  '#7C3AED',
  '#0F766E',
  '#1B54C4',
  '#BE123C',
  '#0EA5A0',
  '#B45309',
  '#A21CAF',
] as const

/**
 * Warna cadangan bila `logoBg` tidak terkirim server.
 *
 * Dulu berupa peta tetap dari delapan kode divisi desain — `SALES`, `IT`, `DNA`,
 * dan seterusnya. Changeset 42 mengganti seluruh isi tabel divisi dengan 32 team
 * Erdigma, sehingga tidak satu pun kunci peta itu tersisa: setiap pencarian
 * meleset dan jatuh ke abu-abu.
 *
 * Sekarang warnanya diturunkan dari kodenya sendiri, jadi berlaku untuk kode apa
 * pun termasuk team yang baru ditambahkan di HRIS. Bukan peniruan persis warna
 * dari server — server memakai id HRIS, di sini yang ada hanya kodenya — tetapi
 * hasilnya tetap dari palet yang sama dan tetap sama setiap kali dirender untuk
 * kode yang sama.
 */
function warnaCadangan(code: string): string {
  let jumlah = 0
  for (let i = 0; i < code.length; i += 1) {
    jumlah = (jumlah * 31 + code.charCodeAt(i)) % 1_000_000_007
  }
  return PALET[jumlah % PALET.length]!
}

interface DivisionAvatarProps {
  code: string | undefined
  logoBg?: string | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function DivisionAvatar({ code, logoBg, size = 'md', className }: DivisionAvatarProps) {
  const initials = code ?? '?'
  const color = logoBg ?? (code ? warnaCadangan(code) : '#667085')

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
