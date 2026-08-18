/**
 * Ikon topik — jalur SVG dan warnanya disalin apa adanya dari berkas ekspor
 * desain (`tIcon` dan `tColor`).
 *
 * Sengaja tidak memakai lucide-react di sini. Ikon pustaka umum bentuknya mirip
 * tapi tidak sama, dan di deretan chip yang berdampingan perbedaan itu langsung
 * terlihat. Jalur aslinya pendek, jadi menyalinnya lebih murah daripada
 * mendekati bentuknya dengan tebakan.
 */
interface Ikon {
  paths: string[]
  color: string
}

const IKON_TOPIK: Record<string, Ikon> = {
  Penjualan: {
    paths: ['M4 19h16', 'M7 16V9', 'M12 16V5', 'M17 16v-4'],
    color: '#1D4ED8',
  },
  Pemasaran: {
    paths: ['M3 11l16-6-4 16-4-7-8-3z'],
    color: '#A21CAF',
  },
  Keuangan: {
    paths: ['M12 3v18', 'M8 7h6a2.5 2.5 0 0 1 0 5H9a2.5 2.5 0 0 0 0 5h7'],
    color: '#BE123C',
  },
  Operasional: {
    paths: [
      'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
      'M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 6.6 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 12.4H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.6 5.8z',
    ],
    color: '#0EA5A0',
  },
  SDM: {
    paths: [
      'M9 11a3 3 0 1 0 0-.1',
      'M3 20c0-3 2.7-5 6-5s6 2 6 5',
      'M16 4a3 3 0 0 1 0 6',
      'M18 15c2 .5 3 2 3 5',
    ],
    color: '#B45309',
  },
  Produk: {
    paths: ['M21 8l-9-5-9 5 9 5 9-5z', 'M3 8v8l9 5 9-5V8', 'M12 13v8'],
    color: '#0F766E',
  },
  Teknologi: {
    paths: ['M8 3H4v18h4M16 3h4v18h-4M9 12h6'],
    color: '#7C3AED',
  },
  Geospasial: {
    paths: ['M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z', 'M12 12a2.5 2.5 0 1 0 0-.1'],
    color: '#0369A1',
  },
  /** Bukan topik dari database — pintasan ke dokumentasi API, seperti di desain. */
  'Real-time APIs': {
    paths: ['M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0', 'M12 7v5l3 2'],
    color: '#0EA5A0',
  },
}

/** Dipakai untuk topik baru yang belum punya ikon khusus. */
const BAWAAN: Ikon = { paths: ['M4 6h16', 'M4 12h16', 'M4 18h10'], color: '#1B54C4' }

export function TopicIcon({ name, size = 18 }: { name: string; size?: number }) {
  const ikon = IKON_TOPIK[name] ?? BAWAAN

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={ikon.color}
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {ikon.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
