import { env } from '@/shared/config/env'

import {
  completeSignIn,
  createCognitoStrategy,
  lupakanPernahMasuk,
  pernahMasuk,
} from './cognitoStrategy'
import { createDummyStrategy } from './dummyStrategy'
import type { AuthStrategy } from './types'

/**
 * Satu-satunya tempat yang memilih implementasi autentikasi.
 *
 * Padanan `@Profile("auth-dummy")` di back-end: pilihan dibuat sekali di batas
 * aplikasi, lalu seluruh kode di dalamnya bekerja lewat antarmuka yang sama.
 */
export const authStrategy: AuthStrategy =
  env.authMode === 'cognito' ? createCognitoStrategy() : createDummyStrategy()

/**
 * Dijalankan sekali sebelum aplikasi dirender.
 *
 * Dua tugas, keduanya harus selesai sebelum router pertama kali membaca
 * alamat halaman:
 *
 *  1. Menyelesaikan kepulangan dari Hosted UI bila ada `?code=` di alamat.
 *  2. Memulihkan sesi yang hilang karena tab dimuat ulang. Token hanya hidup
 *     di memori, tapi Cognito masih memegang cookie sesinya sendiri — jadi
 *     satu kunjungan ke /oauth2/authorize memantul balik tanpa pengguna
 *     melihat formulir apa pun.
 *
 * @returns `true` bila aplikasi boleh dirender, `false` bila peramban sedang
 *          berpindah ke Hosted UI dan tidak ada gunanya merender apa pun.
 */
export async function bootstrapAuth(): Promise<boolean> {
  if (authStrategy.mode !== 'cognito') return true

  await completeSignIn()
  if (authStrategy.hasSession()) return true

  // Belum pernah masuk di tab ini: tampilkan halaman masuk, jangan menculik
  // orang yang baru pertama kali membuka portal ke halaman Cognito.
  if (!pernahMasuk()) return true

  // Penanda dihapus SEBELUM berangkat, bukan sesudah. Inilah penjaga loop:
  // satu percobaan otomatis per rantai muat halaman. Kalau Cognito memantulkan
  // balik tanpa sesi, pengguna mendarat di /login dan menekan tombol sendiri.
  lupakanPernahMasuk()
  authStrategy.signIn()
  return false
}
