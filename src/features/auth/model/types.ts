/**
 * Seam autentikasi.
 *
 * Ini cerminan port `EmployeeDirectory` di back-end: satu-satunya tempat di
 * seluruh front-end yang tahu bagaimana identitas dibuktikan ke server. Kode
 * fitur cukup memanggil `httpClient` dan tidak pernah menyentuh token maupun
 * header autentikasi.
 *
 * Saat integrasi HRIS/Cognito tiba, yang berubah hanya `cognitoStrategy.ts`.
 * Tidak ada satu pun berkas di `features/dataset`, `features/collection`,
 * dan seterusnya yang perlu disunting — halaman login pun tidak.
 */

export type AuthMode = 'dummy' | 'cognito'

export interface AuthStrategy {
  readonly mode: AuthMode

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
   * Bentuknya berbeda jauh antar-mode, dan itu memang inti dari seam ini:
   *  - `dummy`   — `identity` wajib berisi salah satu `cognitoSub` di bawah.
   *                Selesai seketika, tanpa jaringan.
   *  - `cognito` — `identity` diabaikan. Panggilannya sendiri kembali segera;
   *                pengalihan ke Hosted UI baru terjadi satu microtask
   *                kemudian (menunggu PKCE challenge dihitung). Pemanggil
   *                wajib menunggu (`await`) promise ini untuk menangkap galat
   *                yang bisa muncul sebelum pengalihan sempat terjadi, mis.
   *                `crypto.subtle` tidak tersedia di origin non-HTTPS, atau
   *                `sessionStorage.setItem` dilempar di mode privat Safari.
   */
  signIn(identity?: string): void | Promise<void>

  /** Membersihkan sesi. Dipanggil interceptor saat menerima 401. */
  clearSession(): void

  /**
   * Keluar atas kehendak pengguna.
   *
   * Berbeda dari `clearSession()`, yang dipanggil interceptor ketika server
   * menolak sesi: di mode Cognito, `signOut()` juga mematikan sesi Hosted UI.
   * Tanpa itu, re-auth senyap langsung memasukkan orang itu kembali dan tombol
   * keluar tampak rusak.
   */
  signOut(): void

  /**
   * Menyegarkan token akses. Mengembalikan `true` bila berhasil.
   *
   * Opsional: mode dummy tidak punya token untuk disegarkan, dan cabang
   * penyegaran di `httpClient` memang tidak pernah aktif di sana.
   */
  refresh?(): Promise<boolean>
}

/**
 * Identitas dummy untuk pengujian lokal.
 *
 * Daftar ini cocok dengan changeset Liquibase 00010, 00018, dan 00019 —
 * sepuluh orang, kedelapan divisi, kelima tingkat izin HRIS.
 *
 * Hanya `cognitoSub` yang benar-benar dikirim ke server. Sisanya sekadar bahan
 * tampilan untuk kartu di halaman login, karena saat itu belum ada sesi
 * sehingga `GET /api/v1/me` belum bisa dipanggil. Begitu masuk, seluruh
 * identitas yang ditampilkan aplikasi datang dari server, bukan dari sini.
 */
export interface DummyIdentity {
  cognitoSub: string
  name: string
  /** Jabatan. Satu-satunya kolom yang dikarang — lihat changeset 00019. */
  position: string
  /** Nilai harfiah dari enum `JobLevel` milik hris-api. */
  jobLevel: string
  divisionCode: string
  /** `division.logo_bg` dari changeset 00008, supaya avatar sewarna dengan divisinya. */
  divisionColor: string
  role: string
  hrisLevel: string
  note?: string
}

export const DUMMY_IDENTITIES: readonly DummyIdentity[] = [
  {
    cognitoSub: 'dummy-admin',
    name: 'M. Fahrega Ridwan',
    position: 'Project Manager Data & IT',
    jobLevel: 'Admin',
    divisionCode: 'DNA',
    divisionColor: '#047857',
    role: 'ADMIN',
    hrisLevel: 'ADMIN',
  },
  {
    cognitoSub: 'dummy-director',
    name: 'Bagas Direktur Utama',
    position: 'Direktur Utama',
    jobLevel: 'Direktur Utama',
    divisionCode: 'DNA',
    divisionColor: '#047857',
    role: 'ADMIN',
    hrisLevel: 'DIRECTOR',
  },
  {
    cognitoSub: 'dummy-gm',
    name: 'Prasetyo Nugroho',
    position: 'General Manager Produk',
    jobLevel: 'General Manager',
    divisionCode: 'PROD',
    divisionColor: '#0F766E',
    role: 'ADMIN',
    hrisLevel: 'DIRECTOR',
  },
  {
    cognitoSub: 'dummy-corpsec',
    name: 'Rani Corporate Secretary',
    position: 'Corporate Secretary',
    jobLevel: 'Staff',
    divisionCode: 'FIN',
    divisionColor: '#BE123C',
    role: 'PUBLISHER',
    hrisLevel: 'CORPORATE_SECRETARY',
    note: 'Satu-satunya jabatan yang namanya benar-benar tertulis di kode hris-api.',
  },
  {
    cognitoSub: 'dummy-manager',
    name: 'Dimas Manager IT',
    position: 'Manager Teknologi Informasi',
    jobLevel: 'Manager',
    divisionCode: 'IT',
    divisionColor: '#7C3AED',
    role: 'PUBLISHER',
    hrisLevel: 'MANAGER',
  },
  {
    cognitoSub: 'dummy-coordinator',
    name: 'Anisa Rahmawati',
    position: 'Koordinator Kampanye Digital',
    jobLevel: 'Coordinator',
    divisionCode: 'MKT',
    divisionColor: '#A21CAF',
    role: 'PUBLISHER',
    hrisLevel: 'MANAGER',
    note: 'Jenjang terendah yang masih dihitung MANAGER oleh HRIS.',
  },
  {
    cognitoSub: 'dummy-specialist',
    name: 'Sinta Data Specialist',
    position: 'Data Specialist',
    jobLevel: 'Specialist',
    divisionCode: 'DNA',
    divisionColor: '#047857',
    role: 'STAFF',
    hrisLevel: 'STAFF',
  },
  {
    cognitoSub: 'dummy-staff',
    name: 'Karyawan Divisi Penjualan',
    position: 'Staff Penjualan',
    jobLevel: 'Staff',
    divisionCode: 'SALES',
    divisionColor: '#1B54C4',
    role: 'STAFF',
    hrisLevel: 'STAFF',
  },
  {
    cognitoSub: 'dummy-nonstaff',
    name: 'Yusuf Maulana',
    position: 'Administrasi Umum',
    jobLevel: 'Non Staff',
    divisionCode: 'HR',
    divisionColor: '#B45309',
    role: 'STAFF',
    hrisLevel: 'STAFF',
  },
  {
    cognitoSub: 'dummy-resigned',
    name: 'Karyawan Sudah Resign',
    position: 'Staff Operasional',
    jobLevel: 'Staff',
    divisionCode: 'OPS',
    divisionColor: '#0EA5A0',
    role: 'STAFF',
    hrisLevel: 'STAFF',
    note: 'Sengaja ditolak server (403) — untuk menguji jalur karyawan keluar.',
  },
] as const

/**
 * "M. Fahrega Ridwan" -> "FR".
 *
 * Salinan aturan `MeService.buildInitials` di back-end, dan back-end tetap yang
 * berwenang: begitu sesi menyala, avatar di header memakai `initials` dari
 * `GET /api/v1/me`. Fungsi ini hanya untuk halaman login, saat belum ada sesi
 * sehingga tidak ada yang bisa ditanya.
 */
export function initialsOf(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Za-z]/g, ''))
    .filter(Boolean)

  const meaningful = words.filter((part) => part.length > 1)
  const source = meaningful.length > 0 ? meaningful : words

  return source.slice(0, 2).map((part) => part[0]!.toUpperCase()).join('') || '?'
}
