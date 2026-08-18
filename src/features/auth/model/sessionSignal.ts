/**
 * Pemberitahuan perubahan sesi.
 *
 * Sesi hidup di luar React — di sessionStorage untuk mode dummy, di memori
 * modul untuk mode Cognito. React tidak punya cara mengetahui keduanya berubah,
 * padahal justru saat itulah pengguna harus dilempar ke halaman login.
 *
 * Kasus yang membuat ini perlu, dan tidak bisa ditangani dengan state biasa:
 * interceptor 401 di `httpClient` membersihkan sesi dari dalam sebuah
 * permintaan HTTP, jauh dari komponen mana pun. Tanpa sinyal ini, aplikasi
 * tetap menampilkan kerangka halaman yang seluruh isinya gagal dimuat.
 *
 * Dipakai lewat `useAuthSession()` yang membungkusnya dengan
 * `useSyncExternalStore`.
 */
const listeners = new Set<() => void>()

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifySessionChanged(): void {
  for (const listener of listeners) {
    listener()
  }
}
