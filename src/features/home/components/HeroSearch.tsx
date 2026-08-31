import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'

import { paths } from '@/app/router/paths'

/** Ikon kaca pembesar dari lucide, bukan jalur SVG yang ditulis sendiri. */
function SearchIcon() {
  return <Search className="size-[21px] text-white" strokeWidth={2.4} aria-hidden />
}

/**
 * Kotak pencarian utama beranda: pil dengan tombol bundar di dalamnya.
 *
 * Ukuran, warna, dan bayangannya mengikuti desain apa adanya. Dibungkus
 * `<form>` supaya Enter bekerja tanpa penanganan tombol manual — itu juga yang
 * memunculkan tombol "Cari" pada papan ketik perangkat seluler.
 */
export function HeroSearch() {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)
  const navigate = useNavigate()

  function submit(event: FormEvent) {
    event.preventDefault()
    const q = value.trim()
    navigate(q ? `${paths.datasets}?search=${encodeURIComponent(q)}` : paths.datasets)
  }

  return (
    <form onSubmit={submit} role="search" className="mx-auto w-full max-w-[680px]">
      <div
        className={[
          'flex items-center gap-2 rounded-full bg-white py-2 pr-2 pl-6 transition-all duration-300',
          'border-[1.5px]',
          focused
            ? 'border-brand shadow-[0_6px_26px_-8px_rgba(27,84,196,0.38)]'
            : 'border-line-300 shadow-[0_4px_20px_-8px_rgba(16,24,40,0.14)]',
        ].join(' ')}
      >
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-label="Cari dataset"
          placeholder="Coba kata kunci seperti: 'penjualan', 'uptime layanan', 'kampanye'"
          className="text-ink-900 placeholder:text-ink-400 min-w-0 flex-1 bg-transparent px-1 py-[11px] text-[16.5px] focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Cari"
          className="bg-brand hover:bg-brand-hover flex size-12 shrink-0 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          <SearchIcon />
        </button>
      </div>
    </form>
  )
}
