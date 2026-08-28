import { cn } from '@/shared/lib/cn'

/**
 * Palet warna divisi, sama dengan peta `LOGO_BG` di berkas desain.
 */
const PALETTE = [
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
 * Warna avatar divisi, diturunkan dari kodenya.
 *
 * **Dihitung, tidak disimpan.** Dulu ada kolom `division.logo_bg` yang dikirim
 * server, dan komponen ini hanya memakainya. Kolom itu dicabut di changeset 46:
 * warnanya murni urusan tampilan dan tidak membawa satu pun informasi yang tidak
 * bisa dihitung ulang dari `code`.
 *
 * Pencabutannya juga menutup satu ketidakcocokan. Sempat ada DUA sumber warna —
 * kolom di server, diisi hash SHA-256 atas id HRIS, dan warna cadangan di sini,
 * memakai hash polinomial atas kode. Dua fungsi berbeda untuk satu nilai yang
 * sama, dan hasilnya berbeda pada 28 dari 32 divisi. Selama server selalu
 * mengirim nilainya, selisih itu tidak terlihat; sekali saja tidak, hampir
 * seluruh divisi berganti warna tanpa ada yang mengubah apa pun.
 *
 * Paletnya delapan warna dari berkas desain. Karena divisi jauh lebih banyak
 * dari itu, warnanya berulang — dan itu diterima: yang membedakan divisi adalah
 * kode di dalam kotaknya, bukan warnanya.
 *
 * Hasilnya tetap sama untuk kode yang sama, jadi satu divisi tidak pernah
 * berganti warna antar halaman atau antar muat ulang.
 */
function colorFor(code: string): string {
  let hash = 0
  for (let i = 0; i < code.length; i += 1) {
    hash = (hash * 31 + code.charCodeAt(i)) % 1_000_000_007
  }
  return PALETTE[hash % PALETTE.length]!
}

interface DivisionAvatarProps {
  code: string | undefined
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function DivisionAvatar({ code, size = 'md', className }: DivisionAvatarProps) {
  const initials = code ?? '?'
  // Abu-abu hanya untuk divisi yang belum termuat; begitu kodenya ada,
  // warnanya selalu dari palet.
  const color = code ? colorFor(code) : '#667085'

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
