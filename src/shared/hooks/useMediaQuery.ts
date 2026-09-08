import { useEffect, useState } from 'react'

/**
 * Mengikuti sebuah media query, dan ikut berubah saat jendelanya berubah.
 *
 * <h2>Kenapa lewat JavaScript, bukan cukup kelas Tailwind</h2>
 *
 * Untuk sekadar menyembunyikan sesuatu, `md:hidden` sudah cukup dan lebih murah.
 * Hook ini dipakai justru ketika keputusannya bukan soal tampil atau tidak,
 * melainkan soal APAKAH SESUATU DIKERJAKAN SAMA SEKALI.
 *
 * Contoh yang membuatnya ada: pratinjau PDF mengunduh seluruh berkasnya lebih
 * dulu lewat XHR. Menyembunyikannya dengan CSS berarti ponsel tetap mengunduh
 * berkas puluhan megabita, lalu membuangnya tanpa pernah menampilkannya. Yang
 * hemat kuota adalah tidak memintanya sejak awal, dan itu keputusan JavaScript.
 *
 * <h2>Nilai awalnya dibaca langsung, bukan `false`</h2>
 *
 * Memulai dari `false` lalu membetulkannya di efek membuat komponen menggambar
 * versi layar lebar sekejap sebelum berganti — dan untuk pratinjau PDF, kedipan
 * itu sudah cukup untuk memicu permintaan yang justru ingin dihindari.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false
    }
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }
    const list = window.matchMedia(query)
    // Disamakan sekali di sini juga: antara render pertama dan efek ini
    // berjalan, jendelanya bisa saja sudah berubah ukuran.
    setMatches(list.matches)

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/**
 * Ambang yang dipakai memutuskan tampilan ponsel, disamakan dengan titik `md`
 * milik Tailwind.
 *
 * Satu tempat, bukan ditulis ulang di tiap pemakainya: kalau angkanya berbeda
 * antara CSS dan JavaScript, akan ada rentang lebar sempit di mana keduanya
 * tidak sepakat — dan cacat semacam itu hanya muncul pada ukuran layar tertentu,
 * yang justru paling jarang diuji.
 */
export const MOBILE_QUERY = '(max-width: 767px)'

/** Jalan pintas untuk pemakaian yang paling sering. */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY)
}
