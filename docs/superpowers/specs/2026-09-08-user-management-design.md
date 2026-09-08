# Manajemen Pengguna & Admin Warisan HRIS — Satu Data Erdigma

Tanggal: 2026-09-08
Repositori tersentuh: `satudata-erdigma-api`, `satudata-erdigma`

## Masalah

Dua hal, satu akar yang sama: peran di Satu Data seluruhnya diturunkan dari HRIS
dan tidak bisa disentuh siapa pun.

1. **Akun ADMIN HRIS ditolak masuk.** `HrisEmployeeDirectory` menolak setiap
   balasan `/user/me` yang `employee`-nya null. Akun admin HRIS yang bukan
   karyawan (mis. akun IT) selalu masuk kategori itu, sehingga
   `CustomJwtAuthenticationConverter` melempar `UsernameNotFoundException` dan
   front-end menampilkan "Akun tidak dapat digunakan". Kolom `role` HRIS tidak
   pernah sempat dibaca — guard `employee == null` berjalan lebih dulu.

2. **Tidak ada cara menunjuk admin.** `upsert()` menghitung ulang `role` dari
   HRIS setiap kali baris disegarkan (ambang 12 jam). Nilai apa pun yang diketik
   manusia akan tertimpa pada penyegaran berikutnya. Komentar di kode sudah
   menandai ini: "begitu ada [antarmuka mengubah peran manual], keputusan ini
   harus ditinjau ulang."

## Keputusan yang diambil

| Pertanyaan | Keputusan |
|---|---|
| HRIS vs override manual, siapa menang | Override manual menang. Kolom `role_override` menahan resync. |
| Isi daftar panel | Hanya baris `users` lokal — orang yang pernah login. Tidak menarik `/user/directory` HRIS. |
| Siapa boleh membuka user management | Hanya admin **warisan HRIS**. Admin hasil override boleh segalanya kecuali user management. |
| Direktur / GM | **Tidak** dapat user management. Mereka dipetakan ke `Role.ADMIN` tetapi `hrisPermissionLevel`-nya `DIRECTOR`. User management urusan IT, bukan jabatan. |
| Penegakan di endpoint lain | Rencana ini tidak menambah `@PreAuthorize` baru di luar controller ini. Tapi endpoint penerbitan dataset (`POST /api/v1/datasets`) **sudah lebih dulu** digerbangi `hasAnyRole('ADMIN','PUBLISHER')` sebelum perubahan ini — jadi menunjuk seseorang PUBLISHER atau ADMIN di panel ini juga memberinya hak menerbitkan dataset, dan menurunkannya ke STAFF mencabut hak itu. Endpoint baca dataset, koleksi, dan divisi tetap terbuka untuk semua yang terautentikasi. |

## Model peran

Tiga nilai yang sudah ada dipakai apa adanya, satu kolom baru ditambahkan:

- `hrisPermissionLevel` — hasil hitungan HRIS. **Tidak pernah** ditulis panel.
  Inilah yang membedakan admin warisan dari admin tunjukan — tapi "hasil
  hitungan HRIS" di sini punya jendela, bukan seketika: lihat catatan di
  bawah `HrisEmployeeDirectory`.
- `role_override` — nullable. Diisi manusia lewat panel.
- `role` — **peran efektif**, yaitu `role_override` bila terisi, kalau tidak
  hasil pemetaan dari `hrisPermissionLevel`.

Menyimpan peran efektif di kolom `role` yang sudah ada berarti seluruh pemanggil
yang membaca `user.getRole()` hari ini tidak perlu diubah satu baris pun.

Gerbang user management adalah konjungsi keduanya:

```
role == ADMIN  &&  hrisPermissionLevel == ADMIN
```

Bukan `hrisPermissionLevel == ADMIN` saja. Bedanya penting: admin HRIS yang
diturunkan lewat override ikut kehilangan akses panel, kalau tidak penurunannya
tidak berarti apa-apa.

**Kunci-mati tetap mungkin terjadi, dan itu disengaja.** Larangan mengubah
peran sendiri hanya mencegah seseorang mengunci *dirinya sendiri* — itu tidak
sama dengan menjamin selalu tersisa satu admin warisan HRIS. Admin A tetap
bisa menurunkan admin B (yang `hrisPermissionLevel`-nya juga `ADMIN`) ke
`STAFF`; B kehilangan gerbang panel ini secara permanen, dan kalau A sendiri
kelak berhenti jadi admin, tidak ada satu pun admin warisan HRIS tersisa yang
bisa memulihkan B lewat UI. Menurunkan admin HRIS memang aksi yang sah dan
dipertahankan apa adanya — yang tidak ada hanyalah jalan pulih lewat
antarmuka. Satu-satunya pemulihan adalah SQL langsung ke baris yang mau
dipulihkan:

```sql
UPDATE users SET role='ADMIN', role_override=NULL, role_override_by=NULL, role_override_at=NULL WHERE email='…';
```

## Back-end — `satudata-erdigma-api`

### Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `db/changelog/changes/db.changelog-00024-user-role-override.yaml` | baru |
| `entity/User.java` | tiga kolom override |
| `modules/user/port/hris/HrisEmployeeDirectory.java` | guard employee-null, hormati override |
| `config/CustomJwtAuthenticationConverter.java` | authority `ROLE_HRIS_ADMIN` |
| `modules/user/controller/UserAdminController.java` | baru |
| `modules/user/service/UserAdminService.java` | baru |
| `modules/user/dto/UserAdminResponse.java`, `UserRoleUpdateRequest.java` | baru |
| `repository/UserRepository.java` | kueri daftar + pencarian |

### Migrasi basis data

Changeset `00024`, mengikuti penomoran yang ada (terakhir `00023`):

```yaml
- addColumn:
    tableName: users
    columns:
      - column: { name: role_override,    type: varchar(20) }
      - column: { name: role_override_by, type: uuid }
      - column: { name: role_override_at, type: timestamp }
```

Tanpa foreign key ke `users.id` pada `role_override_by`: baris pengubah bisa saja
ikut terhapus lunak, dan jejak siapa yang menunjuk lebih berharga daripada
integritas rujukan di kolom audit. Nilai `role_override` divalidasi sebagai enum
di lapisan aplikasi.

Tidak ada tabel audit terpisah. `role_override_by` dan `role_override_at` sudah
merekam siapa dan kapan; riwayat lengkap perubahan peran belum ada yang meminta.

### `HrisEmployeeDirectory`

Dua suntingan, di `findByCognitoId(cognitoId, accessToken)` dan `upsert()`.

**Guard employee-null** — tolak hanya kalau yang bersangkutan juga bukan admin
HRIS:

```java
boolean adminHris = jawaban != null && "ADMIN".equals(jawaban.getRole());
if (jawaban == null || (jawaban.getEmployee() == null && !adminHris)) {
    log.warn("Balasan /user/me tanpa data karyawan untuk cognitoId {}", cognitoId);
    return Optional.empty();
}
```

**`upsert()` tahan employee null.** Ketika `employee` null: `name` diisi bagian
depan email (`engineer@erdigma.id` menjadi `engineer`), sedangkan `jobLevel`,
`position`, dan `division` dibiarkan null — ketiganya sudah nullable di sepanjang
`MeService`, `CurrentUserService`, dan `UserResponse`.
`HrisRoleMapper.permissionLevel("ADMIN", null, null)` sudah mengembalikan `ADMIN`
hari ini tanpa perubahan apa pun.

**Override dihormati.** Setelah `hrisPermissionLevel` dihitung dan disimpan
seperti biasa:

```java
user.setHrisPermissionLevel(level);
user.setRole(user.getRoleOverride() != null
        ? user.getRoleOverride()
        : HrisRoleMapper.role(level));
```

`hrisPermissionLevel` tetap ditimpa dari HRIS di setiap penyegaran; hanya `role`
yang tunduk pada override.

**Tapi "ditimpa dari HRIS" itu tidak seketika.** `HrisEmployeeDirectory.SEGAR`
(12 jam) menahan baris lokal tanpa bertanya ke HRIS lagi, dan cabang
`RestClientException` di `findByCognitoId` memakai baris basi itu selama
hris-api tak terjangkau — bisa jauh lebih lama dari 12 jam. Akun yang baru
diturunkan di HRIS tetap membawa `ROLE_HRIS_ADMIN` sampai barisnya sungguh
disegarkan, dan penunjukan apa pun yang sempat ia buat lewat panel ini di
jendela itu bertahan permanen. Ambang ini tidak diubah oleh rencana ini.

### Converter — authority kedua

Di `CustomJwtAuthenticationConverter.convert()`, setelah `ROLE_<role>`:

```java
if (user.getRole() == Role.ADMIN
        && user.getHrisPermissionLevel() == HrisPermissionLevel.ADMIN) {
    authorities.add(new SimpleGrantedAuthority("ROLE_HRIS_ADMIN"));
}
```

Ini satu-satunya tempat perbedaan dua tingkat admin diputuskan.

### Endpoint

Keduanya `@PreAuthorize("hasRole('HRIS_ADMIN')")`. Bukan `@PreAuthorize` pertama
di repositori — `DatasetController.java:98` sudah lebih dulu memakainya
(`hasAnyRole('ADMIN','PUBLISHER')` di endpoint penerbitan dataset) sebelum
perubahan ini. `@EnableMethodSecurity` karena itu sudah aktif di
`SecurityConfig`, jadi tidak ada konfigurasi tambahan untuk anotasi baru di
sini.

**`GET /api/v1/users`** — parameter `q` (cocok sebagian pada nama atau email,
tanpa peduli besar-kecil huruf, opsional), `page`, `size`. Mengembalikan
`Page<UserAdminResponse>`, mengikuti pola `GET /api/v1/datasets`. Baris terhapus
lunak dikecualikan.

`UserAdminResponse`: `id` (ber-prefix, seperti `UserResponse`), `name`, `email`,
`position`, `division`, `role` (efektif), `hrisPermissionLevel`, `roleOverride`
(null bila mengikuti HRIS), `roleOverrideAt`.

Front-end membedakan "Diatur manual" dari "Dari HRIS" lewat `roleOverride != null`,
bukan dengan membandingkan dua peran — hasil keduanya bisa kebetulan sama.

**`PATCH /api/v1/users/{id}/role`** — body `{"role": "ADMIN"|"PUBLISHER"|"STAFF"|null}`.

- Nilai enum: pasang `role_override`, `role_override_by` (pemanggil),
  `role_override_at` (sekarang), dan `role` = nilai itu.
- `null`: kosongkan ketiga kolom override, lalu pulihkan `role =
  HrisRoleMapper.role(user.getHrisPermissionLevel())`. Tidak perlu memanggil
  HRIS — tingkat izin terakhir sudah tersimpan di baris itu. Bila
  `hrisPermissionLevel` kebetulan null (baris lawas yang tidak pernah lewat
  `upsert()`), pemulihannya jatuh ke `Role.STAFF`, bukan `NullPointerException`.

Ruas `role` yang hilang dari body diperlakukan sama dengan `null` eksplisit —
Jackson memberikan nilai yang sama untuk keduanya, dan membedakannya berarti
menulis deserializer khusus demi perbedaan yang tidak berarti apa-apa di sini.

Balasan berupa `UserAdminResponse` yang sudah diperbarui.

### Aturan penolakan

| Keadaan | Hasil |
|---|---|
| Pemanggil bukan admin warisan HRIS | 403 |
| `id` menunjuk dirinya sendiri | 400, "Tidak bisa mengubah peran sendiri" |
| `id` tidak ada atau sudah terhapus lunak | 404 |
| `role` bukan nilai enum yang sah dan bukan null | 400 |

Larangan mengubah peran sendiri mencegah seseorang mengunci *dirinya sendiri* —
bukan jaminan bahwa selalu tersisa satu admin HRIS aktif. Lihat catatan
kunci-mati di bagian "Model peran" di atas.

Efek samping yang disengaja: `PATCH` menyentuh `updated_at`, sehingga ambang segar
12 jam pada `masihSegar()` ikut mundur. Data HRIS orang itu jadi basi paling lama
12 jam lebih lama. Dibiarkan — memaksa penyegaran berarti satu panggilan HRIS di
jalur tulis yang tidak membutuhkannya.

## Front-end — `satudata-erdigma`

### Berkas yang berubah

| Berkas | Perubahan |
|---|---|
| `app/router/paths.ts` | `users: '/users'` di `paths` dan `routePatterns` |
| `app/router/router.tsx` | rute `UserListPage` (lazy, di dalam `ProtectedRoute`) |
| `app/layouts/SiteHeader.tsx` | butir menu bersyarat |
| `features/userManagement/pages/UserListPage.tsx` | baru |
| `features/userManagement/api/userAdminApi.ts` | baru |
| `features/userManagement/hooks/useUsers.ts`, `useUpdateUserRole.ts` | baru |
| `shared/api/queryKeys.ts` | kunci `users` |

### Halaman

Tabel: nama, email, jabatan, divisi, peran, sumber peran, aksi. Kolom sumber peran
berisi lencana "Dari HRIS" atau "Diatur manual". Aksi berupa pilihan peran plus
butir "Ikuti HRIS" yang mengirim `role: null`.

Pencarian mengirim `q`; halaman mengirim `page`/`size`. Baris pemakai sendiri
tampil tetapi aksinya nonaktif, dengan keterangan singkat — lebih jelas daripada
menyembunyikannya lalu membuat orang mengira daftarnya bocor.

Butir menu muncul hanya bila `useCurrentUser()` mengembalikan `role === 'ADMIN' &&
hrisPermissionLevel === 'ADMIN'`. Penyembunyian ini kenyamanan, bukan pengamanan —
server yang menegakkan, dan 403 dari server ditampilkan apa adanya bila seseorang
membuka `/users` langsung.

## Pengujian

Backend, mengikuti `HrisEmployeeDirectoryTest` yang sudah ada:

1. Balasan `/user/me` dengan `employee: null` dan `role: "ADMIN"` → baris dibuat,
   `role` = `ADMIN`, `name` = bagian depan email.
2. Balasan `employee: null` dengan `role: "USER"` → tetap `Optional.empty()`.
3. Penyegaran HRIS pada baris ber-`role_override` → `role` tetap nilai override,
   `hrisPermissionLevel` tetap ikut HRIS.
4. `PATCH` dengan `role: null` → `role` kembali ke pemetaan `hrisPermissionLevel`,
   ketiga kolom override kosong.
5. Converter memberi `ROLE_HRIS_ADMIN` hanya saat `role` **dan**
   `hrisPermissionLevel` keduanya `ADMIN`.
6. `PATCH` oleh admin hasil override → 403.
7. `PATCH` atas diri sendiri → 400.

Tes ditulis lebih dulu (TDD). Suite sekarang 20/20 dan harus tetap hijau.

## Di luar cakupan

- Menambah penegakan peran baru di endpoint dataset, koleksi, divisi. Endpoint
  baca tetap terbuka untuk siapa pun yang terautentikasi seperti sebelumnya —
  tapi penerbitan dataset (`POST /api/v1/datasets`) **sudah** digerbangi
  `hasAnyRole('ADMIN','PUBLISHER')` sejak sebelum perubahan ini, jadi peran
  yang ditunjuk lewat panel di sini otomatis ikut menentukan siapa yang bisa
  menerbitkan dataset. Menambah gerbang baru di endpoint lain tetap keputusan
  tersendiri dan berisiko memutus alur yang sedang dipakai.
- Menunjuk admin bagi orang yang belum pernah login. `GET /user/directory` di
  hris-api meminta `ROLE_ADMIN` di HRIS, sedangkan satudata memanggil memakai
  token si pemakai — admin tunjukan pasti kena 403 di sana.
- Riwayat lengkap perubahan peran.
- Peran per divisi.

## Catatan operasional — bug terpisah

Perubahan ini menjelaskan penolakan akun admin HRIS yang tanpa `employee`. Ada
gejala kedua yang **tidak** ditambal di sini: sebuah token yang dijawab 200 oleh
`https://hris.api.zcode.id/api/v1/user/me` beserta blok `employee` tetap ditolak
Satu Data produksi. Kalau itu terkonfirmasi, tersangkanya `HRIS_BASE_URL` atau
profil Spring di lingkungan produksi menunjuk hris-dev, bukan hris prod.
Pembuktiannya satu perintah: token yang sama dikirim ke
`https://hris-dev.api.zcode.id/api/v1/user/me` — 401 di sana berarti salah tunjuk.
