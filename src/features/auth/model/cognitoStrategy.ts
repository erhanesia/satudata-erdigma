import { notifySessionChanged } from './sessionSignal'
import type { AuthStrategy } from './types'

/**
 * Token akses disimpan di **memori modul**, bukan localStorage maupun
 * sessionStorage.
 *
 * Alasannya: apa pun yang ada di Web Storage bisa dibaca skrip mana pun yang
 * berhasil berjalan di halaman ini. Satu celah XSS — dari dependensi pihak
 * ketiga sekalipun — langsung berubah menjadi pencurian token. Token di memori
 * ikut hilang saat tab di-refresh, dan itu memang konsekuensi yang diterima:
 * penyegaran sesi menjadi tugas refresh token pada cookie httpOnly, yang tidak
 * bisa disentuh JavaScript.
 */
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
  notifySessionChanged()
}

export function getAccessToken(): string | null {
  return accessToken
}

/**
 * Strategi untuk integrasi Cognito.
 *
 * BELUM TERSAMBUNG. Alur masuk (redirect ke Hosted UI, pertukaran kode
 * otorisasi, penyegaran token) menyusul ketika tim HRIS memberi client id untuk
 * Satu Data di user pool yang sama dengan hris-api. Bentuk berkas ini sudah
 * final: saat itu tiba, hanya isi fungsi di bawah yang diisi — halaman login,
 * penjaga rute, maupun berkas fitur tidak ada yang ikut berubah.
 */
export function createCognitoStrategy(): AuthStrategy {
  return {
    mode: 'cognito',

    getAuthHeaders(): Record<string, string> {
      return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    },

    hasSession() {
      return accessToken !== null
    },

    signIn() {
      // Di sinilah nanti `window.location.assign(hostedUiUrl)` dipasang.
      // Sengaja dibiarkan melempar, bukan diam-diam tidak melakukan apa pun:
      // tombol yang tidak bereaksi jauh lebih sulit dilacak daripada pesan yang
      // menyebutkan apa yang belum ada.
      throw new Error(
        'Alur masuk Cognito belum tersambung — menunggu client id dari tim HRIS.',
      )
    },

    clearSession() {
      accessToken = null
      notifySessionChanged()
    },
  }
}
