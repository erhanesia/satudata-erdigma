import { notifySessionChanged } from './sessionSignal'
import { DUMMY_IDENTITIES, type AuthStrategy } from './types'

/** Cocok dengan `DummyAuthFilter.COGNITO_SUB_HEADER` di back-end. */
const HEADER_SUB = 'X-Dummy-Cognito-Sub'

/**
 * Kunci sessionStorage — bukan localStorage. Pilihan sengaja: sessionStorage
 * ikut terhapus saat tab ditutup, sehingga identitas uji tidak bertahan
 * berhari-hari di mesin siapa pun.
 */
const STORAGE_KEY = 'satudata.dummy-sub'

/**
 * Strategi autentikasi untuk pengembangan lokal.
 *
 * Tidak ada token, tidak ada kriptografi: server percaya begitu saja pada isi
 * header. Itu sebabnya `env.ts` menolak build produksi yang masih memakai mode
 * ini, dan back-end punya `DummyAuthProfileGuard` untuk hal yang sama.
 */
export function createDummyStrategy(): AuthStrategy {
  return {
    mode: 'dummy',

    getAuthHeaders(): Record<string, string> {
      const sub = getDummySub()
      // Tanpa sesi, header sengaja tidak dikirim sama sekali. Server menjawab
      // 401 seperti seharusnya, alih-alih kita memalsukan identitas bawaan —
      // itulah yang dulu membuat aplikasi seolah selalu dalam keadaan masuk.
      return sub ? { [HEADER_SUB]: sub } : {}
    },

    hasSession() {
      return getDummySub() !== null
    },

    signIn(identity) {
      if (!identity) {
        throw new Error('Mode dummy membutuhkan identitas yang dipilih.')
      }
      if (!DUMMY_IDENTITIES.some((i) => i.cognitoSub === identity)) {
        throw new Error(`Identitas dummy tidak dikenal: ${identity}`)
      }
      sessionStorage.setItem(STORAGE_KEY, identity)
      notifySessionChanged()
    },

    clearSession() {
      sessionStorage.removeItem(STORAGE_KEY)
      notifySessionChanged()
    },
  }
}

/** Sub yang sedang dipakai, atau `null` bila belum ada yang masuk. */
export function getDummySub(): string | null {
  const stored = sessionStorage.getItem(STORAGE_KEY)
  if (!stored) return null

  // Nilai dari storage bisa disunting pengguna lewat DevTools. Diverifikasi
  // ulang terhadap daftar yang dikenal, bukan diteruskan mentah ke header HTTP.
  return DUMMY_IDENTITIES.some((i) => i.cognitoSub === stored) ? stored : null
}
