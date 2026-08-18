import { cn } from '@/shared/lib/cn'

interface SearchFieldProps {
  value: string
  onChange: (nilai: string) => void
  placeholder: string
  /** Teks untuk pembaca layar — placeholder saja tidak cukup sebagai label. */
  label: string
  /** Kelas untuk kotak pembungkus, mis. lebar maksimum. */
  className?: string
  /** Kelas untuk `<input>`, dipakai menyetel padding vertikal per halaman. */
  inputClassName?: string
}

/**
 * Kotak pencarian bergaris, sesuai desain.
 *
 * Ikonnya jalur SVG asli dari berkas desain (lingkaran r=7), bukan padanan
 * lucide yang memakai r=8 — bedanya kecil tapi tampak saat disandingkan.
 *
 * Padding vertikalnya sengaja tidak dipatok di sini: desain memberi 13px pada
 * katalog dataset dan 12px pada daftar divisi.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
  inputClassName,
}: SearchFieldProps) {
  return (
    <div
      className={cn(
        'border-line-300 focus-within:border-brand flex items-center gap-2.5 rounded-[10px] border bg-white px-3.5 transition-colors',
        className,
      )}
    >
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#98A2B3"
        strokeWidth={2.2}
        aria-hidden
      >
        <circle cx={11} cy={11} r={7} />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={cn(
          'text-ink-900 placeholder:text-ink-400 min-w-0 flex-1 border-none bg-transparent text-[15px] outline-none',
          inputClassName,
        )}
      />
    </div>
  )
}
