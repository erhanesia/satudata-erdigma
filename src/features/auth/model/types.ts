/**
 * Seam autentikasi.
 *
 * Ini cerminan port `EmployeeDirectory` di back-end: satu-satunya tempat di
 * seluruh front-end yang tahu bagaimana identitas dibuktikan ke server. Kode
 * fitur cukup memanggil `httpClient` dan tidak pernah menyentuh token maupun
 * header autentikasi.
 */

export interface AuthStrategy {
  /**
   * Header yang disisipkan ke setiap permintaan. Dipanggil per-permintaan,
   * bukan sekali saat boot, supaya token yang baru disegarkan langsung terpakai.
   */
  getAuthHeaders(): Record<string, string>

  /** Apakah ada sesi aktif. Menentukan perlu-tidaknya memanggil /me. */
  hasSession(): boolean

  /**
   * Menyalakan sesi.
   *
   * Panggilannya sendiri kembali segera; pengalihan ke Hosted UI baru terjadi
   * satu microtask kemudian (menunggu PKCE challenge dihitung). Pemanggil
   * wajib menunggu (`await`) promise ini untuk menangkap galat yang bisa
   * muncul sebelum pengalihan sempat terjadi, mis. `crypto.subtle` tidak
   * tersedia di origin non-HTTPS, atau `sessionStorage.setItem` dilempar di
   * mode privat Safari.
   */
  signIn(): void | Promise<void>

  /** Membersihkan sesi. Dipanggil interceptor saat menerima 401. */
  clearSession(): void

  /**
   * Keluar atas kehendak pengguna.
   *
   * Berbeda dari `clearSession()`, yang dipanggil interceptor ketika server
   * menolak sesi: `signOut()` juga mematikan sesi Hosted UI. Tanpa itu,
   * re-auth senyap langsung memasukkan orang itu kembali dan tombol keluar
   * tampak rusak.
   */
  signOut(): void

  /** Menyegarkan token akses. Mengembalikan `true` bila berhasil. */
  refresh(): Promise<boolean>
}
