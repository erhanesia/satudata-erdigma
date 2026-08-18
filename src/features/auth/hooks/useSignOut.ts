import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { authStrategy } from '../model/authStrategy'

/**
 * Keluar dari sesi.
 *
 * Tidak perlu memanggil `navigate` sendiri: membersihkan sesi memicu
 * `sessionSignal`, ProtectedRoute ikut dirender ulang, dan pengalihan ke
 * halaman login terjadi lewat jalur yang sama seperti saat sesi kedaluwarsa.
 * Satu jalur untuk dua sebab, jadi tidak ada versi kedua yang bisa berbeda
 * perilakunya.
 */
export function useSignOut(): () => void {
  const queryClient = useQueryClient()

  return useCallback(() => {
    authStrategy.clearSession()
    // Wajib, dan wajib setelah sesi dibersihkan: cache react-query memuat data
    // per-pengguna (API key dan /me). Kalau ditinggalkan, orang berikutnya yang
    // masuk di tab yang sama akan melihat milik pendahulunya selama beberapa
    // saat sebelum permintaan baru selesai.
    queryClient.clear()
  }, [queryClient])
}
