# Integrasi Login Cognito — Satu Data Erdigma

Tanggal: 2026-08-20
Repositori tersentuh: `satudata-erdigma` (web), `satudata-erdigma-api` (Spring Boot)

## Masalah

Portal Satu Data belum punya login sungguhan. Seam autentikasi sudah berdiri —
`AuthStrategy` di front-end, `EmployeeDirectory` di back-end — tetapi jalur
Cognito-nya masih kosong:

- `cognitoStrategy.signIn()` melempar `Error('… menunggu client id dari tim HRIS')`.
- `EmployeeDirectory` hanya punya satu implementasi, `@Profile("auth-dummy")`.
  Begitu profil non-dummy menyala, `CustomJwtAuthenticationConverter` tidak
  mendapat bean dan aplikasi gagal start.
- `spring.security.oauth2.resourceserver.jwt.issuer-uri` hanya ada di profil
  `prod`, jadi profil `dev` tanpa `auth-dummy` juga tidak bisa jalan.

Nilai yang dulu ditunggu ternyata sudah ada di repositori lain dan tidak perlu
diminta ke siapa pun:

| Nilai | Isi | Sumber |
| --- | --- | --- |
| Issuer | `https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_9QsfQSnwN` | `hris-api/src/main/resources/application.properties:47` |
| User pool | `ap-southeast-1_9QsfQSnwN` | idem baris 41 |
| App client | `3bujv9976rnq1smm31kff4h9s5` | `hris-web/src/utils/static.ts:1-8` |
| Domain Hosted UI | `https://ap-southeast-19qsfqsnwn.auth.ap-southeast-1.amazoncognito.com` | idem baris 18 |
| hris-api dev | `https://hris-dev.api.zcode.id/api/v1` | `hris-web/.env` |
| hris-api prod | `https://hris.api.zcode.id/api/v1` | `hris-web/.env.prod` |

## Keputusan yang diambil

1. **Cakupan**: front-end dan back-end sekaligus, supaya login bisa diuji
   ujung-ke-ujung. Front-end saja hanya menghasilkan token yang tetap ditolak API.
2. **App client**: memakai ulang client hris `3bujv9976rnq1smm31kff4h9s5` di user
   pool yang sama. Tidak ada client baru, tidak ada perubahan di hris-web.
3. **Penyimpanan token**: memori modul saja, ditambah re-auth senyap. Tanpa
   endpoint tukar-token di back-end, cookie httpOnly tidak mungkin — Cognito
   menjawab pertukaran kode dengan JSON, bukan `Set-Cookie`.
4. **Asal baris `users`**: just-in-time dari hris-api saat login pertama, bukan
   seed manual. Semua karyawan langsung bisa masuk tanpa campur tangan.

## Prasyarat di luar kode

App client `3bujv9976rnq1smm31kff4h9s5` perlu tambahan **callback URL** dan
**sign-out URL** untuk Satu Data: `http://localhost:5174` beserta host dev dan
produksi Satu Data. Tanpa itu Cognito menolak dengan `redirect_mismatch`, dan
tidak ada baris kode yang bisa menutupinya. Perubahan ini tidak mengganggu
hris-web: daftar callback bersifat menambah.

## Front-end — `satudata-erdigma`

### Berkas yang berubah

| Berkas | Perubahan |
| --- | --- |
| `src/shared/config/env.ts` | tiga variabel Cognito baru + validasi |
| `src/features/auth/model/cognitoStrategy.ts` | isi seluruh stub |
| `src/features/auth/model/types.ts` | tambah `signOut()` dan `refresh?()` pada `AuthStrategy` |
| `src/features/auth/model/dummyStrategy.ts` | `signOut` = `clearSession` |
| `src/shared/api/httpClient.ts` | 401 memicu satu kali refresh + ulang permintaan |
| `src/main.tsx` | selesaikan callback, lalu re-auth senyap |
| `src/features/auth/hooks/useSignOut.ts` | panggil `authStrategy.signOut()` |
| `.env.example` | isi nilai nyata |

`LoginPage.tsx`, `ProtectedRoute.tsx`, `authStrategy.ts`, dan seluruh berkas di
`features/dataset`, `features/collection`, dan seterusnya: nol perubahan. Itu
memang janji yang ditulis di `types.ts`, dan rancangan ini menepatinya.

### Variabel lingkungan

```
VITE_COGNITO_DOMAIN=https://ap-southeast-19qsfqsnwn.auth.ap-southeast-1.amazoncognito.com
VITE_COGNITO_CLIENT_ID=3bujv9976rnq1smm31kff4h9s5
VITE_COGNITO_REDIRECT_URI=          # kosong = window.location.origin
```

Divalidasi di `env.ts` dengan `superRefine`: dua yang pertama wajib terisi bila
`VITE_AUTH_MODE=cognito`, dan aplikasi menolak start bila tidak. Menyusul pola
yang sudah ada di berkas itu — salah konfigurasi ketahuan saat start, bukan saat
pengguna menekan tombol masuk.

Ketiganya bukan rahasia. Client id publik memang dirancang untuk terlihat di
URL; PKCE-lah yang menjaga pertukaran kode, bukan kerahasiaan client id.

### `cognitoStrategy.ts`

Keadaan yang disimpan, seluruhnya di memori modul:

```ts
let accessToken: string | null
let refreshToken: string | null
let expiresAt: number | null      // epoch ms, cadangan untuk refresh proaktif
let refreshInFlight: Promise<boolean> | null
```

**`signIn()`** — membuat PKCE verifier (`crypto.getRandomValues`, 64 byte,
base64url) dan challenge S256 (`crypto.subtle.digest`), ditambah `state` acak.
Verifier dan `state` dititipkan di `sessionStorage` dengan kunci
`satudata.pkce-verifier` dan `satudata.oauth-state`; keduanya dihapus di
`completeSignIn()`, berhasil maupun gagal. Lalu:

```
GET {domain}/oauth2/authorize
  ?client_id={clientId}
  &response_type=code
  &scope=email+openid+phone+aws.cognito.signin.user.admin
  &redirect_uri={redirectUri}
  &state={state}
  &code_challenge={challenge}
  &code_challenge_method=S256
```

Dua beda sengaja dari hris-web, keduanya penting:

- **`/oauth2/authorize`, bukan `/login`.** hris-web memakai `/login`, yang selalu
  menampilkan formulir. `/oauth2/authorize` menghormati cookie sesi Cognito yang
  sudah ada dan langsung memantulkan pengguna kembali. Seluruh re-auth senyap
  bergantung pada perbedaan ini.
- **PKCE.** Aman ditambahkan tanpa menyentuh AWS: app client ini publik dan tidak
  punya secret, dan Cognito menerima `code_challenge` pada client mana pun.

Cakupan (`scope`) disamakan persis dengan hris-web supaya token yang dihasilkan
sama bentuknya — `aws.cognito.signin.user.admin` khususnya, karena hris-api
memakainya.

**`completeSignIn(): Promise<string | null>`** — dipanggil sekali dari
`main.tsx` sebelum React dirender. Tanpa `?code` di URL, langsung kembali `null`.
Bila ada:

1. Cocokkan `state` dengan yang di `sessionStorage`. Tidak cocok berarti balasan
   itu bukan milik permintaan kita: buang, jangan tukar. Perlindungan ini yang
   tidak dipunyai hris-web.
2. `POST {domain}/oauth2/token` dengan `grant_type=authorization_code`,
   `client_id`, `code`, `redirect_uri`, `code_verifier`.
3. Simpan `access_token`, `refresh_token`, dan `expires_in` ke memori;
   `notifySessionChanged()`.
4. `history.replaceState` membuang `code` dan `state` dari alamat, supaya kode
   otorisasi tidak tertinggal di riwayat peramban dan tidak ikut ter-bookmark.
5. Kembalikan tujuan yang tersimpan agar pengguna mendarat di halaman yang tadi
   dituju.

**`refresh(): Promise<boolean>`** — single-flight. Bila `refreshInFlight` sudah
terisi, pemanggil menunggu Promise yang sama. Lima permintaan yang serentak kena
401 karena itu hanya menghasilkan satu panggilan `/oauth2/token`. Bila balasan
memuat `refresh_token` baru, nilai itu menimpa yang lama — Cognito merotasi
refresh token, dan menyimpan yang basi adalah cara paling pasti membuat sesi
mati mendadak. Pola yang sama baru dipasang di
`hris-web/src/utils/axiosInstance.ts`.

**`signOut()`** — kosongkan memori, hapus penanda sesi, lalu
`{domain}/logout?client_id=…&logout_uri=…`. Wajib: kalau sesi Hosted UI
dibiarkan hidup, re-auth senyap langsung memasukkan orang itu kembali dan tombol
keluar tampak rusak.

`clearSession()` tetap seperti sekarang — hanya membersihkan memori, tanpa
redirect. Interceptor 401 memanggilnya, dan memancing redirect dari dalam
sebuah permintaan HTTP akan membuang pekerjaan pengguna tanpa peringatan.

### `types.ts` — `signOut()` dan `refresh?()`

`AuthStrategy` mendapat dua anggota baru:

```ts
/**
 * Keluar atas kehendak pengguna. Berbeda dari clearSession(), yang dipanggil
 * interceptor saat sesi ditolak server: di mode Cognito, signOut() juga
 * mematikan sesi Hosted UI.
 */
signOut(): void

/**
 * Menyegarkan token. Opsional: mode dummy tidak punya token untuk disegarkan,
 * dan cabang refresh di httpClient tidak pernah aktif di sana.
 */
refresh?(): Promise<boolean>
```

Implementasi dummy: `signOut()` memanggil `clearSession()`, `refresh` tidak ada.

### `httpClient.ts` — refresh saat 401

Interceptor respons yang ada sekarang langsung `clearSession()` pada
`unauthorized`. Diubah menjadi: bila `authStrategy.refresh` ada dan permintaan
ini belum pernah diulang, `await authStrategy.refresh()`, lalu ulang permintaan
sekali dengan header baru. Gagal refresh atau sudah pernah diulang →
`clearSession()` seperti sekarang.

Penanda "sudah pernah diulang" ditaruh di `config` permintaan, bukan di variabel
modul, supaya dua permintaan berbeda tidak saling menghabiskan jatah ulang.

### `main.tsx` — callback dan re-auth senyap

```
await completeSignIn()                       // menukar ?code bila ada
if (mode cognito && !hasSession()) {
  if (sessionStorage punya 'satudata.pernah-masuk') {
    sessionStorage.removeItem('satudata.pernah-masuk')   // sebelum redirect
    authStrategy.signIn()                                // tidak pernah kembali
    return
  }
}
createRoot(...).render(...)
```

Penanda `satudata.pernah-masuk` dipasang setelah pertukaran kode berhasil.
Penghapusannya **sebelum** redirect adalah penjaga loop: satu percobaan otomatis
per rantai muat halaman. Bila Cognito memantulkan balik tanpa sesi, pengguna
mendarat di `/login` dan menekan tombol sendiri, bukan berputar tanpa akhir.

Konsekuensi yang diterima: setiap muat ulang tab pada sesi yang masih hidup
menimbulkan satu perjalanan bolak-balik ke Cognito. Itu harga dari token yang
tidak pernah menyentuh Web Storage.

## Back-end — `satudata-erdigma-api`

### Berkas yang berubah

| Berkas | Perubahan |
| --- | --- |
| `application.yaml` | `issuer-uri` dan `hris.base-url` naik ke berkas induk |
| `application-prod.yaml` | hapus blok `issuer-uri` yang jadi kembar |
| `modules/user/port/EmployeeDirectory.java` | tambah metode 2-argumen bawaan |
| `config/CustomJwtAuthenticationConverter.java` | teruskan `jwt.getTokenValue()` |
| **baru** `modules/user/port/hris/HrisEmployeeDirectory.java` | `@Profile("!auth-dummy")` |
| **baru** `modules/user/port/hris/HrisRoleMapper.java` | pemetaan jenjang ke peran |
| **baru** `modules/user/port/hris/HrisMeResponse.java` | DTO tipis |
| **baru** `src/test/.../HrisRoleMapperTest.java` | tabel kasus |

### Konfigurasi

Di `application.yaml` (berlaku untuk semua profil, prod tetap boleh menimpa
lewat env):

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${COGNITO_ISSUER_URI:https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_9QsfQSnwN}

hris:
  base-url: ${HRIS_BASE_URL:https://hris-dev.api.zcode.id/api/v1}
```

Blok `issuer-uri` yang sekarang ada di `application-prod.yaml` dihapus karena
menjadi kembar; env var `COGNITO_ISSUER_URI` tetap jalan seperti sebelumnya.
Selama profil `auth-dummy` menyala, `oauth2ResourceServer` tidak dipasang
sehingga properti ini menganggur — tidak apa-apa, dan itu membuat peralihan
profil tidak lagi memerlukan penyuntingan konfigurasi.

### `EmployeeDirectory` — metode 2-argumen

```java
/**
 * Varian yang membawa token pemanggil, untuk implementasi yang perlu
 * bertanya ke HRIS atas nama orang itu. Bawaannya mengabaikan token supaya
 * implementasi yang membaca tabel lokal tidak perlu ikut berubah.
 */
default Optional<User> findByCognitoId(String cognitoId, String accessToken) {
    return findByCognitoId(cognitoId);
}
```

`CustomJwtAuthenticationConverter` memanggil varian ini dengan
`jwt.getTokenValue()`. `DummyAuthFilter` dan `CurrentUserService` tidak berubah:
saat `CurrentUserService` berjalan, baris `users` sudah pasti ada karena
converter menjalankannya lebih dulu di permintaan yang sama.

Kenapa token diambil dari converter dan bukan dari `SecurityContextHolder`:
converter berjalan **saat** autentikasi dibangun, sehingga `SecurityContext`
belum terisi. Objek `Jwt` di tangannya adalah satu-satunya tempat token mentah
tersedia pada titik itu.

### `HrisEmployeeDirectory`

```
findByCognitoId(sub, token):
  lokal = userRepository.findByCognitoId(sub)
  bila lokal ada dan updatedAt masih dalam 12 jam  -> kembalikan lokal
  jawaban = GET {hris.base-url}/user/me
              Authorization: Bearer {token}
  bila 401 / 403 / 404 / kosong                    -> Optional.empty()
  upsert(lokal, jawaban)                           -> kembalikan hasil upsert
```

Token yang dipakai adalah milik pengguna itu sendiri. Satu user pool, satu app
client — tidak perlu kredensial layanan, dan hris-api menilai izinnya persis
seperti saat orang itu membuka HRIS.

`Optional.empty()` menghasilkan `UsernameNotFoundException` lalu 401, jalur yang
sama dengan karyawan yang sudah resign. Front-end sudah menanganinya.

Bila hris-api tidak bisa dihubungi sama sekali (jaringan, 5xx) sementara baris
lokal sudah ada, baris lokal yang basi tetap dipakai dan kegagalannya dicatat di
log. Memutus akses seluruh portal karena HRIS sedang mati adalah hukuman yang
tidak sebanding.

Ambang 12 jam adalah pemotongan sadar dan akan ditandai komentar `ponytail:` di
kode: tanpa itu, setiap permintaan API memicu satu panggilan HTTP ke hris-api.
Jalur peningkatannya bila kesegaran data jadi masalah: webhook dari HRIS atau
tugas terjadwal, bukan memperkecil ambang.

Kolom yang diperbarui saat upsert: `email`, `name`, `position`
(`employee.position.name`), `jobLevel`, `hrisPermissionLevel`, `role`,
`division`. `cognitoId` diisi saat pembuatan dan tidak pernah diubah — itu
identitas barisnya.

`role` selalu dihitung ulang dari HRIS. Belum ada antarmuka untuk mengubah peran
secara manual, jadi tidak ada yang bisa tertimpa; bila kelak ada, keputusan ini
harus ditinjau ulang.

### `HrisRoleMapper`

Salinan `PermissionLevelHelper` milik hris-api. Disalin, bukan dipanggil, karena
`GET /api/v1/user/me` tidak mengembalikan tingkat izin — hanya bahan mentahnya
(`role`, `employee.jobLevel`, `employee.position.name`).

```
role == ADMIN                                          -> ADMIN
jobLevel  Direktur | Direktur Utama | General Manager   -> DIRECTOR
position "Corporate Secretary" dan jenjang staf         -> CORPORATE_SECRETARY
jobLevel  Manager | Junior Manager | Senior Manager
        | Supervisor | Coordinator                      -> MANAGER
selain itu                                              -> STAFF
```

lalu ke `Role` portal:

```
ADMIN, DIRECTOR                 -> Role.ADMIN
CORPORATE_SECRETARY, MANAGER    -> Role.PUBLISHER
STAFF                           -> Role.STAFF
```

Pemetaan kedua ini bukan karangan: ia dibaca dari tabel sepuluh identitas dummy
di `features/auth/model/types.ts`, sehingga perilaku mode dummy dan mode Cognito
tetap sama.

Satu penyimpangan sengaja dari hris-api: jenjang yang tidak dikenal **tidak**
melempar `IllegalArgumentException`, melainkan menjadi `STAFF` disertai log
peringatan. Menolak karyawan sah gara-gara HR menambah nama jenjang baru lebih
merugikan daripada memberinya hak terendah, dan log-nya memberi tahu bahwa
daftar perlu diperbarui.

### `HrisMeResponse`

DTO tipis, `@JsonIgnoreProperties(ignoreUnknown = true)`, hanya memuat yang
dipakai:

```
email
role                              (string; enum hris tidak diimpor)
employee.name
employee.jobLevel
employee.position.name
employee.departement.id
```

Balasan `/user/me` yang asli jauh lebih besar — kebijakan izin, gedung, atasan,
tribe. Memetakan seluruhnya berarti mengikat Satu Data pada bentuk internal
HRIS; enam ruas ini yang benar-benar dibutuhkan.

### Divisi

Dicocokkan lewat `division.hris_departement_id = employee.departement.id`. Kolom
itu masih `null` untuk kedelapan divisi seed (changeset 00008 berisi data
prototipe, bukan departemen HRIS sungguhan), sehingga **untuk sementara pengguna
hasil provisioning JIT punya divisi `null`**.

Itu tidak memecahkan apa pun: `User.division` sudah `nullable`,
`CurrentUserService` menjaganya dengan pemeriksaan null sebelum inisialisasi
lazy, `MeService.toResponse` melewatinya bila kosong, dan `UserResponse.division`
boleh absen. Pengisian `hris_departement_id` adalah pekerjaan berikutnya, di
luar cakupan spec ini.

## Pengujian

`HrisRoleMapperTest` — kesepuluh identitas dummy di `types.ts` menjadi tabel
kasus, ditambah satu jenjang tak dikenal yang harus menghasilkan `STAFF` dan
bukan lemparan. Itu satu-satunya logika bercabang yang ditambahkan, dan
satu-satunya yang bisa salah tanpa terlihat.

Front-end tidak punya kerangka uji dan spec ini tidak menambahkannya. Alur
Cognito diverifikasi dengan menjalankannya: `VITE_AUTH_MODE=cognito` melawan
hris-api dev.

## Di luar cakupan

- Endpoint tukar-token dan cookie httpOnly di satudata-api.
- Pengisian `division.hris_departement_id`.
- Antarmuka pengubahan peran secara manual.
- Perubahan apa pun di `hris-web` dan `hris-api`. Keduanya hanya dibaca sebagai
  sumber nilai konfigurasi dan pola.
