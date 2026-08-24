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
   *  - `cognito` — `identity` diabaikan. Memanggilnya me-redirect keluar
   *                halaman ke Hosted UI dan tidak pernah kembali, jadi kode
   *                setelah pemanggilan tidak dijalankan.
   */
  signIn(identity?: string): void

  /** Membersihkan sesi. Dipanggil interceptor saat menerima 401. */
  clearSession(): void
}

/**
 * Identitas dummy untuk pengujian lokal.
 *
 * Daftar ini cocok dengan changeset Liquibase 00010, 00018, 00019, dan 00032 —
 * sepuluh karyawan awal ditambah satu akun untuk SETIAP posisi akses, supaya
 * tiap cabang aturan "siapa boleh melihat dataset apa" bisa dibuktikan dengan
 * masuk sebagai orangnya, bukan dengan membaca kode.
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
  /**
   * Posisi yang menentukan dataset mana boleh dilihat — kolom
   * `users.access_position`, milik portal ini, bukan salinan kolom HRIS.
   */
  accessPosition: string
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
    accessPosition: 'Project Manager',
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
    accessPosition: 'Direksi',
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
    accessPosition: 'General Manager',
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
    accessPosition: 'Manager',
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
    accessPosition: 'Manager',
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
    accessPosition: 'Team Lead',
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
    accessPosition: 'Data Analyst',
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
    accessPosition: 'Staff',
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
    accessPosition: 'Magang',
  },
  {
    cognitoSub: 'dummy-pos-direksi',
    name: 'Wibowo Hartanto',
    position: 'Direktur Operasi',
    jobLevel: 'Direktur',
    divisionCode: 'DNA',
    divisionColor: '#047857',
    role: 'ADMIN',
    hrisLevel: 'DIRECTOR',
    accessPosition: 'Direksi',
    note: 'Berperan ADMIN, jadi melewati seluruh pembatasan posisi.',
  },
  {
    cognitoSub: 'dummy-pos-gm',
    name: 'Ratna Wijayanti',
    position: 'General Manager Produk',
    jobLevel: 'General Manager',
    divisionCode: 'PROD',
    divisionColor: '#0F766E',
    role: 'ADMIN',
    hrisLevel: 'DIRECTOR',
    accessPosition: 'General Manager',
    note: 'Berperan ADMIN, jadi melewati seluruh pembatasan posisi.',
  },
  {
    cognitoSub: 'dummy-pos-manager',
    name: 'Hendra Saputra',
    position: 'Manager Infrastruktur',
    jobLevel: 'Manager',
    divisionCode: 'IT',
    divisionColor: '#7C3AED',
    role: 'PUBLISHER',
    hrisLevel: 'MANAGER',
    accessPosition: 'Manager',
  },
  {
    cognitoSub: 'dummy-pos-pm',
    name: 'Laras Ayuningtyas',
    position: 'Project Manager Data & IT',
    jobLevel: 'Junior Manager',
    divisionCode: 'DNA',
    divisionColor: '#047857',
    role: 'PUBLISHER',
    hrisLevel: 'MANAGER',
    accessPosition: 'Project Manager',
  },
  {
    cognitoSub: 'dummy-pos-lead',
    name: 'Bimo Prakoso',
    position: 'Team Lead Backend',
    jobLevel: 'Supervisor',
    divisionCode: 'PROD',
    divisionColor: '#0F766E',
    role: 'PUBLISHER',
    hrisLevel: 'MANAGER',
    accessPosition: 'Team Lead',
  },
  {
    cognitoSub: 'dummy-pos-analis',
    name: 'Kirana Melati',
    position: 'Data Analyst',
    jobLevel: 'Specialist',
    divisionCode: 'DNA',
    divisionColor: '#047857',
    role: 'STAFF',
    hrisLevel: 'STAFF',
    accessPosition: 'Data Analyst',
    note: 'Pasangan uji terbaik: BOLEH membuka dataset bertag Data Analyst.',
  },
  {
    cognitoSub: 'dummy-pos-staffsenior',
    name: 'Galih Ramadhan',
    position: 'Analis Keuangan Senior',
    jobLevel: 'Specialist',
    divisionCode: 'FIN',
    divisionColor: '#BE123C',
    role: 'STAFF',
    hrisLevel: 'STAFF',
    accessPosition: 'Staff Senior',
  },
  {
    cognitoSub: 'dummy-pos-staff',
    name: 'Nabila Zahra',
    position: 'Staf Administrasi Penjualan',
    jobLevel: 'Staff',
    divisionCode: 'SALES',
    divisionColor: '#1B54C4',
    role: 'STAFF',
    hrisLevel: 'STAFF',
    accessPosition: 'Staff',
    note: 'Pasangan uji terbaik: DITOLAK pada dataset yang sama.',
  },
  {
    cognitoSub: 'dummy-pos-magang',
    name: 'Arif Setiawan',
    position: 'Magang Sumber Daya Manusia',
    jobLevel: 'Non Staff',
    divisionCode: 'HR',
    divisionColor: '#B45309',
    role: 'STAFF',
    hrisLevel: 'STAFF',
    accessPosition: 'Magang',
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
    accessPosition: 'Staff',
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
