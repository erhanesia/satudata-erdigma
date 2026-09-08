# Manajemen Pengguna & Admin Warisan HRIS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Akun ADMIN HRIS bisa masuk Satu Data walau tidak punya baris `employee`, dan admin warisan HRIS bisa menunjuk pengguna lain jadi admin lewat panel di portal.

**Architecture:** Kolom `role_override` menahan penyegaran 12 jam dari HRIS, sehingga kolom `role` tetap berarti "peran efektif" dan tidak ada pemanggil lama yang perlu diubah. Dua tingkat admin dibedakan dari `hrisPermissionLevel` yang sudah tersimpan — tidak ada kolom tingkat baru. Gerbangnya satu authority tambahan, `ROLE_HRIS_ADMIN`, yang diterbitkan converter JWT dan dipakai satu `@PreAuthorize` baru di kelas controller baru — bukan `@PreAuthorize` pertama di repositori; `DatasetController` sudah memakainya lebih dulu untuk menggerbangi penerbitan dataset (`hasAnyRole('ADMIN','PUBLISHER')`), yang berarti peran yang ditunjuk di panel ini juga ikut menentukan siapa yang boleh menerbitkan dataset.

**Tech Stack:** Spring Boot 4.1 (Java, Maven wrapper), Liquibase, PostgreSQL, JUnit 5 + AssertJ + `MockRestServiceServer`; React + Vite + TypeScript, TanStack Query, Tailwind, tipe di-generate `openapi-typescript`.

**Spec:** `docs/superpowers/specs/2026-09-08-user-management-design.md`

## Global Constraints

- Dua repositori: back-end `d:\Erdigma\Satu Data Erdigma\satudata-erdigma-api`, front-end `d:\Erdigma\Satu Data Erdigma\satudata-erdigma`. Keduanya sudah di branch `feat/user-management` (front-end sudah, back-end dibuat di Task 1).
- Bahasa komentar, pesan galat, dan teks antarmuka: **Indonesia**. Nama identifier tetap sesuai kebiasaan berkas yang disunting (campuran Inggris/Indonesia — ikuti tetangganya).
- Peran portal hanya tiga: `ADMIN`, `PUBLISHER`, `STAFF` (`enums/Role.java`). Jangan menambah nilai.
- Tingkat izin HRIS lima: `ADMIN`, `DIRECTOR`, `CORPORATE_SECRETARY`, `MANAGER`, `STAFF` (`enums/HrisPermissionLevel.java`).
- Gerbang user management **selalu** konjungsi: `role == ADMIN && hrisPermissionLevel == ADMIN`. Jangan menyederhanakannya jadi satu syarat.
- Test back-end butuh PostgreSQL lokal: `localhost:5432`, database `satudata`, user `postgres`, password — lihat `application-dev.yaml` milik developer masing-masing, jangan disalin ke dokumen ini. Sudah terverifikasi hidup dengan 13 baris `users`.
- Perintah test back-end: `./mvnw.cmd test -Dtest=NamaKelas` dari akar `satudata-erdigma-api`.
- Perintah front-end dari akar `satudata-erdigma`: `npm run typecheck`, `npm run lint`, `npm run build`.
- `src/shared/types/api.generated.ts` **tidak pernah ditulis tangan**. Regenerasi: `npm run api:types` dengan back-end hidup di `http://localhost:8082`.
- Paginasi: komponen `Pagination` berbasis 1, parameter API berbasis 0. Konversinya `page - 1` di lapisan api, persis seperti `useDatasetFilters.ts:87`.
- Endpoint dataset/koleksi/divisi **tidak disentuh**. Rencana ini tidak menambah `@PreAuthorize` di luar controller baru.

---

### Task 1: Kolom override di database dan entity

**Files:**
- Create: `src/main/resources/db/changelog/changes/db.changelog-00024-user-role-override.yaml`
- Modify: `src/main/java/id/co/erdigma/satudata/entity/User.java`
- Test: `src/test/java/id/co/erdigma/satudata/entity/UserRoleOverrideColumnTest.java`

**Interfaces:**
- Consumes: —
- Produces: `User.getRoleOverride()/setRoleOverride(Role)`, `User.getRoleOverrideBy()/setRoleOverrideBy(UUID)`, `User.getRoleOverrideAt()/setRoleOverrideAt(LocalDateTime)`. Task 2, 4, dan 5 memakai ketiganya.

- [ ] **Step 1: Buat branch back-end**

```bash
cd "d:/Erdigma/Satu Data Erdigma/satudata-erdigma-api"
git checkout -b feat/user-management
```

- [ ] **Step 2: Tulis test yang gagal**

Buat `src/test/java/id/co/erdigma/satudata/entity/UserRoleOverrideColumnTest.java`:

```java
package id.co.erdigma.satudata.entity;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import id.co.erdigma.satudata.enums.HrisPermissionLevel;
import id.co.erdigma.satudata.enums.Role;
import id.co.erdigma.satudata.repository.UserRepository;

@SpringBootTest(properties = {
        "spring.profiles.active=dev",
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://example.invalid/.well-known/jwks.json",
})
class UserRoleOverrideColumnTest {

    @Autowired
    private UserRepository userRepository;

    private String cognitoId;

    @AfterEach
    void bersihkan() {
        if (cognitoId != null) {
            userRepository.findByCognitoId(cognitoId)
                    .ifPresent(u -> userRepository.deleteAllInBatch(java.util.List.of(u)));
        }
    }

    @Test
    @DisplayName("ketiga kolom override tersimpan dan terbaca kembali")
    void kolomOverrideBolakBalik() {
        cognitoId = "it-test-" + UUID.randomUUID();
        UUID pengubah = UUID.randomUUID();
        // Postgres TIMESTAMP hanya menyimpan presisi mikrodetik; tanpa truncate
        // ini perbandingan pulang-pergi gagal karena nanodetik ikut terbawa.
        LocalDateTime saat = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);

        User baris = new User();
        baris.setCognitoId(cognitoId);
        baris.setEmail("override@erdigma.co.id");
        baris.setName("Uji Override");
        baris.setRole(Role.ADMIN);
        baris.setHrisPermissionLevel(HrisPermissionLevel.STAFF);
        baris.setRoleOverride(Role.ADMIN);
        baris.setRoleOverrideBy(pengubah);
        baris.setRoleOverrideAt(saat);
        userRepository.save(baris);

        Optional<User> hasil = userRepository.findByCognitoId(cognitoId);

        assertThat(hasil).isPresent();
        assertThat(hasil.get().getRoleOverride()).isEqualTo(Role.ADMIN);
        assertThat(hasil.get().getRoleOverrideBy()).isEqualTo(pengubah);
        assertThat(hasil.get().getRoleOverrideAt()).isEqualTo(saat);
    }
}
```

- [ ] **Step 3: Jalankan test, pastikan gagal**

Run: `./mvnw.cmd test -Dtest=UserRoleOverrideColumnTest`
Expected: FAIL saat kompilasi — `cannot find symbol: method setRoleOverride(Role)`.

- [ ] **Step 4: Tulis changeset Liquibase**

Buat `src/main/resources/db/changelog/changes/db.changelog-00024-user-role-override.yaml`:

```yaml
# Peran yang ditunjuk manusia lewat panel manajemen pengguna.
#
# Sebelum ini users.role dihitung ulang dari HRIS setiap penyegaran (ambang 12
# jam di HrisEmployeeDirectory), sehingga nilai apa pun yang diketik manusia
# pasti tertimpa. Kolom ini yang menahannya: kalau role_override terisi, ia
# yang disalin ke users.role di setiap penyegaran.
#
# hris_permission_level TIDAK ikut ditahan — nilainya tetap apa kata HRIS, dan
# itulah yang membedakan admin warisan HRIS (boleh membuka panel ini) dari
# admin tunjukan (tidak boleh).
#
# role_override_by sengaja tanpa foreign key ke users.id: baris pengubah bisa
# ikut terhapus lunak, dan jejak siapa yang menunjuk lebih berharga daripada
# integritas rujukan di kolom audit.
databaseChangeLog:
  - changeSet:
      id: "24"
      author: author
      changes:
        - addColumn:
            tableName: users
            columns:
              - column: { name: role_override, type: VARCHAR(20) }
              - column: { name: role_override_by, type: UUID }
              - column: { name: role_override_at, type: TIMESTAMP }
      rollback:
        - dropColumn:
            tableName: users
            columnName: role_override
        - dropColumn:
            tableName: users
            columnName: role_override_by
        - dropColumn:
            tableName: users
            columnName: role_override_at
```

- [ ] **Step 5: Tambah tiga field di entity**

Di `src/main/java/id/co/erdigma/satudata/entity/User.java`, sisipkan tepat setelah field `hrisPermissionLevel`:

```java
    /**
     * Peran yang ditunjuk manusia lewat panel manajemen pengguna. Null berarti
     * baris ini mengikuti HRIS sepenuhnya.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "role_override")
    private Role roleOverride;

    /** Id pengguna yang menunjuk. Tanpa foreign key — lihat changeset 00024. */
    @Column(name = "role_override_by")
    private UUID roleOverrideBy;

    @Column(name = "role_override_at")
    private LocalDateTime roleOverrideAt;
```

`UUID` dan `LocalDateTime` sudah diimpor di berkas itu.

- [ ] **Step 6: Jalankan test, pastikan lulus**

Run: `./mvnw.cmd test -Dtest=UserRoleOverrideColumnTest`
Expected: PASS. Liquibase menerapkan changeset 24 saat konteks Spring naik.

- [ ] **Step 7: Commit**

```bash
git add src/main/resources/db/changelog/changes/db.changelog-00024-user-role-override.yaml src/main/java/id/co/erdigma/satudata/entity/User.java src/test/java/id/co/erdigma/satudata/entity/UserRoleOverrideColumnTest.java
git commit -m "feat(user): kolom role_override untuk menahan resync peran dari HRIS"
```

---

### Task 2: Admin HRIS tanpa employee diterima, override dihormati

**Files:**
- Modify: `src/main/java/id/co/erdigma/satudata/modules/user/port/hris/HrisEmployeeDirectory.java`
- Test: `src/test/java/id/co/erdigma/satudata/modules/user/port/hris/HrisEmployeeDirectoryTest.java`

**Interfaces:**
- Consumes: `User.getRoleOverride()` dari Task 1.
- Produces: perilaku `EmployeeDirectory.findByCognitoId(String, String)` — menerima balasan tanpa `employee` bila `role == "ADMIN"`, dan tidak pernah menimpa `role` bila `roleOverride` terisi.

- [ ] **Step 1: Tulis tiga test yang gagal**

Tambahkan ke `HrisEmployeeDirectoryTest` (kelasnya sudah punya seluruh infrastruktur: mock server, pembersih baris, `jwtFabrikasi`):

```java
    @Test
    @DisplayName("admin HRIS tanpa baris employee tetap diterima")
    void adminHrisTanpaEmployeeDiterima() {
        String cognitoId = "it-test-" + UUID.randomUUID();
        cognitoIdBuatanTest.add(cognitoId);

        mockServerHolder.server.expect(requestTo(Matchers.endsWith("/user/me")))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {
                          "email": "engineer@erdigma.id",
                          "role": "ADMIN",
                          "employee": null
                        }
                        """, MediaType.APPLICATION_JSON));

        Optional<User> hasil = employeeDirectory.findByCognitoId(cognitoId, "token-admin");

        assertThat(hasil).isPresent();
        assertThat(hasil.get().getRole()).isEqualTo(Role.ADMIN);
        assertThat(hasil.get().getHrisPermissionLevel()).isEqualTo(HrisPermissionLevel.ADMIN);
        // Nama jatuh ke bagian depan email karena HRIS tidak punya karyawannya.
        assertThat(hasil.get().getName()).isEqualTo("engineer");
        assertThat(hasil.get().getJobLevel()).isNull();
        mockServerHolder.server.verify();
    }

    @Test
    @DisplayName("bukan admin dan tanpa employee tetap ditolak")
    void bukanAdminTanpaEmployeeDitolak() {
        String cognitoId = "it-test-" + UUID.randomUUID();
        cognitoIdBuatanTest.add(cognitoId);

        mockServerHolder.server.expect(requestTo(Matchers.endsWith("/user/me")))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {
                          "email": "bukan.karyawan@erdigma.co.id",
                          "role": "USER",
                          "employee": null
                        }
                        """, MediaType.APPLICATION_JSON));

        Optional<User> hasil = employeeDirectory.findByCognitoId(cognitoId, "token-biasa");

        assertThat(hasil).isEmpty();
        assertThat(userRepository.findByCognitoId(cognitoId)).isEmpty();
        mockServerHolder.server.verify();
    }

    @Test
    @DisplayName("penyegaran HRIS tidak menimpa peran yang di-override")
    void overrideBertahanLewatPenyegaran() {
        String cognitoId = "it-test-" + UUID.randomUUID();
        cognitoIdBuatanTest.add(cognitoId);

        User baris = new User();
        baris.setCognitoId(cognitoId);
        baris.setEmail("staf@erdigma.co.id");
        baris.setName("Staf Ditunjuk");
        baris.setRole(Role.ADMIN);
        baris.setHrisPermissionLevel(HrisPermissionLevel.STAFF);
        baris.setRoleOverride(Role.ADMIN);
        baris.setRoleOverrideAt(LocalDateTime.now().truncatedTo(ChronoUnit.MICROS));
        // Basi, supaya penyegaran ke HRIS benar-benar dijalankan.
        baris.setUpdatedAt(LocalDateTime.now().minusHours(13).truncatedTo(ChronoUnit.MICROS));
        userRepository.save(baris);

        mockServerHolder.server.expect(requestTo(Matchers.endsWith("/user/me")))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {
                          "email": "staf@erdigma.co.id",
                          "role": "USER",
                          "employee": {
                            "name": "Staf Ditunjuk",
                            "jobLevel": "Staff",
                            "position": {"name": "Data Analyst"}
                          }
                        }
                        """, MediaType.APPLICATION_JSON));

        Optional<User> hasil = employeeDirectory.findByCognitoId(cognitoId, "token-apa-saja");

        assertThat(hasil).isPresent();
        // Peran efektif tetap hasil tunjukan manusia...
        assertThat(hasil.get().getRole()).isEqualTo(Role.ADMIN);
        // ...sedangkan tingkat izin tetap apa kata HRIS.
        assertThat(hasil.get().getHrisPermissionLevel()).isEqualTo(HrisPermissionLevel.STAFF);
        mockServerHolder.server.verify();
    }
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `./mvnw.cmd test -Dtest=HrisEmployeeDirectoryTest`
Expected: FAIL. `adminHrisTanpaEmployeeDiterima` gagal dengan `Expecting Optional to contain a value but it was empty`; `overrideBertahanLewatPenyegaran` gagal karena `role` jadi `STAFF`.

- [ ] **Step 3: Longgarkan guard employee-null**

Di `HrisEmployeeDirectory.findByCognitoId(String, String)`, ganti blok penjaga:

```java
        // Akun ADMIN di HRIS boleh tidak punya baris employee — akun IT
        // misalnya. Menolaknya berarti orang yang paling berhak mengelola
        // portal ini justru satu-satunya yang tidak bisa masuk.
        boolean adminHris = jawaban != null && "ADMIN".equals(jawaban.getRole());
        if (jawaban == null || (jawaban.getEmployee() == null && !adminHris)) {
            log.warn("Balasan /user/me tanpa data karyawan untuk cognitoId {}", cognitoId);
            return Optional.empty();
        }
```

- [ ] **Step 4: Buat `upsert()` tahan employee null dan hormati override**

Ganti isi `upsert(User lama, String cognitoId, HrisMeResponse jawaban)` menjadi:

```java
    private User upsert(User lama, String cognitoId, HrisMeResponse jawaban) {
        User user = (lama != null) ? lama : new User();
        if (lama == null) {
            // cognitoId adalah identitas baris ini dan tidak pernah diubah lagi.
            user.setCognitoId(cognitoId);
        }

        HrisMeResponse.Employee employee = jawaban.getEmployee();
        String jobLevel = (employee != null) ? employee.getJobLevel() : null;
        String position = (employee != null && employee.getPosition() != null)
                ? employee.getPosition().getName()
                : null;

        user.setEmail(jawaban.getEmail());
        // Tanpa baris employee, HRIS tidak punya nama orang ini. Bagian depan
        // email jauh lebih berguna di daftar pengguna daripada kolom kosong.
        user.setName((employee != null) ? employee.getName() : namaDariEmail(jawaban.getEmail()));
        user.setJobLevel(jobLevel);
        user.setPosition(position);

        // Tingkat izin SELALU apa kata HRIS — inilah yang membedakan admin
        // warisan dari admin tunjukan, jadi override tidak boleh menyentuhnya.
        HrisPermissionLevel level = HrisRoleMapper.permissionLevel(
                jawaban.getRole(), jobLevel, position);
        user.setHrisPermissionLevel(level);

        // Peran efektif: tunjukan manusia menang atas hitungan HRIS.
        user.setRole(user.getRoleOverride() != null
                ? user.getRoleOverride()
                : HrisRoleMapper.role(level));

        UUID departementId = (employee != null && employee.getDepartement() != null)
                ? employee.getDepartement().getId()
                : null;
        if (departementId != null) {
            divisionRepository.findByHrisDepartementIdAndDeletedAtIsNull(departementId)
                    .ifPresent(user::setDivision);
        }

        // Diisi manual: entitas memakai @LastModifiedDate tetapi tidak memasang
        // AuditingEntityListener, jadi nilainya tidak pernah bergerak sendiri —
        // dan masihSegar() di atas bergantung padanya.
        user.setUpdatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    /** "engineer@erdigma.id" menjadi "engineer". Null-aman. */
    private static String namaDariEmail(String email) {
        if (email == null || email.isBlank()) {
            return "Tanpa nama";
        }
        int at = email.indexOf('@');
        return (at > 0) ? email.substring(0, at) : email;
    }
```

- [ ] **Step 5: Jalankan test, pastikan lulus**

Run: `./mvnw.cmd test -Dtest=HrisEmployeeDirectoryTest`
Expected: PASS, enam test.

- [ ] **Step 6: Commit**

```bash
git add src/main/java/id/co/erdigma/satudata/modules/user/port/hris/HrisEmployeeDirectory.java src/test/java/id/co/erdigma/satudata/modules/user/port/hris/HrisEmployeeDirectoryTest.java
git commit -m "fix(auth): akun ADMIN HRIS tanpa baris employee bisa masuk Satu Data"
```

---

### Task 3: Authority `ROLE_HRIS_ADMIN` di converter

**Files:**
- Modify: `src/main/java/id/co/erdigma/satudata/config/CustomJwtAuthenticationConverter.java`
- Test: `src/test/java/id/co/erdigma/satudata/modules/user/port/hris/HrisEmployeeDirectoryTest.java`

**Interfaces:**
- Consumes: `User.getRole()`, `User.getHrisPermissionLevel()`.
- Produces: authority string `"ROLE_HRIS_ADMIN"`. Task 4 dan 5 memakainya lewat `@PreAuthorize("hasRole('HRIS_ADMIN')")`.

- [ ] **Step 1: Tulis dua test yang gagal**

Tambahkan ke `HrisEmployeeDirectoryTest`. Barisnya dibuat **segar** (`updatedAt` sekarang) supaya `masihSegar()` memotong jalur dan tidak ada panggilan HTTP sama sekali — karena itu tidak ada ekspektasi mock server di sini:

```java
    @Test
    @DisplayName("admin warisan HRIS mendapat authority ROLE_HRIS_ADMIN")
    void adminWarisanDapatAuthorityKhusus() {
        String cognitoId = "it-test-" + UUID.randomUUID();
        cognitoIdBuatanTest.add(cognitoId);
        simpanBarisSegar(cognitoId, Role.ADMIN, HrisPermissionLevel.ADMIN);

        var authorities = converter.convert(jwtFabrikasi(cognitoId)).getAuthorities();

        assertThat(authorities).extracting("authority")
                .contains("ROLE_ADMIN", "ROLE_HRIS_ADMIN");
    }

    @Test
    @DisplayName("admin tunjukan tidak mendapat ROLE_HRIS_ADMIN")
    void adminTunjukanTidakDapatAuthorityKhusus() {
        String cognitoId = "it-test-" + UUID.randomUUID();
        cognitoIdBuatanTest.add(cognitoId);
        simpanBarisSegar(cognitoId, Role.ADMIN, HrisPermissionLevel.MANAGER);

        var authorities = converter.convert(jwtFabrikasi(cognitoId)).getAuthorities();

        assertThat(authorities).extracting("authority")
                .contains("ROLE_ADMIN")
                .doesNotContain("ROLE_HRIS_ADMIN");
    }

    /** Baris dengan updatedAt sekarang: masihSegar() memotong panggilan HRIS. */
    private void simpanBarisSegar(String cognitoId, Role role, HrisPermissionLevel level) {
        User baris = new User();
        baris.setCognitoId(cognitoId);
        baris.setEmail(cognitoId + "@erdigma.co.id");
        baris.setName("Uji Authority");
        baris.setRole(role);
        baris.setHrisPermissionLevel(level);
        baris.setUpdatedAt(LocalDateTime.now().truncatedTo(ChronoUnit.MICROS));
        userRepository.save(baris);
    }
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `./mvnw.cmd test -Dtest=HrisEmployeeDirectoryTest#adminWarisanDapatAuthorityKhusus`
Expected: FAIL — daftar authority hanya berisi `ROLE_ADMIN`.

- [ ] **Step 3: Terbitkan authority kedua**

Di `CustomJwtAuthenticationConverter.convert()`, tepat setelah baris `authorities.add(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));`:

```java
        // Dua tingkat admin. Yang perannya ADMIN karena ditunjuk manusia tetap
        // memegang ROLE_ADMIN, tetapi hanya yang tingkat izin HRIS-nya juga
        // ADMIN yang boleh membuka manajemen pengguna — kalau tidak, admin
        // tunjukan bisa menunjuk admin baru dan gerbang ini tidak berarti apa
        // pun. Konjungsi, bukan salah satu: admin HRIS yang diturunkan lewat
        // override ikut kehilangan akses panel.
        if (user.getRole() == Role.ADMIN
                && user.getHrisPermissionLevel() == HrisPermissionLevel.ADMIN) {
            authorities.add(new SimpleGrantedAuthority("ROLE_HRIS_ADMIN"));
        }
```

Tambahkan impor `id.co.erdigma.satudata.enums.HrisPermissionLevel` dan `id.co.erdigma.satudata.enums.Role`.

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `./mvnw.cmd test -Dtest=HrisEmployeeDirectoryTest`
Expected: PASS, delapan test.

- [ ] **Step 5: Commit**

```bash
git add src/main/java/id/co/erdigma/satudata/config/CustomJwtAuthenticationConverter.java src/test/java/id/co/erdigma/satudata/modules/user/port/hris/HrisEmployeeDirectoryTest.java
git commit -m "feat(auth): authority ROLE_HRIS_ADMIN membedakan admin warisan dari admin tunjukan"
```

---

### Task 4: Endpoint daftar pengguna

**Files:**
- Create: `src/main/java/id/co/erdigma/satudata/modules/user/dto/UserAdminResponse.java`
- Create: `src/main/java/id/co/erdigma/satudata/modules/user/service/UserAdminService.java`
- Create: `src/main/java/id/co/erdigma/satudata/modules/user/controller/UserAdminController.java`
- Modify: `src/main/java/id/co/erdigma/satudata/repository/UserRepository.java`
- Test: `src/test/java/id/co/erdigma/satudata/modules/user/service/UserAdminServiceTest.java`
- Test: `src/test/java/id/co/erdigma/satudata/modules/user/controller/UserAdminAuthorizationTest.java`

**Interfaces:**
- Consumes: `User.getRoleOverride()`, `User.getRoleOverrideAt()` (Task 1); authority `ROLE_HRIS_ADMIN` (Task 3).
- Produces:
  - `UserRepository.cariAktif(String q, Pageable pageable) -> Page<User>`
  - `UserAdminService.daftar(String q, Pageable pageable) -> Page<UserAdminResponse>`
  - `UserAdminService.toResponse(User) -> UserAdminResponse` (dipakai Task 5)
  - Skema OpenAPI `UserAdminResponse` dan `PageUserAdminResponse` (dipakai Task 6)

- [ ] **Step 1: Tulis test yang gagal**

Buat `src/test/java/id/co/erdigma/satudata/modules/user/service/UserAdminServiceTest.java`:

```java
package id.co.erdigma.satudata.modules.user.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import id.co.erdigma.satudata.entity.User;
import id.co.erdigma.satudata.enums.HrisPermissionLevel;
import id.co.erdigma.satudata.enums.Role;
import id.co.erdigma.satudata.modules.user.dto.UserAdminResponse;
import id.co.erdigma.satudata.repository.UserRepository;

@SpringBootTest(properties = {
        "spring.profiles.active=dev",
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://example.invalid/.well-known/jwks.json",
})
class UserAdminServiceTest {

    @Autowired
    private UserAdminService userAdminService;

    @Autowired
    private UserRepository userRepository;

    private final List<String> cognitoIdBuatanTest = new ArrayList<>();

    @AfterEach
    void hapusBarisBuatanTest() {
        List<User> baris = cognitoIdBuatanTest.stream()
                .map(userRepository::findByCognitoId)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .toList();
        userRepository.deleteAllInBatch(baris);
        cognitoIdBuatanTest.clear();
    }

    @Test
    @DisplayName("pencarian mencocokkan sebagian nama tanpa peduli besar-kecil huruf")
    void pencarianCocokSebagianTanpaPeduliHuruf() {
        String cognitoId = simpan("Zulfikar Ramadhan", "zulfikar.unik@erdigma.co.id",
                Role.STAFF, HrisPermissionLevel.STAFF, null);

        var hasil = userAdminService.daftar("zULFIkar",
                PageRequest.of(0, 20, Sort.by("name").ascending()));

        assertThat(hasil.getContent()).extracting(UserAdminResponse::getEmail)
                .contains("zulfikar.unik@erdigma.co.id");
        assertThat(cognitoId).isNotNull();
    }

    @Test
    @DisplayName("baris hasil override ditandai roleOverride, yang ikut HRIS null")
    void penandaSumberPeranTerbawaKeRespons() {
        simpan("Alpha Tertunjuk", "alpha.unik@erdigma.co.id",
                Role.ADMIN, HrisPermissionLevel.STAFF, Role.ADMIN);
        simpan("Beta Ikut Hris", "beta.unik@erdigma.co.id",
                Role.STAFF, HrisPermissionLevel.STAFF, null);

        var hasil = userAdminService.daftar("unik@erdigma.co.id",
                PageRequest.of(0, 20, Sort.by("name").ascending()));

        var alpha = hasil.getContent().stream()
                .filter(u -> "alpha.unik@erdigma.co.id".equals(u.getEmail())).findFirst().orElseThrow();
        var beta = hasil.getContent().stream()
                .filter(u -> "beta.unik@erdigma.co.id".equals(u.getEmail())).findFirst().orElseThrow();

        assertThat(alpha.getRoleOverride()).isEqualTo(Role.ADMIN);
        assertThat(alpha.getRole()).isEqualTo(Role.ADMIN);
        assertThat(alpha.getHrisPermissionLevel()).isEqualTo(HrisPermissionLevel.STAFF);
        assertThat(beta.getRoleOverride()).isNull();
    }

    private String simpan(String nama, String email, Role role,
            HrisPermissionLevel level, Role override) {
        String cognitoId = "it-test-" + UUID.randomUUID();
        cognitoIdBuatanTest.add(cognitoId);

        User baris = new User();
        baris.setCognitoId(cognitoId);
        baris.setName(nama);
        baris.setEmail(email);
        baris.setRole(role);
        baris.setHrisPermissionLevel(level);
        baris.setRoleOverride(override);
        if (override != null) {
            baris.setRoleOverrideAt(LocalDateTime.now().truncatedTo(ChronoUnit.MICROS));
        }
        baris.setUpdatedAt(LocalDateTime.now().truncatedTo(ChronoUnit.MICROS));
        return userRepository.save(baris).getCognitoId();
    }
}
```

- [ ] **Step 2: Tulis test gerbang otorisasi yang gagal**

Gerbang `@PreAuthorize` hanya hidup lewat proxy AOP, jadi ia harus diuji dengan
memanggil **bean controller**, bukan service. Konteks keamanan diisi tangan —
dari mana authority itu datang tidak relevan bagi interceptor.

Buat `src/test/java/id/co/erdigma/satudata/modules/user/controller/UserAdminAuthorizationTest.java`:

```java
package id.co.erdigma.satudata.modules.user.controller;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
// Paket `authorization`, bukan `access` — inilah yang dipakai Spring Security
// versi ini dan yang sudah ditangani GlobalExceptionHandler jadi 403.
import org.springframework.security.authorization.AuthorizationDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@SpringBootTest(properties = {
        "spring.profiles.active=dev",
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://example.invalid/.well-known/jwks.json",
})
class UserAdminAuthorizationTest {

    @Autowired
    private UserAdminController controller;

    @AfterEach
    void bersihkanKonteksKeamanan() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("admin tunjukan (ROLE_ADMIN saja) ditolak membuka daftar pengguna")
    void adminTunjukanDitolak() {
        masuk("ROLE_ADMIN");

        assertThatThrownBy(() -> controller.index(null, 0, 20))
                .isInstanceOf(AuthorizationDeniedException.class);
    }

    @Test
    @DisplayName("admin warisan HRIS diizinkan membuka daftar pengguna")
    void adminWarisanDiizinkan() {
        masuk("ROLE_ADMIN", "ROLE_HRIS_ADMIN");

        assertThatCode(() -> controller.index(null, 0, 20)).doesNotThrowAnyException();
    }

    private static void masuk(String... authorities) {
        var granted = List.of(authorities).stream().map(SimpleGrantedAuthority::new).toList();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("uji", "n/a", granted));
    }
}
```

- [ ] **Step 3: Jalankan kedua test, pastikan gagal**

Run: `./mvnw.cmd test -Dtest=UserAdminServiceTest,UserAdminAuthorizationTest`
Expected: FAIL saat kompilasi — `UserAdminService`, `UserAdminResponse`, dan `UserAdminController` belum ada.

- [ ] **Step 4: Tambah kueri di repository**

Di `src/main/java/id/co/erdigma/satudata/repository/UserRepository.java`, tambahkan method beserta impornya (`org.springframework.data.domain.Page`, `Pageable`, `org.springframework.data.jpa.repository.Query`, `org.springframework.data.repository.query.Param`):

```java
    /**
     * Daftar pengguna aktif untuk panel manajemen pengguna.
     *
     * `q` null berarti tanpa penyaringan. Pencocokan sebagian dan tanpa peduli
     * besar-kecil huruf, pada nama atau email — orang mencari rekannya dengan
     * potongan nama, bukan dengan ejaan persis.
     *
     * `CAST(:q AS string)` bukan hiasan: tanpanya, saat `q` null, Hibernate
     * tidak bisa menebak tipe JDBC parameter itu di dalam CONCAT dan
     * PostgreSQL menyimpulkannya sebagai bytea — `LOWER(bytea)` gagal.
     *
     * `LEFT JOIN FETCH u.division` menghindari N+1: `division` LAZY, dan
     * pemetaan respons membacanya untuk SETIAP baris. Tanpa fetch join, satu
     * halaman berisi 20 orang menambah 20 SELECT. LEFT, bukan INNER, supaya
     * orang tanpa divisi tidak ikut hilang. Fetch join di sini aman untuk
     * paginasi karena `division` relasi to-one, bukan koleksi.
     *
     * `countQuery` ditulis terpisah dan sengaja TANPA fetch join: Spring Data
     * tidak selalu bisa menurunkan kueri hitung yang benar dari kueri
     * ber-fetch-join, dan menghitung baris tidak butuh divisinya.
     */
    @Query(value = """
            SELECT u FROM User u
            LEFT JOIN FETCH u.division
            WHERE u.deletedAt IS NULL
              AND (:q IS NULL
                   OR LOWER(u.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
            """, countQuery = """
            SELECT COUNT(u) FROM User u
            WHERE u.deletedAt IS NULL
              AND (:q IS NULL
                   OR LOWER(u.name) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', CAST(:q AS string), '%')))
            """)
    Page<User> cariAktif(@Param("q") String q, Pageable pageable);
```

- [ ] **Step 5: Buat DTO respons**

Buat `src/main/java/id/co/erdigma/satudata/modules/user/dto/UserAdminResponse.java`:

```java
package id.co.erdigma.satudata.modules.user.dto;

import java.time.LocalDateTime;
import java.util.UUID;

import id.co.erdigma.satudata.annotation.PrefixedId;
import id.co.erdigma.satudata.enums.HrisPermissionLevel;
import id.co.erdigma.satudata.enums.IdPrefix;
import id.co.erdigma.satudata.enums.Role;
import id.co.erdigma.satudata.modules.division.dto.DivisionResponseLite;

import lombok.Data;

/**
 * Satu baris di panel manajemen pengguna.
 *
 * Berbeda dari {@link UserResponse} yang melayani pil identitas: di sini
 * `roleOverride` ikut dibawa supaya antarmuka bisa membedakan peran hasil
 * tunjukan manusia dari peran hitungan HRIS. Membandingkan `role` dengan
 * `hrisPermissionLevel` tidak bisa dipakai untuk itu — keduanya bisa kebetulan
 * sama padahal sumbernya berbeda.
 */
@Data
public class UserAdminResponse {
    @PrefixedId(IdPrefix.USER)
    private UUID id;
    private String name;
    private String email;
    private String position;
    private DivisionResponseLite division;

    /** Peran efektif — yang benar-benar menentukan hak di portal. */
    private Role role;

    /** Hasil hitungan HRIS. ADMIN di sini berarti admin warisan. */
    private HrisPermissionLevel hrisPermissionLevel;

    /** Null berarti baris ini mengikuti HRIS. */
    private Role roleOverride;
    private LocalDateTime roleOverrideAt;
}
```

- [ ] **Step 6: Buat service**

Buat `src/main/java/id/co/erdigma/satudata/modules/user/service/UserAdminService.java`:

```java
package id.co.erdigma.satudata.modules.user.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import id.co.erdigma.satudata.entity.User;
import id.co.erdigma.satudata.modules.division.mapper.DivisionMapper;
import id.co.erdigma.satudata.modules.user.dto.UserAdminResponse;
import id.co.erdigma.satudata.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final UserRepository userRepository;
    private final DivisionMapper divisionMapper;

    @Transactional(readOnly = true)
    public Page<UserAdminResponse> daftar(String q, Pageable pageable) {
        // Kunci kosong disamakan dengan tanpa kunci: kotak pencarian yang baru
        // dikosongkan mengirim string kosong, dan LIKE '%%' menyaring apa pun.
        String kunci = (q == null || q.isBlank()) ? null : q.trim();
        return userRepository.cariAktif(kunci, pageable).map(this::toResponse);
    }

    public UserAdminResponse toResponse(User user) {
        UserAdminResponse response = new UserAdminResponse();
        response.setId(user.getId());
        response.setName(user.getName());
        response.setEmail(user.getEmail());
        response.setPosition(user.getPosition());
        if (user.getDivision() != null) {
            response.setDivision(divisionMapper.toResponseLite(user.getDivision()));
        }
        response.setRole(user.getRole());
        response.setHrisPermissionLevel(user.getHrisPermissionLevel());
        response.setRoleOverride(user.getRoleOverride());
        response.setRoleOverrideAt(user.getRoleOverrideAt());
        return response;
    }
}
```

- [ ] **Step 7: Buat controller**

Buat `src/main/java/id/co/erdigma/satudata/modules/user/controller/UserAdminController.java`:

```java
package id.co.erdigma.satudata.modules.user.controller;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import id.co.erdigma.satudata.modules.user.dto.UserAdminResponse;
import id.co.erdigma.satudata.modules.user.service.UserAdminService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

/**
 * Manajemen pengguna portal.
 *
 * `@PreAuthorize` dipasang di tingkat kelas, bukan per method: seluruh isi
 * controller ini punya syarat akses yang sama, dan menaruhnya sekali membuat
 * tidak ada method baru yang bisa lolos karena anotasinya lupa disalin.
 */
@RestController
@RequestMapping("/api/v1/users")
@PreAuthorize("hasRole('HRIS_ADMIN')")
@RequiredArgsConstructor
@Tag(name = "8. Manajemen Pengguna", description = """
        Melihat pengguna portal dan menunjuk peran mereka.

        **Hanya untuk admin warisan HRIS** — yaitu akun yang `role`-nya di hris-api memang
        `ADMIN`. Admin yang ditunjuk lewat panel ini sendiri **tidak** bisa membuka endpoint di
        sini; kalau bisa, siapa pun yang sekali ditunjuk dapat menunjuk admin baru dan
        pembatasannya tidak berarti apa-apa.

        Peran yang ditunjuk di sini bertahan melewati penyegaran data HRIS. Mengembalikan
        seseorang mengikuti HRIS dilakukan dengan mengirim `role: null`.
        """)
public class UserAdminController {

    private final UserAdminService userAdminService;

    @GetMapping
    @Operation(summary = "Daftar pengguna portal", description = """
            Pengguna yang **pernah masuk** ke Satu Data. Orang yang belum pernah membuka portal
            belum punya baris di sini dan karenanya belum bisa ditunjuk.

            `q` mencocokkan sebagian nama atau email tanpa peduli besar-kecil huruf. Halaman
            berbasis 0 mengikuti Spring Data, sama seperti `GET /api/v1/datasets`.

            Bedakan dua kolom peran pada hasilnya: `role` adalah peran efektif, `roleOverride`
            berisi nilai hanya bila peran itu ditunjuk manusia.
            """)
    @ApiResponse(responseCode = "200", description = "Daftar pengguna berhasil diambil", useReturnTypeSchema = true)
    public ResponseEntity<Page<UserAdminResponse>> index(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(
                userAdminService.daftar(q, PageRequest.of(page, size, Sort.by("name").ascending())));
    }
}
```

- [ ] **Step 8: Jalankan kedua test, pastikan lulus**

Run: `./mvnw.cmd test -Dtest=UserAdminServiceTest,UserAdminAuthorizationTest`
Expected: PASS, empat test.

- [ ] **Step 9: Commit**

```bash
git add src/main/java/id/co/erdigma/satudata/modules/user/ src/main/java/id/co/erdigma/satudata/repository/UserRepository.java src/test/java/id/co/erdigma/satudata/modules/user/
git commit -m "feat(user): endpoint daftar pengguna untuk panel manajemen"
```

---

### Task 5: Endpoint ubah peran

**Files:**
- Create: `src/main/java/id/co/erdigma/satudata/modules/user/dto/UserRoleUpdateRequest.java`
- Modify: `src/main/java/id/co/erdigma/satudata/modules/user/service/UserAdminService.java`
- Modify: `src/main/java/id/co/erdigma/satudata/modules/user/controller/UserAdminController.java`
- Test: `src/test/java/id/co/erdigma/satudata/modules/user/service/UserAdminServiceTest.java`

**Interfaces:**
- Consumes: `UserAdminService.toResponse(User)` (Task 4); `IdPrefix.USER.parse(String) -> UUID`; `HrisRoleMapper.role(HrisPermissionLevel) -> Role`.
- Produces: `UserAdminService.ubahPeran(User pemanggil, UUID targetId, Role peranBaru) -> UserAdminResponse`; skema OpenAPI `UserRoleUpdateRequest` (dipakai Task 6).

- [ ] **Step 1: Tulis empat test yang gagal**

Tiga di `UserAdminServiceTest` (impor tambahan: `org.assertj.core.api.Assertions.assertThatThrownBy`, `id.co.erdigma.satudata.exception.BusinessValidationException`):

```java
    @Test
    @DisplayName("menunjuk peran menyimpan override beserta jejak siapa dan kapan")
    void menunjukPeranMenyimpanJejak() {
        String cognitoPemanggil = simpan("Admin Hris", "adminhris.unik@erdigma.co.id",
                Role.ADMIN, HrisPermissionLevel.ADMIN, null);
        String cognitoTarget = simpan("Target Staf", "target.unik@erdigma.co.id",
                Role.STAFF, HrisPermissionLevel.STAFF, null);

        User pemanggil = userRepository.findByCognitoId(cognitoPemanggil).orElseThrow();
        User target = userRepository.findByCognitoId(cognitoTarget).orElseThrow();

        var hasil = userAdminService.ubahPeran(pemanggil, target.getId(), Role.ADMIN);

        assertThat(hasil.getRole()).isEqualTo(Role.ADMIN);
        assertThat(hasil.getRoleOverride()).isEqualTo(Role.ADMIN);
        assertThat(hasil.getRoleOverrideAt()).isNotNull();

        User tersimpan = userRepository.findByCognitoId(cognitoTarget).orElseThrow();
        assertThat(tersimpan.getRoleOverrideBy()).isEqualTo(pemanggil.getId());
        // Tingkat izin HRIS tidak boleh ikut berubah.
        assertThat(tersimpan.getHrisPermissionLevel()).isEqualTo(HrisPermissionLevel.STAFF);
    }

    @Test
    @DisplayName("role null mengembalikan peran mengikuti HRIS dan mengosongkan jejak")
    void roleNullMengembalikanKeHris() {
        String cognitoPemanggil = simpan("Admin Hris", "adminhris2.unik@erdigma.co.id",
                Role.ADMIN, HrisPermissionLevel.ADMIN, null);
        String cognitoTarget = simpan("Manajer Ditunjuk", "manajer.unik@erdigma.co.id",
                Role.ADMIN, HrisPermissionLevel.MANAGER, Role.ADMIN);

        User pemanggil = userRepository.findByCognitoId(cognitoPemanggil).orElseThrow();
        User target = userRepository.findByCognitoId(cognitoTarget).orElseThrow();

        var hasil = userAdminService.ubahPeran(pemanggil, target.getId(), null);

        // MANAGER dipetakan ke PUBLISHER oleh HrisRoleMapper.
        assertThat(hasil.getRole()).isEqualTo(Role.PUBLISHER);
        assertThat(hasil.getRoleOverride()).isNull();
        assertThat(hasil.getRoleOverrideAt()).isNull();

        User tersimpan = userRepository.findByCognitoId(cognitoTarget).orElseThrow();
        assertThat(tersimpan.getRoleOverrideBy()).isNull();
    }

    @Test
    @DisplayName("mengubah peran sendiri ditolak")
    void ubahPeranSendiriDitolak() {
        String cognitoId = simpan("Admin Sendiri", "sendiri.unik@erdigma.co.id",
                Role.ADMIN, HrisPermissionLevel.ADMIN, null);
        User pemanggil = userRepository.findByCognitoId(cognitoId).orElseThrow();

        assertThatThrownBy(() -> userAdminService.ubahPeran(pemanggil, pemanggil.getId(), Role.STAFF))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessageContaining("sendiri");
    }
```

Yang keempat di `UserAdminAuthorizationTest` — gerbang kelas berlaku untuk
`PATCH` juga, dan justru di sinilah taruhannya: admin tunjukan yang bisa
memanggilnya dapat menunjuk admin baru (impor tambahan:
`java.util.UUID`, `id.co.erdigma.satudata.modules.user.dto.UserRoleUpdateRequest`):

```java
    @Test
    @DisplayName("admin tunjukan ditolak menunjuk peran orang lain")
    void adminTunjukanDitolakUbahPeran() {
        masuk("ROLE_ADMIN");

        assertThatThrownBy(
                () -> controller.ubahPeran(null, "usr-" + UUID.randomUUID(), new UserRoleUpdateRequest()))
                .isInstanceOf(AuthorizationDeniedException.class);
    }
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `./mvnw.cmd test -Dtest=UserAdminServiceTest,UserAdminAuthorizationTest`
Expected: FAIL saat kompilasi — method `ubahPeran` dan `UserRoleUpdateRequest` belum ada.

- [ ] **Step 3: Buat DTO permintaan**

Buat `src/main/java/id/co/erdigma/satudata/modules/user/dto/UserRoleUpdateRequest.java`:

```java
package id.co.erdigma.satudata.modules.user.dto;

import id.co.erdigma.satudata.enums.Role;

import io.swagger.v3.oas.annotations.media.Schema;

import lombok.Data;

@Data
public class UserRoleUpdateRequest {

    /**
     * Peran yang ditunjuk. `null` — juga bila ruasnya tidak dikirim sama sekali —
     * berarti kembali mengikuti HRIS.
     */
    @Schema(description = "Peran yang ditunjuk. null berarti kembali mengikuti HRIS.", nullable = true)
    private Role role;
}
```

- [ ] **Step 4: Tambah method di service**

Di `UserAdminService`, tambahkan (impor: `java.time.LocalDateTime`, `java.util.UUID`, `id.co.erdigma.satudata.enums.HrisPermissionLevel`, `id.co.erdigma.satudata.enums.Role`, `id.co.erdigma.satudata.exception.BusinessValidationException`, `id.co.erdigma.satudata.exception.ResourceNotFoundException`, `id.co.erdigma.satudata.modules.user.port.hris.HrisRoleMapper`):

```java
    @Transactional
    public UserAdminResponse ubahPeran(User pemanggil, UUID targetId, Role peranBaru) {
        // Larangan ini sekaligus yang menjamin selalu tersisa satu admin warisan
        // HRIS yang aktif: tidak seorang pun bisa mengunci dirinya sendiri.
        if (pemanggil.getId().equals(targetId)) {
            throw new BusinessValidationException("Tidak bisa mengubah peran sendiri.");
        }

        User target = userRepository.findById(targetId)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException("Pengguna tidak ditemukan."));

        if (peranBaru == null) {
            target.setRoleOverride(null);
            target.setRoleOverrideBy(null);
            target.setRoleOverrideAt(null);
            // Tidak perlu bertanya ke HRIS: tingkat izin terakhir sudah tersimpan
            // di baris ini. Null hanya mungkin pada baris lawas yang tidak pernah
            // lewat upsert(), dan hak terendah lebih aman daripada melempar.
            HrisPermissionLevel level = target.getHrisPermissionLevel();
            target.setRole(level != null ? HrisRoleMapper.role(level) : Role.STAFF);
        } else {
            target.setRoleOverride(peranBaru);
            target.setRoleOverrideBy(pemanggil.getId());
            target.setRoleOverrideAt(LocalDateTime.now());
            target.setRole(peranBaru);
        }

        // Diisi manual, sama seperti di HrisEmployeeDirectory.upsert():
        // AuditingEntityListener tidak dipasang, jadi @LastModifiedDate diam.
        target.setUpdatedAt(LocalDateTime.now());

        return toResponse(userRepository.save(target));
    }
```

- [ ] **Step 5: Tambah endpoint di controller**

Di `UserAdminController`, tambahkan (impor: `org.springframework.web.bind.annotation.PatchMapping`, `PathVariable`, `RequestBody`, `id.co.erdigma.satudata.annotation.CurrentUser`, `id.co.erdigma.satudata.entity.User`, `id.co.erdigma.satudata.enums.IdPrefix`, `id.co.erdigma.satudata.modules.user.dto.UserRoleUpdateRequest`, `io.swagger.v3.oas.annotations.Parameter`, `io.swagger.v3.oas.annotations.responses.ApiResponses`, `io.swagger.v3.oas.annotations.media.Content`, `io.swagger.v3.oas.annotations.media.Schema`, `io.swagger.v3.oas.annotations.StringToClassMapItem`):

```java
    @PatchMapping("/{id}/role")
    @Operation(summary = "Tunjuk peran seorang pengguna", description = """
            Menetapkan peran portal seseorang, menahannya dari penyegaran data HRIS.

            Kirim `{"role": null}` untuk mengembalikannya mengikuti HRIS — peran akan dihitung
            ulang dari tingkat izin HRIS terakhir yang tercatat, tanpa memanggil hris-api.

            Peran sendiri tidak bisa diubah. Batasan itu yang menjamin selalu tersisa satu admin
            warisan HRIS yang aktif.
            """)
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Peran berhasil ditunjuk", useReturnTypeSchema = true),
            @ApiResponse(responseCode = "400", description = "Mencoba mengubah peran sendiri, atau id tidak berbentuk benar", content = @Content(schema = @Schema(type = "object", properties = @StringToClassMapItem(key = "error", value = String.class)))),
            @ApiResponse(responseCode = "403", description = "Bukan admin warisan HRIS", content = @Content(schema = @Schema(type = "object", properties = @StringToClassMapItem(key = "error", value = String.class)))),
            @ApiResponse(responseCode = "404", description = "Pengguna tidak ditemukan", content = @Content(schema = @Schema(type = "object", properties = @StringToClassMapItem(key = "error", value = String.class))))
    })
    public ResponseEntity<UserAdminResponse> ubahPeran(
            @CurrentUser User pemanggil,
            @Parameter(description = "Id pengguna dalam bentuk `usr-<uuid>` seperti yang muncul di GET /api/v1/users. UUID telanjang tanpa awalan juga diterima.", example = "usr-3fa85f64-5717-4562-b3fc-2c963f66afa6", required = true) @PathVariable String id,
            @RequestBody UserRoleUpdateRequest body) {
        return ResponseEntity.ok(
                userAdminService.ubahPeran(pemanggil, IdPrefix.USER.parse(id), body.getRole()));
    }
```

- [ ] **Step 6: Jalankan test, pastikan lulus**

Run: `./mvnw.cmd test -Dtest=UserAdminServiceTest,UserAdminAuthorizationTest`
Expected: PASS, delapan test.

- [ ] **Step 7: Jalankan seluruh suite back-end**

Run: `./mvnw.cmd test`
Expected: PASS semua. Sebelum rencana ini suite berisi 20 test; rencana ini menambah 14 (1 + 3 + 2 + 4 + 4 dari Task 1 sampai 5).

- [ ] **Step 8: Commit**

```bash
git add src/main/java/id/co/erdigma/satudata/modules/user/ src/test/java/id/co/erdigma/satudata/modules/user/
git commit -m "feat(user): endpoint tunjuk peran dengan override yang menahan resync HRIS"
```

---

### Task 6: Lapisan data front-end

**Files:**
- Modify: `src/shared/types/api.generated.ts` (hasil generate, jangan disunting tangan)
- Modify: `src/shared/types/api.ts`
- Modify: `src/shared/api/httpClient.ts`
- Modify: `src/shared/api/queryKeys.ts`
- Create: `src/features/userManagement/api/userAdminApi.ts`
- Create: `src/features/userManagement/hooks/useUsers.ts`
- Create: `src/features/userManagement/hooks/useUpdateUserRole.ts`

**Interfaces:**
- Consumes: endpoint `GET /api/v1/users` dan `PATCH /api/v1/users/{id}/role` (Task 4, 5).
- Produces: tipe `UserAdmin`, `PageOfUsers`; `fetchUsers(query, signal)`, `updateUserRole({id, role})`; hook `useUsers(query)`, `useUpdateUserRole()`. Task 7 memakai semuanya.

- [ ] **Step 1: Jalankan back-end lalu regenerasi tipe**

Terminal pertama, dari `satudata-erdigma-api`:

```bash
./mvnw.cmd spring-boot:run
```

Tunggu sampai log menampilkan `Tomcat started on port 8082`. Terminal kedua, dari `satudata-erdigma`:

```bash
npm run api:types
```

Verifikasi hasilnya memuat skema baru:

```bash
grep -c "UserAdminResponse\|UserRoleUpdateRequest" src/shared/types/api.generated.ts
```

Expected: angka lebih dari 0. Kalau 0, back-end belum menyala atau endpoint belum terdaftar — periksa dulu, jangan menulis tipe dengan tangan.

- [ ] **Step 2: Ekspor nama ramah untuk tipe baru**

Di `src/shared/types/api.ts`, tambahkan pada blok ekspor (jaga urutan alfabet yang sudah ada):

```ts
export type UserAdmin = Schemas['UserAdminResponse']
export type PageOfUsers = Schemas['PageUserAdminResponse']
```

Kalau nama skema halaman yang ter-generate berbeda (springdoc menamainya dari tipe generik), pakai nama persis yang ada di `api.generated.ts` — cari dengan `grep "PageUserAdmin" src/shared/types/api.generated.ts`.

- [ ] **Step 3: Tambah helper `apiPatch`**

Di `src/shared/api/httpClient.ts`, tambahkan tepat setelah `apiPost`. Salin bentuk `apiPost` persis, ganti `.post` menjadi `.patch`:

```ts
export async function apiPatch<T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await instance.patch<T>(url, data, config)
  return response.data
}
```

- [ ] **Step 4: Tambah kunci cache**

Di `src/shared/api/queryKeys.ts`, tambahkan sebelum baris `stats:`:

```ts
  user: {
    all: ['user'] as const,
    list: (params: UserQuery) => ['user', 'list', params] as const,
  },
```

Dan impor tipenya di atas berkas, sejajar dengan impor `DatasetQuery` yang sudah ada:

```ts
import type { UserQuery } from '@/features/userManagement/api/userAdminApi'
```

- [ ] **Step 5: Buat modul api**

Buat `src/features/userManagement/api/userAdminApi.ts`:

```ts
import { apiGet, apiPatch } from '@/shared/api/httpClient'
import type { PageOfUsers, PortalRole, UserAdmin } from '@/shared/types/api'

const BASE = '/api/v1/users'

export interface UserQuery {
  q?: string
  /** Berbasis 0, mengikuti Spring Data. */
  page?: number
  size?: number
}

export function fetchUsers(query: UserQuery, signal?: AbortSignal): Promise<PageOfUsers> {
  return apiGet<PageOfUsers>(BASE, { params: query, signal })
}

/**
 * `role: null` mengembalikan orang itu mengikuti HRIS.
 *
 * Dikirim eksplisit sebagai null, bukan dengan menghilangkan ruasnya: keduanya
 * diperlakukan sama oleh back-end, tapi yang eksplisit membuat maksudnya
 * terbaca di Network tab saat ada yang perlu ditelusuri.
 */
export function updateUserRole(id: string, role: PortalRole | null): Promise<UserAdmin> {
  return apiPatch<UserAdmin>(`${BASE}/${encodeURIComponent(id)}/role`, { role })
}
```

- [ ] **Step 6: Buat hook**

Buat `src/features/userManagement/hooks/useUsers.ts`:

```ts
import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'

import { fetchUsers, type UserQuery } from '../api/userAdminApi'

export function useUsers(query: UserQuery) {
  return useQuery({
    queryKey: queryKeys.user.list(query),
    queryFn: ({ signal }) => fetchUsers(query, signal),
    // Daftar lama tetap tampil saat berpindah halaman atau mengetik pencarian,
    // supaya tabel tidak berkedip kosong.
    placeholderData: keepPreviousData,
  })
}
```

Buat `src/features/userManagement/hooks/useUpdateUserRole.ts`:

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'
import type { PortalRole } from '@/shared/types/api'

import { updateUserRole } from '../api/userAdminApi'

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: PortalRole | null }) =>
      updateUserRole(id, role),
    onSuccess: () => {
      // Seluruh halaman daftar ikut basi: peran yang berubah menggeser urutan
      // dan isi kolom di halaman mana pun yang sedang dibuka.
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all })
    },
  })
}
```

- [ ] **Step 7: Verifikasi tipe**

Run: `npm run typecheck`
Expected: lulus tanpa galat. Halaman yang memakainya belum ada — itu wajar, hook yang belum dipakai bukan galat tipe.

- [ ] **Step 8: Commit**

```bash
git add src/shared/types/api.generated.ts src/shared/types/api.ts src/shared/api/httpClient.ts src/shared/api/queryKeys.ts src/features/userManagement/
git commit -m "feat(user-management): lapisan data daftar pengguna dan ubah peran"
```

---

### Task 7: Halaman manajemen pengguna

**Files:**
- Create: `src/features/userManagement/pages/UserListPage.tsx`
- Modify: `src/app/router/paths.ts`
- Modify: `src/app/router/router.tsx`

**Interfaces:**
- Consumes: `useUsers`, `useUpdateUserRole` (Task 6); `paths.users`.
- Produces: `paths.users`, `routePatterns.users`, komponen default `UserListPage`. Task 8 menaut ke `paths.users`.

- [ ] **Step 1: Daftarkan rute**

Di `src/app/router/paths.ts`, tambahkan `users: '/users',` pada `paths` (setelah `status`) dan `users: 'users',` pada `routePatterns` (setelah `status`).

- [ ] **Step 2: Buat halaman**

Buat `src/features/userManagement/pages/UserListPage.tsx`:

```tsx
import { useState } from 'react'

import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { Badge } from '@/shared/components/ui/Badge'
import { PageContainer } from '@/shared/components/ui/PageContainer'
import { Pagination } from '@/shared/components/ui/Pagination'
import { SearchField } from '@/shared/components/ui/SearchField'
import { Skeleton } from '@/shared/components/ui/Skeleton'
import { useToast } from '@/shared/components/ui/toastStore'
import type { PortalRole, UserAdmin } from '@/shared/types/api'

import { useUpdateUserRole } from '../hooks/useUpdateUserRole'
import { useUsers } from '../hooks/useUsers'

const UKURAN_HALAMAN = 20

const PERAN: { nilai: PortalRole; label: string }[] = [
  { nilai: 'ADMIN', label: 'Admin' },
  { nilai: 'PUBLISHER', label: 'Publisher' },
  { nilai: 'STAFF', label: 'Staff' },
]

/**
 * Panel manajemen pengguna.
 *
 * Hanya admin warisan HRIS yang bisa membukanya — server menjawab 403 untuk
 * yang lain, dan pesannya ditampilkan apa adanya oleh QueryBoundary. Menu di
 * header pun disembunyikan, tapi itu kenyamanan, bukan pengamanan.
 */
export default function UserListPage() {
  // Halaman untuk manusia berbasis 1; API berbasis 0. Konversinya di satu
  // tempat, sama seperti useDatasetFilters.
  const [halaman, setHalaman] = useState(1)
  const [cari, setCari] = useState('')
  const query = useUsers({ q: cari || undefined, page: halaman - 1, size: UKURAN_HALAMAN })

  const { data: saya } = useCurrentUser()
  const ubahPeran = useUpdateUserRole()
  const toast = useToast()

  function pilihPeran(pengguna: UserAdmin, nilai: string) {
    const role = nilai === 'HRIS' ? null : (nilai as PortalRole)
    ubahPeran.mutate(
      { id: pengguna.id as string, role },
      {
        // success/error, bukan show: warna toast yang membedakan berhasil dari
        // gagal (lihat Toaster). Perubahan peran yang gagal tidak boleh terlihat
        // sama dengan yang berhasil.
        onSuccess: () =>
          toast.success(
            role === null
              ? `${pengguna.name} kembali mengikuti HRIS.`
              : `${pengguna.name} kini ${role}.`,
          ),
        onError: (galat) =>
          toast.error(galat instanceof Error ? galat.message : 'Gagal mengubah peran.'),
      },
    )
  }

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-ink-900 text-2xl font-extrabold tracking-[-0.4px]">
          Manajemen Pengguna
        </h1>
        <p className="text-ink-500 mt-1.5 text-sm">
          Pengguna yang pernah masuk ke Satu Data. Peran yang ditunjuk di sini bertahan melewati
          penyegaran data HRIS.
        </p>
      </div>

      <SearchField
        value={cari}
        onChange={(nilai) => {
          setCari(nilai)
          setHalaman(1)
        }}
        placeholder="Cari nama atau email"
        label="Cari pengguna"
        className="mb-5 max-w-md"
      />

      {/* `loading` wajib diisi — QueryBoundary tidak punya tampilan bawaan. */}
      <QueryBoundary query={query} loading={<Skeleton className="h-64 w-full rounded-xl" />}>
        {(page) => (
          <>
            <div className="border-line-200 overflow-x-auto rounded-xl border bg-white">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-line-200 text-ink-500 border-b text-[12.5px]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nama</th>
                    <th className="px-4 py-3 font-semibold">Jabatan</th>
                    <th className="px-4 py-3 font-semibold">Divisi</th>
                    <th className="px-4 py-3 font-semibold">Peran</th>
                    <th className="px-4 py-3 font-semibold">Sumber</th>
                    <th className="px-4 py-3 font-semibold">Ubah</th>
                  </tr>
                </thead>
                <tbody>
                  {(page.content ?? []).map((pengguna) => {
                    const diriSendiri = pengguna.id === saya?.id
                    return (
                      <tr key={pengguna.id} className="border-line-100 border-b last:border-0">
                        <td className="px-4 py-3">
                          <span className="text-ink-900 block font-semibold">{pengguna.name}</span>
                          <span className="text-ink-500 block text-xs">{pengguna.email}</span>
                        </td>
                        <td className="text-ink-600 px-4 py-3">{pengguna.position ?? '—'}</td>
                        <td className="text-ink-600 px-4 py-3">{pengguna.division?.name ?? '—'}</td>
                        <td className="px-4 py-3">
                          <Badge tone={pengguna.role === 'ADMIN' ? 'brand' : 'neutral'}>
                            {pengguna.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={pengguna.roleOverride ? 'warning' : 'neutral'}>
                            {pengguna.roleOverride ? 'Diatur manual' : 'Dari HRIS'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {diriSendiri ? (
                            <span className="text-ink-500 text-xs">Peran sendiri</span>
                          ) : (
                            <select
                              aria-label={`Ubah peran ${pengguna.name}`}
                              className="border-line-300 rounded-lg border px-2 py-1.5 text-sm"
                              value={pengguna.roleOverride ?? 'HRIS'}
                              disabled={ubahPeran.isPending}
                              onChange={(e) => pilihPeran(pengguna, e.target.value)}
                            >
                              <option value="HRIS">Ikuti HRIS</option>
                              {PERAN.map((p) => (
                                <option key={p.nilai} value={p.nilai}>
                                  {p.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              className="mt-6 justify-center"
              page={halaman}
              totalPages={page.totalPages ?? 1}
              onPageChange={setHalaman}
              labels
            />
          </>
        )}
      </QueryBoundary>
    </PageContainer>
  )
}
```

- [ ] **Step 3: Daftarkan halaman di router**

Di `src/app/router/router.tsx`, tambahkan impor lazy sejajar dengan yang lain:

```tsx
const UserListPage = lazy(() => import('@/features/userManagement/pages/UserListPage'))
```

dan rutenya di dalam `children`, tepat setelah baris `status`:

```tsx
          { path: routePatterns.users, element: halaman(<UserListPage />) },
```

- [ ] **Step 4: Verifikasi tipe dan lint**

Run: `npm run typecheck` lalu `npm run lint`
Expected: keduanya lulus.

- [ ] **Step 5: Commit**

```bash
git add src/features/userManagement/pages/UserListPage.tsx src/app/router/paths.ts src/app/router/router.tsx
git commit -m "feat(user-management): halaman daftar pengguna dan penunjukan peran"
```

---

### Task 8: Menu bersyarat dan verifikasi menyeluruh

**Files:**
- Modify: `src/app/layouts/SiteHeader.tsx`

**Interfaces:**
- Consumes: `paths.users` (Task 7), `useCurrentUser()`.
- Produces: —

- [ ] **Step 1: Jadikan daftar navigasi bergantung identitas**

Di `src/app/layouts/SiteHeader.tsx`, biarkan konstanta `NAV` apa adanya dan tambahkan di dalam `SiteHeader()`, sebelum `return`:

```tsx
  const { data: pengguna } = useCurrentUser()

  // Manajemen pengguna hanya untuk admin warisan HRIS. Syaratnya konjungsi,
  // sama persis dengan gerbang di server — admin tunjukan punya role ADMIN
  // tetapi tingkat izin HRIS-nya bukan ADMIN. Penyembunyian ini kenyamanan;
  // yang menegakkan tetap server, yang menjawab 403.
  const bolehKelolaPengguna =
    pengguna?.role === 'ADMIN' && pengguna?.hrisPermissionLevel === 'ADMIN'

  const nav = bolehKelolaPengguna
    ? [...NAV, { to: paths.users, label: 'Pengguna' }]
    : [...NAV]
```

Tambahkan impor `useCurrentUser` bila belum ada di berkas itu — komponen `UserPill` di bawahnya sudah memakainya, jadi impornya kemungkinan besar sudah tersedia.

- [ ] **Step 2: Pakai `nav` di kedua tempat render**

Ganti `NAV.map(` menjadi `nav.map(` pada dua tempat: navigasi desktop (`<nav className="ml-2 hidden ...">`) dan menu mobile (`{menuTerbuka ? (`).

- [ ] **Step 3: Verifikasi front-end menyeluruh**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: ketiganya lulus.

- [ ] **Step 4: Verifikasi back-end menyeluruh**

Dari `satudata-erdigma-api`:

Run: `./mvnw.cmd test`
Expected: seluruh test lulus.

- [ ] **Step 5: Uji manual jalur utama**

Back-end hidup di 8082 (`./mvnw.cmd spring-boot:run`), front-end `npm run dev`. Masuk dengan akun yang `hrisPermissionLevel`-nya `ADMIN`, lalu periksa berurutan:

1. Menu "Pengguna" muncul di header.
2. Halaman `/users` menampilkan daftar, pencarian menyaring.
3. Menunjuk seseorang jadi Admin: lencana berubah jadi "Diatur manual".
4. Memilih "Ikuti HRIS" pada orang yang sama: lencana kembali "Dari HRIS".
5. Baris diri sendiri menampilkan "Peran sendiri", tanpa dropdown.
6. Masuk dengan akun biasa: menu "Pengguna" tidak ada, dan membuka `/users` langsung menampilkan pesan galat dari server, bukan halaman kosong.

- [ ] **Step 6: Commit**

```bash
git add src/app/layouts/SiteHeader.tsx
git commit -m "feat(user-management): menu Pengguna hanya untuk admin warisan HRIS"
```

---

## Catatan penutup untuk pelaksana

Rencana ini **tidak** menyentuh dugaan salah tunjuk `HRIS_BASE_URL` di produksi yang tercatat di bagian "Catatan operasional" pada spec. Kalau login produksi masih ditolak setelah semua tugas di atas selesai, itu bukan regresi dari pekerjaan ini — telusuri variabel lingkungan dan profil Spring di lingkungan produksi.
