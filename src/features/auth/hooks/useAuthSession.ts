import { useSyncExternalStore } from 'react'

import { authStrategy } from '../model/authStrategy'
import { subscribeSession } from '../model/sessionSignal'

/**
 * Apakah saat ini ada sesi aktif — dalam bentuk yang React ikut memperhatikan.
 *
 * `authStrategy.hasSession()` saja tidak cukup: nilainya berubah di luar React
 * (sessionStorage, memori modul, interceptor 401), sehingga komponen tidak akan
 * pernah dirender ulang. `useSyncExternalStore` menjembatani keduanya dengan
 * benar, termasuk saat React merender secara terpotong-potong.
 */
export function useAuthSession(): boolean {
  return useSyncExternalStore(
    subscribeSession,
    () => authStrategy.hasSession(),
    // Nilai saat render di server. Aplikasi ini tidak melakukannya, tapi
    // parameter ini wajib agar hook tetap aman kalau kelak dipakai di SSR.
    () => false,
  )
}
