import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

/**
 * Batas untuk membedakan "sudah terlihat sejak halaman dimuat" dari "baru
 * terlihat karena digulir".
 */
const LOAD_THRESHOLD_MS = 400

interface RevealProps {
  children: ReactNode
  /**
   * Jeda mulai (ms), **hanya berlaku bila elemen sudah terlihat sejak halaman
   * dimuat** — supaya ia mengantre di belakang animasi hero alih-alih muncul
   * mendahuluinya.
   *
   * Begitu elemen baru terlihat karena digulir, jeda diabaikan. Menunggu
   * setengah detik setelah sesuatu masuk layar terasa seperti aplikasi yang
   * tersendat, bukan seperti animasi.
   */
  delay?: number
  className?: string
}

/**
 * Menampilkan isinya dengan animasi `rise` saat pertama kali masuk pandangan.
 *
 * Kenapa tidak cukup `animate-rise` + `animationDelay` seperti di hero: animasi
 * berbasis jeda mulai berjalan sejak halaman dimuat. Untuk bagian yang berada
 * di bawah lipatan, animasinya sudah selesai jauh sebelum pengguna sampai ke
 * sana — yang terlihat justru tidak ada animasi sama sekali. Itulah yang
 * terjadi pada seluruh bagian di bawah bilah statistik.
 *
 * Gerakannya sengaja memakai keyframe `rise` yang sama dengan hero, bukan kurva
 * baru. Satu halaman dengan dua bahasa gerak yang berbeda terasa tidak
 * disengaja.
 *
 * Pengguna yang menyalakan `prefers-reduced-motion` langsung mendapat isinya
 * tanpa animasi, tanpa perlu menunggu observer.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [effectiveDelay, setEffectiveDelay] = useState(delay)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }

    const loadedAt = performance.now()
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setEffectiveDelay(performance.now() - loadedAt < LOAD_THRESHOLD_MS ? delay : 0)
        setVisible(true)
        // Sekali tampil, selamanya tampil. Elemen yang berkedip lagi setiap
        // kali digulir naik-turun lebih mengganggu daripada membantu.
        observer.disconnect()
      },
      // Ditarik sedikit ke dalam supaya animasi mulai ketika bagian itu
      // benar-benar masuk pandangan, bukan saat piksel pertamanya menyentuh tepi.
      { threshold: 0.08, rootMargin: '0px 0px -8% 0px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div
      ref={ref}
      className={cn(visible ? 'animate-rise' : 'opacity-0', className)}
      style={visible && effectiveDelay > 0 ? { animationDelay: `${effectiveDelay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
