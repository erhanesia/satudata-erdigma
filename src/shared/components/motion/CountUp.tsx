import { useEffect, useRef, useState } from 'react'

/**
 * Lama hitungan berjalan, dalam milidetik.
 *
 * Seragam untuk semua angka, berapa pun besarnya. Kalau durasinya dibuat
 * sebanding dengan nilai, "56 jt" masih berlari saat "8" sudah lama diam — yang
 * terlihat bukan satu gerakan, melainkan enam yang kebetulan bersamaan.
 */
const DURASI = 1400

/**
 * Ambang untuk membedakan "sudah terlihat sejak halaman dimuat" dari "baru
 * terlihat karena digulir". Sama dengan yang dipakai `Reveal`, dan karena
 * alasan yang sama.
 */
const AMBANG_MUAT_MS = 400

/**
 * Melambat di ujung, sewatak dengan cubic-bezier(.16,1,.3,1) milik keyframe
 * `rise`. Angkanya melesat di awal lalu merapat pelan ke nilai akhir — bukan
 * naik rata seperti penghitung mundur.
 */
function easeOut(t: number): number {
  return 1 - (1 - t) ** 3
}

function kurangiGerak(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface CountUpProps {
  value: number | null | undefined

  /**
   * Pemformat angka, mis. `formatCompact`. Dipanggil setiap bingkai, jadi
   * berikan fungsi yang identitasnya stabil (deklarasi tingkat modul), bukan
   * arrow yang dibuat ulang tiap render.
   */
  format: (value: number | null | undefined) => string

  /**
   * Jeda mulai (ms), **hanya berlaku bila elemen sudah terlihat sejak halaman
   * dimuat** — supaya hitungan mengantre di belakang animasi masuk kartunya,
   * tidak mendahului. Begitu elemen baru terlihat karena digulir, jeda
   * diabaikan.
   */
  delay?: number

  className?: string
}

/**
 * Angka yang dihitung naik dari nol sampai nilai sesungguhnya.
 *
 * Tiga hal yang membuatnya tidak sekadar `setInterval`:
 *
 *  - **Mulai saat terlihat.** Hitungan berbasis jeda mulai berjalan sejak
 *    komponen dipasang. Untuk sel yang berada di bawah lipatan, animasinya
 *    sudah selesai jauh sebelum pengguna sampai ke sana — yang terlihat justru
 *    tidak ada animasi sama sekali.
 *  - **Melanjutkan, bukan mengulang.** Saat react-query menyegarkan data,
 *    angkanya berjalan dari yang sedang tampil ke nilai baru. Kembali ke nol
 *    tiap kali data disegarkan akan terbaca sebagai kedip, bukan pembaruan.
 *  - **Diam bagi yang meminta diam.** `prefers-reduced-motion` langsung
 *    mendapat nilai akhirnya, tanpa satu bingkai pun.
 *
 * Pembaca layar juga tidak ikut dibisingi: yang diumumkan hanya nilai akhir.
 */
export function CountUp({ value, format, delay = 0, className }: CountUpProps) {
  const target = typeof value === 'number' && Number.isFinite(value) ? value : null

  const ref = useRef<HTMLSpanElement>(null)

  /** Angka yang sedang tampil — titik awal animasi berikutnya. */
  const sekarangRef = useRef(0)

  /**
   * Pemformat disimpan di ref supaya identitas fungsinya tidak ikut memicu
   * ulang efek. Animasi yang restart di tengah jalan terbaca sebagai kedip.
   */
  const formatRef = useRef(format)
  useEffect(() => {
    formatRef.current = format
  })

  const [teks, setTeks] = useState(() => format(target === null || kurangiGerak() ? value : 0))

  useEffect(() => {
    // Tidak ada angka untuk dihitung (null, undefined, atau NaN) — biarkan
    // pemformatnya yang memutuskan tampilannya, biasanya "—".
    if (target === null) {
      setTeks(formatRef.current(value))
      return
    }

    const el = ref.current
    if (kurangiGerak() || !el || typeof IntersectionObserver === 'undefined') {
      sekarangRef.current = target
      setTeks(formatRef.current(target))
      return
    }

    const dari = sekarangRef.current
    let raf = 0
    let timer = 0
    let mulai = 0

    const langkah = (now: number) => {
      if (!mulai) mulai = now
      const t = Math.min((now - mulai) / DURASI, 1)

      // Bingkai terakhir memakai target apa adanya. Hasil interpolasi bisa
      // meleset satu angka karena pembulatan, dan yang meleset itu justru
      // angka yang paling lama dipandang orang.
      const nilai = t === 1 ? target : Math.round(dari + (target - dari) * easeOut(t))
      sekarangRef.current = nilai

      // Dipanggil 60 kali sedetik, tapi React membatalkan render ketika
      // string-nya sama persis. Jadi yang benar-benar dirender hanya saat teks
      // yang tampak memang berubah — untuk "56 jt" itu puluhan kali, bukan
      // ratusan.
      setTeks(formatRef.current(nilai))

      if (t < 1) raf = requestAnimationFrame(langkah)
    }

    const dimuatPada = performance.now()
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()

        const jeda = performance.now() - dimuatPada < AMBANG_MUAT_MS ? delay : 0
        if (jeda > 0) {
          timer = window.setTimeout(() => {
            raf = requestAnimationFrame(langkah)
          }, jeda)
        } else {
          raf = requestAnimationFrame(langkah)
        }
      },
      // Ditarik sedikit ke dalam supaya hitungan mulai ketika selnya benar-benar
      // masuk pandangan, bukan saat piksel pertamanya menyentuh tepi. Nilainya
      // sama dengan `Reveal` agar keduanya bergerak serempak.
      { threshold: 0.08, rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      window.clearTimeout(timer)
      cancelAnimationFrame(raf)
    }
  }, [target, value, delay])

  return (
    <>
      <span ref={ref} className={className} aria-hidden="true">
        {teks}
      </span>
      {/* Angka yang berubah 60 kali sedetik hanya jadi kebisingan bagi pembaca
          layar. Yang diumumkan cukup nilai akhirnya. */}
      <span className="sr-only">{format(value)}</span>
    </>
  )
}
