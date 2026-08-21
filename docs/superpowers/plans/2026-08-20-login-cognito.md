# Login Cognito Satu Data — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyalakan login Cognito sungguhan di portal Satu Data, dari tombol masuk sampai baris `users` yang terisi otomatis dari HRIS.

**Architecture:** Front-end memakai Authorization Code + PKCE ke Hosted UI Cognito milik HRIS, menyimpan token hanya di memori modul, dan memulihkan sesi lewat re-auth senyap ke `/oauth2/authorize`. Back-end memvalidasi JWT sebagai OAuth2 resource server, lalu pada login pertama menanyakan identitas orang itu ke `GET /api/v1/user/me` milik hris-api memakai token pemanggil sendiri dan menyalinnya ke tabel `users` lokal. Seam yang sudah ada — `AuthStrategy` di web, `EmployeeDirectory` di API — tidak diganti, hanya diisi.

**Tech Stack:** React 19 + Vite 7 + TypeScript 5.9 + axios + zod (web); Spring Boot 4.1 + Java 17 + Spring Security OAuth2 Resource Server + `RestClient` + JPA/Liquibase (API).

**Spec:** `docs/superpowers/specs/2026-08-20-login-cognito-design.md`

## Global Constraints

- Dua repositori disentuh: `d:\Erdigma\satudata-erdigma` (web) dan `d:\Erdigma\satudata-erdigma-api` (Spring Boot). **Tidak ada** perubahan di `hris-web` maupun `hris-api`.
- Nilai Cognito, dipakai apa adanya, jangan dikarang ulang:
  - Issuer: `https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_9QsfQSnwN`
  - App client: `3bujv9976rnq1smm31kff4h9s5`
  - Domain Hosted UI: `https://ap-southeast-19qsfqsnwn.auth.ap-southeast-1.amazoncognito.com`
  - Scope: `email openid phone aws.cognito.signin.user.admin`
- hris-api dev: `https://hris-dev.api.zcode.id/api/v1`. Prod: `https://hris.api.zcode.id/api/v1` (lewat env `HRIS_BASE_URL`).
- Token akses **tidak boleh** menyentuh `localStorage` maupun `sessionStorage`. Yang boleh dititipkan di `sessionStorage` hanya PKCE verifier, `state`, tujuan navigasi, dan penanda `pernah-masuk` — semuanya bukan kredensial.
- Komentar dan pesan galat ditulis dalam bahasa Indonesia, mengikuti seluruh berkas yang ada di kedua repositori. Nama simbol tetap bahasa Inggris.
- Perubahan yang memotong sudut dengan batas atas yang diketahui ditandai komentar berawalan `ponytail:` yang menyebut batas dan jalur peningkatannya.
- Back-end memerlukan Postgres lokal: `docker compose up -d db` di `satudata-erdigma-api` (port host 5433). Seluruh `mvnw test` di rencana ini mengandaikan container itu hidup.
- Perintah dijalankan dari akar repositori yang bersangkutan kecuali disebut lain.

---

### Task 0: Branch kerja

**Files:** tidak ada berkas berubah.

Kedua repositori sekarang berada di branch default. Jangan menumpuk pekerjaan ini di sana.

- [ ] **Step 1: Branch di repo web**

```bash
cd /d/Erdigma/satudata-erdigma
git checkout -b feat/login-cognito
git branch --show-current
```

Expected: `feat/login-cognito`

- [ ] **Step 2: Branch di repo API**

```bash
cd /d/Erdigma/satudata-erdigma-api
git status --short
git checkout -b feat/login-cognito
git branch --show-current
```

Expected: `feat/login-cognito`. Bila `git status` menampilkan berkas yang belum di-commit, hentikan dan laporkan — jangan menimpanya.

---

### Task 1: `HrisRoleMapper` — pemetaan jenjang jabatan ke peran portal

Repositori: `satudata-erdigma-api`

**Files:**
- Create: `src/main/java/id/co/erdigma/satudata/modules/user/port/hris/HrisRoleMapper.java`
- Test: `src/test/java/id/co/erdigma/satudata/modules/user/port/hris/HrisRoleMapperTest.java`

**Interfaces:**
- Consumes: `id.co.erdigma.satudata.enums.HrisPermissionLevel`, `id.co.erdigma.satudata.enums.Role` (sudah ada).
- Produces:
  - `static HrisPermissionLevel HrisRoleMapper.permissionLevel(String hrisRole, String jobLevel, String position)`
  - `static Role HrisRoleMapper.role(HrisPermissionLevel level)`

Kelas ini menyalin `PermissionLevelHelper` milik hris-api. Disalin, bukan dipanggil, karena `GET /api/v1/user/me` hanya mengembalikan bahan mentahnya (`role`, `employee.jobLevel`, `employee.position.name`), bukan tingkat izin yang sudah jadi.

- [ ] **Step 1: Tulis test yang gagal**

Create `src/test/java/id/co/erdigma/satudata/modules/user/port/hris/HrisRoleMapperTest.java`:

```java
package id.co.erdigma.satudata.modules.user.port.hris;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import id.co.erdigma.satudata.enums.HrisPermissionLevel;
import id.co.erdigma.satudata.enums.Role;

/**
 * Tabel kasus diambil dari DUMMY_IDENTITIES di
 * satudata-erdigma/src/features/auth/model/types.ts — sepuluh identitas yang
 * dipakai mode dummy. Kalau pemetaan di sini melenceng, mode dummy dan mode
 * Cognito diam-diam memberi peran berbeda untuk orang yang sama.
 */
class HrisRoleMapperTest {

    @ParameterizedTest(name = "{0} / {1} / {2} -> {3} / {4}")
    @DisplayName("kesepuluh identitas dummy dipetakan seperti di types.ts")
    @CsvSource({
            // hrisRole, jobLevel,          position,                     level,               role
            "ADMIN,      Admin,             Project Manager Data & IT,    ADMIN,               ADMIN",
            "STAFF,      Direktur Utama,    Direktur Utama,               DIRECTOR,            ADMIN",
            "STAFF,      General Manager,   General Manager Produk,       DIRECTOR,            ADMIN",
            "STAFF,      Staff,             Corporate Secretary,          CORPORATE_SECRETARY, PUBLISHER",
            "STAFF,      Manager,           Manager Teknologi Informasi,  MANAGER,             PUBLISHER",
            "STAFF,      Coordinator,       Koordinator Kampanye Digital, MANAGER,             PUBLISHER",
            "STAFF,      Specialist,        Data Specialist,              STAFF,               STAFF",
            "STAFF,      Staff,             Staff Penjualan,              STAFF,               STAFF",
            "STAFF,      Non Staff,         Administrasi Umum,            STAFF,               STAFF",
            "STAFF,      Staff,             Staff Operasional,            STAFF,               STAFF",
    })
    void memetakanIdentitasDummy(
            String hrisRole, String jobLevel, String position,
            HrisPermissionLevel levelDiharapkan, Role roleDiharapkan) {

        HrisPermissionLevel level = HrisRoleMapper.permissionLevel(hrisRole, jobLevel, position);

        assertThat(level).isEqualTo(levelDiharapkan);
        assertThat(HrisRoleMapper.role(level)).isEqualTo(roleDiharapkan);
    }

    @Test
    @DisplayName("Direktur tetap DIRECTOR walau bukan Direktur Utama")
    void direkturBiasa() {
        assertThat(HrisRoleMapper.permissionLevel("STAFF", "Direktur", "Direktur Keuangan"))
                .isEqualTo(HrisPermissionLevel.DIRECTOR);
    }

    @Test
    @DisplayName("Corporate Secretary berjenjang Manager BUKAN CORPORATE_SECRETARY")
    void corporateSecretaryHanyaDiJenjangStaf() {
        assertThat(HrisRoleMapper.permissionLevel("STAFF", "Manager", "Corporate Secretary"))
                .isEqualTo(HrisPermissionLevel.MANAGER);
    }

    @Test
    @DisplayName("jenjang tak dikenal jadi STAFF, bukan lemparan")
    void jenjangTakDikenal() {
        assertThat(HrisRoleMapper.permissionLevel("STAFF", "Kepala Suku", "Ketua Adat"))
                .isEqualTo(HrisPermissionLevel.STAFF);
    }

    @Test
    @DisplayName("jobLevel null tidak melempar NullPointerException")
    void jobLevelNull() {
        assertThat(HrisRoleMapper.permissionLevel("STAFF", null, null))
                .isEqualTo(HrisPermissionLevel.STAFF);
    }

    @Test
    @DisplayName("role ADMIN di HRIS menang atas jenjang apa pun")
    void adminMenang() {
        assertThat(HrisRoleMapper.permissionLevel("ADMIN", "Non Staff", "Magang"))
                .isEqualTo(HrisPermissionLevel.ADMIN);
    }
}
```

Tambahkan impor `org.junit.jupiter.api.Test` di berkas yang sama (dipakai oleh kelima test tanpa parameter):

```java
import org.junit.jupiter.api.Test;
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

```bash
cd /d/Erdigma/satudata-erdigma-api
./mvnw.cmd -q test -Dtest=HrisRoleMapperTest
```

Expected: gagal kompilasi dengan `cannot find symbol: class HrisRoleMapper`.

- [ ] **Step 3: Tulis implementasinya**

Create `src/main/java/id/co/erdigma/satudata/modules/user/port/hris/HrisRoleMapper.java`:

```java
package id.co.erdigma.satudata.modules.user.port.hris;

import java.util.List;

import id.co.erdigma.satudata.enums.HrisPermissionLevel;
import id.co.erdigma.satudata.enums.Role;

import lombok.extern.slf4j.Slf4j;

/**
 * Menerjemahkan jenjang jabatan HRIS menjadi peran portal.
 *
 * Daftar jenjang di bawah adalah salinan PermissionLevelHelper milik hris-api
 * (modules/task/helper/PermissionLevelHelper.java). Disalin, bukan dipanggil,
 * karena GET /api/v1/user/me tidak mengembalikan tingkat izin yang sudah jadi —
 * hanya bahan mentahnya. Kalau HRIS menambah nama jenjang baru, berkas ini yang
 * harus menyusul; log peringatan di bawah yang memberi tahu.
 */
@Slf4j
public final class HrisRoleMapper {

    private static final List<String> DIRECTOR_LEVELS = List.of(
            "Direktur",
            "Direktur Utama",
            "General Manager");

    private static final List<String> MANAGER_LEVELS = List.of(
            "Manager",
            "Junior Manager",
            "Senior Manager",
            "Supervisor",
            "Coordinator");

    private static final List<String> STAFF_LEVELS = List.of(
            "Specialist",
            "Non Staff",
            "Staff");

    private static final String CORPORATE_SECRETARY_POSITION = "Corporate Secretary";

    private HrisRoleMapper() {
    }

    /**
     * @param hrisRole nilai enum Role milik hris-api sebagai teks, mis. "ADMIN"
     * @param jobLevel employee.jobLevel dari hris-api, boleh null
     * @param position employee.position.name dari hris-api, boleh null
     */
    public static HrisPermissionLevel permissionLevel(String hrisRole, String jobLevel, String position) {
        // List.of(...).contains(null) melempar NullPointerException, jadi null
        // dinormalkan lebih dulu alih-alih dijaga di tiap pemeriksaan.
        String jenjang = (jobLevel != null) ? jobLevel : "";

        if ("ADMIN".equals(hrisRole)) {
            return HrisPermissionLevel.ADMIN;
        }
        if (DIRECTOR_LEVELS.contains(jenjang)) {
            return HrisPermissionLevel.DIRECTOR;
        }
        if (STAFF_LEVELS.contains(jenjang) && CORPORATE_SECRETARY_POSITION.equals(position)) {
            return HrisPermissionLevel.CORPORATE_SECRETARY;
        }
        if (MANAGER_LEVELS.contains(jenjang)) {
            return HrisPermissionLevel.MANAGER;
        }
        if (STAFF_LEVELS.contains(jenjang)) {
            return HrisPermissionLevel.STAFF;
        }

        // hris-api melempar IllegalArgumentException di titik ini. Di sini tidak:
        // menolak karyawan sah gara-gara HR menambah nama jenjang baru lebih
        // merugikan daripada memberinya hak terendah. Log-nya yang jadi alarm.
        log.warn("Jenjang jabatan '{}' tidak dikenal — diberi STAFF. Perbarui daftar di HrisRoleMapper.",
                jobLevel);
        return HrisPermissionLevel.STAFF;
    }

    /**
     * Pemetaan ke peran portal. Bukan karangan: dibaca dari tabel sepuluh
     * identitas dummy di features/auth/model/types.ts, supaya mode dummy dan
     * mode Cognito memberi peran yang sama untuk orang yang sama.
     */
    public static Role role(HrisPermissionLevel level) {
        return switch (level) {
            case ADMIN, DIRECTOR -> Role.ADMIN;
            case CORPORATE_SECRETARY, MANAGER -> Role.PUBLISHER;
            case STAFF -> Role.STAFF;
        };
    }
}
```

- [ ] **Step 4: Jalankan test, pastikan LULUS**

```bash
cd /d/Erdigma/satudata-erdigma-api
./mvnw.cmd -q test -Dtest=HrisRoleMapperTest
```

Expected: `BUILD SUCCESS`, 15 test lulus (10 parameterized + 5 tunggal).

- [ ] **Step 5: Commit**

```bash
cd /d/Erdigma/satudata-erdigma-api
git add src/main/java/id/co/erdigma/satudata/modules/user/port/hris/HrisRoleMapper.java src/test/java/id/co/erdigma/satudata/modules/user/port/hris/HrisRoleMapperTest.java
git commit -m "feat(auth): peta jenjang jabatan HRIS ke peran portal"
```

---

### Task 2: Seam `EmployeeDirectory` menerima token pemanggil

Repositori: `satudata-erdigma-api`

**Files:**
- Modify: `src/main/java/id/co/erdigma/satudata/modules/user/port/EmployeeDirectory.java`
- Modify: `src/main/java/id/co/erdigma/satudata/config/CustomJwtAuthenticationConverter.java:44`

**Interfaces:**
- Produces: `Optional<User> EmployeeDirectory.findByCognitoId(String cognitoId, String accessToken)` — metode `default` yang mengabaikan token dan jatuh ke versi 1-argumen. Task 3 menimpanya.

Kenapa token diambil dari converter dan bukan `SecurityContextHolder`: converter berjalan **saat** autentikasi dibangun, sehingga `SecurityContext` belum terisi. Objek `Jwt` di tangannya satu-satunya tempat token mentah tersedia pada titik itu.

- [ ] **Step 1: Tambah metode 2-argumen ke port**

Modify `src/main/java/id/co/erdigma/satudata/modules/user/port/EmployeeDirectory.java` — ganti isi antarmuka menjadi:

```java
public interface EmployeeDirectory {

    Optional<User> findByCognitoId(String cognitoId);

    /**
     * Varian yang membawa token mentah si pemanggil, untuk implementasi yang
     * perlu bertanya ke HRIS atas nama orang itu.
     *
     * Bawaannya mengabaikan token dan jatuh ke versi di atas, supaya
     * implementasi yang cukup membaca tabel lokal tidak perlu ikut berubah.
     */
    default Optional<User> findByCognitoId(String cognitoId, String accessToken) {
        return findByCognitoId(cognitoId);
    }
}
```

- [ ] **Step 2: Converter meneruskan token**

Modify `src/main/java/id/co/erdigma/satudata/config/CustomJwtAuthenticationConverter.java` — ganti baris

```java
        User user = employeeDirectory.findByCognitoId(userId)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
```

menjadi

```java
        // Token mentah ikut diteruskan: implementasi HRIS memakainya untuk
        // menanyakan identitas orang ini ke hris-api atas namanya sendiri.
        // SecurityContextHolder belum terisi di titik ini — converter justru
        // yang sedang membangunnya — jadi Jwt inilah satu-satunya sumbernya.
        User user = employeeDirectory.findByCognitoId(userId, jwt.getTokenValue())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
```

- [ ] **Step 3: Pastikan tidak ada yang pecah**

```bash
cd /d/Erdigma/satudata-erdigma-api
./mvnw.cmd -q test
```

Expected: `BUILD SUCCESS`. `DummyEmployeeDirectory` tidak disentuh — ia mewarisi metode `default` apa adanya.

- [ ] **Step 4: Commit**

```bash
cd /d/Erdigma/satudata-erdigma-api
git add src/main/java/id/co/erdigma/satudata/modules/user/port/EmployeeDirectory.java src/main/java/id/co/erdigma/satudata/config/CustomJwtAuthenticationConverter.java
git commit -m "feat(auth): seam EmployeeDirectory menerima token pemanggil"
```

---

### Task 3: `HrisEmployeeDirectory` — provisioning just-in-time dari hris-api

Repositori: `satudata-erdigma-api`

**Files:**
- Create: `src/main/java/id/co/erdigma/satudata/modules/user/port/hris/HrisMeResponse.java`
- Create: `src/main/java/id/co/erdigma/satudata/modules/user/port/hris/HrisEmployeeDirectory.java`
- Modify: `src/main/java/id/co/erdigma/satudata/modules/division/repository/DivisionRepository.java`
- Modify: `src/main/resources/application.yaml`
- Modify: `src/main/resources/application-prod.yaml`
- Test: `src/test/java/id/co/erdigma/satudata/config/CognitoProfileContextTest.java`

**Interfaces:**
- Consumes: `HrisRoleMapper.permissionLevel(...)` dan `HrisRoleMapper.role(...)` dari Task 1; `EmployeeDirectory.findByCognitoId(String, String)` dari Task 2.
- Produces: bean `EmployeeDirectory` yang aktif pada profil selain `auth-dummy`. Inilah yang menutup lubang yang sekarang membuat aplikasi gagal start di luar profil dummy.

- [ ] **Step 1: Tulis test yang gagal**

Test ini menegakkan satu hal yang benar-benar rusak hari ini: profil non-dummy tidak bisa start karena `CustomJwtAuthenticationConverter` tidak mendapat bean `EmployeeDirectory`.

Create `src/test/java/id/co/erdigma/satudata/config/CognitoProfileContextTest.java`:

```java
package id.co.erdigma.satudata.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import id.co.erdigma.satudata.modules.user.port.EmployeeDirectory;
import id.co.erdigma.satudata.modules.user.port.hris.HrisEmployeeDirectory;

/**
 * Profil tanpa auth-dummy harus bisa start. Sebelum HrisEmployeeDirectory ada,
 * konteks gagal dibangun karena CustomJwtAuthenticationConverter meminta bean
 * EmployeeDirectory yang satu-satunya implementasinya @Profile("auth-dummy").
 *
 * jwk-set-uri sengaja ditimpa dengan host yang tidak ada: dekoder JWT yang
 * dibangun dari jwk-set-uri mengambil kuncinya saat token pertama diperiksa,
 * bukan saat start, sehingga test ini tidak memerlukan jaringan. Dekoder yang
 * dibangun dari issuer-uri saja akan menarik metadata OIDC saat start dan
 * membuat test bergantung pada internet.
 */
@SpringBootTest(properties = {
        "spring.profiles.active=dev",
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://example.invalid/.well-known/jwks.json",
})
class CognitoProfileContextTest {

    @Autowired
    private EmployeeDirectory employeeDirectory;

    @Test
    @DisplayName("profil non-dummy memakai HrisEmployeeDirectory")
    void memakaiDirektoriHris() {
        assertThat(employeeDirectory).isInstanceOf(HrisEmployeeDirectory.class);
    }
}
```

- [ ] **Step 2: Jalankan test, pastikan GAGAL**

```bash
cd /d/Erdigma/satudata-erdigma-api
docker compose up -d db
./mvnw.cmd -q test -Dtest=CognitoProfileContextTest
```

Expected: gagal kompilasi dengan `cannot find symbol: class HrisEmployeeDirectory`.

- [ ] **Step 3: Tambah pencarian divisi lewat id departemen HRIS**

Modify `src/main/java/id/co/erdigma/satudata/modules/division/repository/DivisionRepository.java` — tambahkan impor `java.util.Optional` dan satu metode:

```java
import java.util.Optional;
```

```java
    Optional<Division> findByHrisDepartementIdAndDeletedAtIsNull(UUID hrisDepartementId);
```

- [ ] **Step 4: Tulis DTO balasan hris-api**

Create `src/main/java/id/co/erdigma/satudata/modules/user/port/hris/HrisMeResponse.java`:

```java
package id.co.erdigma.satudata.modules.user.port.hris;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.Data;

/**
 * Potongan balasan GET /api/v1/user/me milik hris-api yang benar-benar dipakai
 * Satu Data.
 *
 * Balasan aslinya jauh lebih besar — kebijakan izin, gedung, atasan, tribe,
 * tanggal lahir. Memetakan seluruhnya berarti mengikat portal ini pada bentuk
 * internal HRIS dan membuatnya ikut pecah setiap kali bentuk itu berubah.
 * ignoreUnknown = true membuat penambahan ruas di sisi HRIS tidak berakibat
 * apa-apa di sini.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class HrisMeResponse {

    private String email;

    /** Enum Role milik hris-api, diterima sebagai teks supaya tidak perlu diimpor. */
    private String role;

    private Employee employee;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Employee {
        private String name;
        private String jobLevel;
        private Position position;
        private Departement departement;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Position {
        private String name;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Departement {
        private UUID id;
    }
}
```

- [ ] **Step 5: Tulis `HrisEmployeeDirectory`**

Create `src/main/java/id/co/erdigma/satudata/modules/user/port/hris/HrisEmployeeDirectory.java`:

```java
package id.co.erdigma.satudata.modules.user.port.hris;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import id.co.erdigma.satudata.entity.User;
import id.co.erdigma.satudata.enums.HrisPermissionLevel;
import id.co.erdigma.satudata.modules.division.repository.DivisionRepository;
import id.co.erdigma.satudata.modules.user.port.EmployeeDirectory;
import id.co.erdigma.satudata.repository.UserRepository;

import lombok.extern.slf4j.Slf4j;

/**
 * Sumber data karyawan untuk seluruh profil selain auth-dummy.
 *
 * Baris di tabel {@code users} lokal adalah bayangan, bukan sumber kebenaran:
 * pada login pertama identitas orang itu ditanyakan ke hris-api memakai token
 * miliknya sendiri, lalu disalin ke sini. Tidak ada seed manual, tidak ada
 * kredensial layanan — satu user pool, satu app client, jadi hris-api menilai
 * izinnya persis seperti saat orang itu membuka HRIS.
 */
@Component
@Profile("!auth-dummy")
@Slf4j
public class HrisEmployeeDirectory implements EmployeeDirectory {

    /**
     * ponytail: baris yang lebih muda dari ambang ini dipakai tanpa bertanya ke
     * HRIS. Tanpa ambang, SETIAP permintaan API memicu satu panggilan HTTP.
     * Kalau kesegaran data jadi masalah, jawabannya webhook atau tugas
     * terjadwal dari HRIS — bukan memperkecil ambang ini.
     */
    private static final Duration SEGAR = Duration.ofHours(12);

    private final UserRepository userRepository;
    private final DivisionRepository divisionRepository;
    private final RestClient hris;

    public HrisEmployeeDirectory(
            UserRepository userRepository,
            DivisionRepository divisionRepository,
            RestClient.Builder builder,
            @Value("${hris.base-url}") String baseUrl) {
        this.userRepository = userRepository;
        this.divisionRepository = divisionRepository;
        this.hris = builder.baseUrl(baseUrl).build();
    }

    /**
     * Pencarian tanpa token — dipakai CurrentUserService di tengah permintaan,
     * saat barisnya sudah pasti ada karena converter menjalankan varian di
     * bawah lebih dulu pada permintaan yang sama.
     */
    @Override
    @Transactional(readOnly = true)
    public Optional<User> findByCognitoId(String cognitoId) {
        return userRepository.findByCognitoId(cognitoId);
    }

    @Override
    @Transactional
    public Optional<User> findByCognitoId(String cognitoId, String accessToken) {
        Optional<User> lokal = userRepository.findByCognitoId(cognitoId);
        if (lokal.isPresent() && masihSegar(lokal.get())) {
            return lokal;
        }

        HrisMeResponse jawaban;
        try {
            jawaban = hris.get()
                    .uri("/user/me")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .retrieve()
                    .body(HrisMeResponse.class);
        } catch (HttpClientErrorException e) {
            // 401/403/404 dari HRIS berarti orang ini memang tidak berhak atau
            // tidak ada. Kosong di sini berujung 401 — jalur yang sama dengan
            // karyawan yang sudah resign, dan front-end sudah menanganinya.
            log.info("hris-api menjawab {} untuk cognitoId {}", e.getStatusCode(), cognitoId);
            return Optional.empty();
        } catch (RestClientException e) {
            // HRIS sedang mati atau tak terjangkau. Kalau barisnya sudah ada,
            // yang basi tetap dipakai: memutus seluruh portal karena sistem
            // tetangga sedang tumbang adalah hukuman yang tidak sebanding.
            log.warn("hris-api tidak dapat dihubungi ({}). Memakai baris lokal bila ada.", e.getMessage());
            return lokal;
        }

        if (jawaban == null || jawaban.getEmployee() == null) {
            log.warn("Balasan /user/me tanpa data karyawan untuk cognitoId {}", cognitoId);
            return Optional.empty();
        }

        return Optional.of(upsert(lokal.orElse(null), cognitoId, jawaban));
    }

    private boolean masihSegar(User user) {
        return user.getUpdatedAt() != null
                && user.getUpdatedAt().isAfter(LocalDateTime.now().minus(SEGAR));
    }

    private User upsert(User lama, String cognitoId, HrisMeResponse jawaban) {
        User user = (lama != null) ? lama : new User();
        if (lama == null) {
            // cognitoId adalah identitas baris ini dan tidak pernah diubah lagi.
            user.setCognitoId(cognitoId);
        }

        HrisMeResponse.Employee employee = jawaban.getEmployee();
        String position = (employee.getPosition() != null) ? employee.getPosition().getName() : null;

        user.setEmail(jawaban.getEmail());
        user.setName(employee.getName());
        user.setJobLevel(employee.getJobLevel());
        user.setPosition(position);

        // Peran selalu dihitung ulang dari HRIS. Belum ada antarmuka untuk
        // mengubah peran secara manual, jadi tidak ada yang bisa tertimpa;
        // begitu ada, keputusan ini harus ditinjau ulang.
        HrisPermissionLevel level = HrisRoleMapper.permissionLevel(
                jawaban.getRole(), employee.getJobLevel(), position);
        user.setHrisPermissionLevel(level);
        user.setRole(HrisRoleMapper.role(level));

        UUID departementId = (employee.getDepartement() != null) ? employee.getDepartement().getId() : null;
        if (departementId != null) {
            // Divisi hanya ditimpa kalau padanannya ketemu. Kolom
            // division.hris_departement_id masih null untuk kedelapan divisi
            // seed, jadi untuk sementara pengguna baru berdivisi null — itu
            // sudah nullable di sepanjang MeService dan CurrentUserService.
            divisionRepository.findByHrisDepartementIdAndDeletedAtIsNull(departementId)
                    .ifPresent(user::setDivision);
        }

        // Diisi manual: entitas memakai @LastModifiedDate tetapi tidak memasang
        // AuditingEntityListener, jadi nilainya tidak pernah bergerak sendiri —
        // dan masihSegar() di atas bergantung padanya.
        user.setUpdatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }
}
```

- [ ] **Step 6: Naikkan konfigurasi ke berkas induk**

Modify `src/main/resources/application.yaml` — di blok `spring:` yang sudah ada, tambahkan `security` sejajar dengan `jpa` dan `liquibase`:

```yaml
  security:
    oauth2:
      resourceserver:
        jwt:
          # User pool yang sama dengan hris-api dan Taskfy — lihat
          # hris-api/src/main/resources/application.properties. Dulu hanya ada
          # di profil prod, sehingga profil dev tanpa auth-dummy tidak bisa
          # start sama sekali.
          issuer-uri: ${COGNITO_ISSUER_URI:https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_9QsfQSnwN}
```

Lalu ganti blok `hris:` yang sekarang berbunyi:

```yaml
# Asal data karyawan. Selama profil auth-dummy, base-url tidak dipakai.
hris:
  base-url: ${HRIS_BASE_URL:}
```

menjadi:

```yaml
# Asal data karyawan. Selama profil auth-dummy, base-url tidak dipakai.
# Bawaannya menunjuk hris-api dev; produksi menimpanya lewat HRIS_BASE_URL
# dengan https://hris.api.zcode.id/api/v1
hris:
  base-url: ${HRIS_BASE_URL:https://hris-dev.api.zcode.id/api/v1}
```

- [ ] **Step 7: Buang blok kembar di profil prod**

Modify `src/main/resources/application-prod.yaml` — hapus blok berikut, karena `application.yaml` kini menyediakannya dan env var `COGNITO_ISSUER_URI` tetap bekerja seperti sebelumnya:

```yaml
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${COGNITO_ISSUER_URI}
```

Berkas itu menyisakan blok `spring.datasource` dan `aws.cognito`. Jangan sentuh keduanya.

- [ ] **Step 8: Jalankan test, pastikan LULUS**

```bash
cd /d/Erdigma/satudata-erdigma-api
./mvnw.cmd -q test
```

Expected: `BUILD SUCCESS`. `CognitoProfileContextTest` lulus (profil non-dummy kini bisa start), `SatudataApplicationTests` dan `HrisRoleMapperTest` tetap lulus.

- [ ] **Step 9: Commit**

```bash
cd /d/Erdigma/satudata-erdigma-api
git add src/main/java/id/co/erdigma/satudata/modules/user/port/hris/ src/main/java/id/co/erdigma/satudata/modules/division/repository/DivisionRepository.java src/main/resources/application.yaml src/main/resources/application-prod.yaml src/test/java/id/co/erdigma/satudata/config/CognitoProfileContextTest.java
git commit -m "feat(auth): provisioning karyawan just-in-time dari hris-api"
```

---

### Task 4: Variabel lingkungan Cognito di web

Repositori: `satudata-erdigma`

**Files:**
- Modify: `src/shared/config/env.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `env.cognito.domain: string`, `env.cognito.clientId: string`, `env.cognito.redirectUri: string` — dipakai Task 6.

Front-end tidak punya kerangka uji dan rencana ini tidak menambahkannya. Verifikasi tiap task front-end memakai `npm run typecheck` dan `npm run lint`; verifikasi perilakunya ada di Task 9.

- [ ] **Step 1: Tambah ketiga variabel ke skema**

Modify `src/shared/config/env.ts` — di dalam `z.object({ ... })`, setelah `VITE_AUTH_MODE`, tambahkan:

```ts
  /**
   * Domain Hosted UI Cognito, tanpa garis miring di akhir. Sama dengan yang
   * dipakai hris-web dan Taskfy — satu user pool untuk seluruh perusahaan.
   */
  VITE_COGNITO_DOMAIN: z
    .string()
    .trim()
    .default('')
    .refine((v) => v === '' || /^https:\/\//.test(v), {
      message: 'harus kosong atau diawali https://',
    })
    .transform((v) => v.replace(/\/+$/, '')),

  /**
   * Client id app client Cognito. Bukan rahasia: nilainya memang muncul di URL
   * setiap kali pengguna diarahkan ke Hosted UI. Yang menjaga pertukaran kode
   * adalah PKCE, bukan kerahasiaan nilai ini.
   */
  VITE_COGNITO_CLIENT_ID: z.string().trim().default(''),

  /**
   * Alamat balik setelah masuk. Kosong berarti origin halaman ini, yang benar
   * untuk semua lingkungan selama origin-nya terdaftar di app client.
   */
  VITE_COGNITO_REDIRECT_URI: z
    .string()
    .trim()
    .default('')
    .transform((v) => v.replace(/\/+$/, '')),
```

- [ ] **Step 2: Wajibkan isinya saat mode cognito**

Modify `src/shared/config/env.ts` — bungkus skema dengan `superRefine`. Ganti baris

```ts
const parsed = envSchema.safeParse(import.meta.env)
```

menjadi

```ts
/**
 * Ketiga nilai Cognito hanya wajib saat mode-nya memang dipakai. Diperiksa di
 * sini, bukan saat tombol masuk ditekan: konfigurasi yang kurang harus
 * menggagalkan aplikasi saat start, bukan menyisakan tombol yang tak bereaksi.
 */
const skema = envSchema.superRefine((nilai, ctx) => {
  if (nilai.VITE_AUTH_MODE !== 'cognito') return

  if (!nilai.VITE_COGNITO_DOMAIN) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['VITE_COGNITO_DOMAIN'],
      message: 'wajib diisi saat VITE_AUTH_MODE=cognito',
    })
  }
  if (!nilai.VITE_COGNITO_CLIENT_ID) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['VITE_COGNITO_CLIENT_ID'],
      message: 'wajib diisi saat VITE_AUTH_MODE=cognito',
    })
  }
})

const parsed = skema.safeParse(import.meta.env)
```

- [ ] **Step 3: Ekspor nilainya**

Modify `src/shared/config/env.ts` — pada objek `env` yang diekspor, tambahkan satu properti sebelum `} as const`:

```ts
  cognito: {
    domain: raw.VITE_COGNITO_DOMAIN,
    clientId: raw.VITE_COGNITO_CLIENT_ID,
    /** Kosong di sini; `cognitoStrategy` menggantinya dengan origin halaman. */
    redirectUri: raw.VITE_COGNITO_REDIRECT_URI,
  },
```

- [ ] **Step 4: Isi `.env.example`**

Modify `.env.example` — tambahkan di akhir berkas:

```
# Konfigurasi Cognito. Hanya dibaca saat VITE_AUTH_MODE=cognito, dan wajib
# terisi saat itu — aplikasi menolak start bila kosong.
#
# Ketiganya bukan rahasia: client id memang muncul di URL setiap kali pengguna
# diarahkan ke Hosted UI. Yang menjaga pertukaran kode adalah PKCE.
#
# User pool sama dengan hris-web dan Taskfy. Origin aplikasi ini harus sudah
# terdaftar sebagai callback URL dan sign-out URL di app client tersebut,
# kalau tidak Cognito menolak dengan redirect_mismatch.
VITE_COGNITO_DOMAIN=https://ap-southeast-19qsfqsnwn.auth.ap-southeast-1.amazoncognito.com
VITE_COGNITO_CLIENT_ID=3bujv9976rnq1smm31kff4h9s5

# Kosongkan untuk memakai origin halaman ini. Isi hanya bila alamat baliknya
# memang berbeda dari origin.
VITE_COGNITO_REDIRECT_URI=
```

- [ ] **Step 5: Periksa tipe dan lint**

```bash
cd /d/Erdigma/satudata-erdigma
npm run typecheck
npm run lint
```

Expected: keduanya selesai tanpa galat.

- [ ] **Step 6: Commit**

```bash
cd /d/Erdigma/satudata-erdigma
git add src/shared/config/env.ts .env.example
git commit -m "feat(auth): konfigurasi Cognito di env"
```

---

### Task 5: Seam `AuthStrategy` — `signOut()` dan `refresh?()`

Repositori: `satudata-erdigma`

**Files:**
- Modify: `src/features/auth/model/types.ts`
- Modify: `src/features/auth/model/dummyStrategy.ts`
- Modify: `src/features/auth/hooks/useSignOut.ts`

**Interfaces:**
- Produces:
  - `AuthStrategy.signOut(): void` — keluar atas kehendak pengguna.
  - `AuthStrategy.refresh?(): Promise<boolean>` — opsional; hanya mode Cognito yang punya.

Dua anggota, dua alasan berbeda. `signOut()` ada karena di mode Cognito keluar juga harus mematikan sesi Hosted UI, sedangkan `clearSession()` dipanggil interceptor dari dalam sebuah permintaan HTTP dan tidak boleh memancing redirect. `refresh?()` ada supaya `httpClient` bisa menyegarkan token tanpa tahu ia sedang bicara dengan Cognito.

- [ ] **Step 1: Tambah dua anggota ke antarmuka**

Modify `src/features/auth/model/types.ts` — di dalam `interface AuthStrategy`, setelah `clearSession(): void`, tambahkan:

```ts
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
```

- [ ] **Step 2: Mode dummy memakai `clearSession` untuk keduanya**

Modify `src/features/auth/model/dummyStrategy.ts` — ganti isi `createDummyStrategy()` sehingga `clearSession` menjadi fungsi bernama yang dipakai dua kali:

```ts
export function createDummyStrategy(): AuthStrategy {
  // Fungsi bernama, bukan metode objek: dipakai dua kali, dan di mode dummy
  // keluar memang tidak berbeda dari sesi yang dibersihkan paksa — tidak ada
  // sesi di sisi mana pun yang perlu ikut dimatikan.
  function clearSession(): void {
    sessionStorage.removeItem(STORAGE_KEY)
    notifySessionChanged()
  }

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

    clearSession,
    signOut: clearSession,
  }
}
```

- [ ] **Step 3: Tombol keluar memanggil `signOut()`**

Modify `src/features/auth/hooks/useSignOut.ts` — ganti baris

```ts
    authStrategy.clearSession()
```

menjadi

```ts
    authStrategy.signOut()
```

dan sesuaikan komentar blok di atas fungsi dengan menambahkan satu paragraf:

```ts
 * Di mode Cognito `signOut()` meninggalkan halaman menuju endpoint logout
 * Hosted UI, sehingga baris-baris setelah pemanggilan ini tidak dijalankan.
 * Pembersihan cache di bawah tetap ditulis karena mode dummy tidak ke mana-mana.
```

- [ ] **Step 4: Periksa tipe dan lint**

```bash
cd /d/Erdigma/satudata-erdigma
npm run typecheck
npm run lint
```

Expected: gagal pada `cognitoStrategy.ts` — objek yang dikembalikannya belum punya `signOut`. Itu yang dikerjakan Task 6; catat dan lanjutkan tanpa commit.

- [ ] **Step 5: Jangan commit dulu**

Task 5 dan Task 6 menyentuh satu antarmuka yang sama dan tidak bisa dikompilasi terpisah. Commit-nya digabung di akhir Task 6.

---

### Task 6: `cognitoStrategy.ts` — alur masuk sungguhan

Repositori: `satudata-erdigma`

**Files:**
- Modify (tulis ulang penuh): `src/features/auth/model/cognitoStrategy.ts`

**Interfaces:**
- Consumes: `env.cognito.*` (Task 4), `AuthStrategy` dengan `signOut`/`refresh?` (Task 5), `notifySessionChanged()` dari `./sessionSignal`.
- Produces, semuanya diekspor dari berkas ini:
  - `createCognitoStrategy(): AuthStrategy`
  - `completeSignIn(): Promise<void>` — menyelesaikan callback `?code=` bila ada.
  - `pernahMasuk(): boolean`
  - `lupakanPernahMasuk(): void`

`setAccessToken` dan `getAccessToken` yang sekarang diekspor **dihapus** — tidak ada satu pun berkas yang memanggilnya (`grep -rn "setAccessToken\|getAccessToken" src` hanya menemukan definisinya sendiri).

- [ ] **Step 1: Tulis ulang berkasnya**

Replace seluruh isi `src/features/auth/model/cognitoStrategy.ts` dengan:

```ts
import axios from 'axios'

import { env } from '@/shared/config/env'

import { notifySessionChanged } from './sessionSignal'
import type { AuthStrategy } from './types'

/**
 * Token akses disimpan di **memori modul**, bukan localStorage maupun
 * sessionStorage.
 *
 * Alasannya: apa pun yang ada di Web Storage bisa dibaca skrip mana pun yang
 * berhasil berjalan di halaman ini. Satu celah XSS — dari dependensi pihak
 * ketiga sekalipun — langsung berubah menjadi pencurian token.
 *
 * Konsekuensinya, sesi ikut hilang setiap kali tab dimuat ulang. Itu ditebus
 * oleh re-auth senyap: Cognito masih memegang cookie sesinya sendiri, jadi
 * kunjungan ulang ke /oauth2/authorize memantul balik tanpa pengguna melihat
 * formulir apa pun.
 */
let accessToken: string | null = null
let refreshToken: string | null = null
let expiresAt: number | null = null

/** Satu penyegaran yang sedang berjalan, dibagi ke semua pemanggil. */
let refreshInFlight: Promise<boolean> | null = null

/**
 * Kunci sessionStorage. Tidak satu pun berisi kredensial:
 *  - verifier dan state hidup hanya selama satu perjalanan ke Hosted UI,
 *  - tujuan sekadar alamat halaman,
 *  - penanda pernah-masuk sekadar boolean.
 */
const KUNCI_VERIFIER = 'satudata.pkce-verifier'
const KUNCI_STATE = 'satudata.oauth-state'
const KUNCI_TUJUAN = 'satudata.tujuan-setelah-masuk'
const KUNCI_PERNAH_MASUK = 'satudata.pernah-masuk'

/** Disamakan persis dengan hris-web supaya bentuk token yang terbit sama. */
const SCOPE = 'email openid phone aws.cognito.signin.user.admin'

interface BalasanToken {
  access_token: string
  refresh_token?: string
  expires_in: number
}

function alamatBalik(): string {
  return env.cognito.redirectUri || window.location.origin
}

/** Halaman yang harus dibuka setelah kembali dari Hosted UI. */
function tujuanSaatIni(): string {
  const sekarang = window.location.pathname + window.location.search
  // Mengembalikan orang ke /login setelah berhasil masuk hanya akan
  // memantulkannya lagi. Beranda jauh lebih masuk akal.
  return sekarang.startsWith('/login') ? '/' : sekarang
}

function base64url(bytes: Uint8Array): string {
  let biner = ''
  for (const b of bytes) biner += String.fromCharCode(b)
  return btoa(biner).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function acak(panjangByte: number): string {
  const bytes = new Uint8Array(panjangByte)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

async function challengeDari(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

/**
 * Memanggil endpoint token Cognito.
 *
 * Memakai axios telanjang, bukan `httpClient`: yang dituju bukan API Satu Data,
 * tidak boleh membawa header autentikasi, dan interceptor 401 di sana justru
 * akan memanggil balik kode di berkas ini.
 */
async function tukar(params: URLSearchParams): Promise<BalasanToken | null> {
  try {
    const balasan = await axios.post<BalasanToken>(
      `${env.cognito.domain}/oauth2/token`,
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    )
    return balasan.data
  } catch {
    // Sengaja tidak di-console.log: badan galat bisa memuat kode otorisasi.
    return null
  }
}

function simpan(data: BalasanToken): void {
  accessToken = data.access_token
  // Cognito merotasi refresh token. Yang lama harus ditimpa — menyimpan yang
  // basi adalah cara paling pasti membuat sesi mati mendadak di tengah kerja.
  if (data.refresh_token) refreshToken = data.refresh_token
  expiresAt = Date.now() + data.expires_in * 1000
  sessionStorage.setItem(KUNCI_PERNAH_MASUK, '1')
  notifySessionChanged()
}

function lupakanToken(): void {
  accessToken = null
  refreshToken = null
  expiresAt = null
  notifySessionChanged()
}

export function pernahMasuk(): boolean {
  return sessionStorage.getItem(KUNCI_PERNAH_MASUK) !== null
}

export function lupakanPernahMasuk(): void {
  sessionStorage.removeItem(KUNCI_PERNAH_MASUK)
}

/**
 * Berangkat ke Hosted UI.
 *
 * Async karena PKCE challenge dihitung dengan `crypto.subtle`, sedangkan
 * `signIn()` pada antarmuka bersifat sinkron. Selisihnya satu tick sebelum
 * peramban berpindah halaman, dan tidak ada yang menunggu hasilnya.
 */
async function berangkat(): Promise<void> {
  const verifier = acak(64)
  const state = acak(16)

  sessionStorage.setItem(KUNCI_VERIFIER, verifier)
  sessionStorage.setItem(KUNCI_STATE, state)
  sessionStorage.setItem(KUNCI_TUJUAN, tujuanSaatIni())

  const challenge = await challengeDari(verifier)

  // /oauth2/authorize, BUKAN /login yang dipakai hris-web. Bedanya menentukan:
  // /oauth2/authorize menghormati cookie sesi Cognito yang sudah ada dan
  // langsung memantulkan pengguna kembali, sedangkan /login selalu memaksa
  // formulir. Seluruh re-auth senyap bergantung pada perbedaan ini.
  const url = new URL(`${env.cognito.domain}/oauth2/authorize`)
  url.searchParams.set('client_id', env.cognito.clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('redirect_uri', alamatBalik())
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')

  window.location.assign(url.toString())
}

/**
 * Menyelesaikan kepulangan dari Hosted UI.
 *
 * Dipanggil sekali dari `bootstrapAuth()` sebelum React dirender. Tanpa `?code`
 * di alamat, tidak melakukan apa-apa.
 */
export async function completeSignIn(): Promise<void> {
  const alamat = new URL(window.location.href)
  const code = alamat.searchParams.get('code')
  if (!code) return

  const state = alamat.searchParams.get('state')
  const stateTersimpan = sessionStorage.getItem(KUNCI_STATE)
  const verifier = sessionStorage.getItem(KUNCI_VERIFIER)
  const tujuan = sessionStorage.getItem(KUNCI_TUJUAN) ?? '/'

  // Dibuang lebih dulu, apa pun hasilnya di bawah: satu verifier untuk satu
  // perjalanan, dan sisa yang tertinggal hanya akan membingungkan percobaan
  // berikutnya.
  sessionStorage.removeItem(KUNCI_STATE)
  sessionStorage.removeItem(KUNCI_VERIFIER)
  sessionStorage.removeItem(KUNCI_TUJUAN)

  // State yang tidak cocok berarti balasan ini bukan milik permintaan kita.
  // Jangan ditukar. hris-web tidak melakukan pemeriksaan ini.
  const sah = state !== null && stateTersimpan !== null && state === stateTersimpan

  if (sah && verifier) {
    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('client_id', env.cognito.clientId)
    params.append('code', code)
    params.append('redirect_uri', alamatBalik())
    params.append('code_verifier', verifier)

    const data = await tukar(params)
    if (data) simpan(data)
  }

  // Kode otorisasi dibuang dari alamat supaya tidak tertinggal di riwayat
  // peramban dan tidak ikut ter-bookmark. Sekalian mengembalikan pengguna ke
  // halaman yang tadi dituju — router baru dibuat setelah ini.
  window.history.replaceState(null, '', accessToken ? tujuan : '/login')
}

function segarkan(): Promise<boolean> {
  // Single-flight. Lima permintaan yang serentak kena 401 hanya boleh
  // menghasilkan satu panggilan /oauth2/token: dengan rotasi refresh token
  // aktif, penyegaran berbarengan memakai token yang sama akan saling
  // menggugurkan dan berakhir jadi logout mendadak.
  if (!refreshInFlight) {
    refreshInFlight = lakukanPenyegaran().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function lakukanPenyegaran(): Promise<boolean> {
  if (!refreshToken) return false

  const params = new URLSearchParams()
  params.append('grant_type', 'refresh_token')
  params.append('client_id', env.cognito.clientId)
  params.append('refresh_token', refreshToken)

  const data = await tukar(params)
  if (!data) return false

  simpan(data)
  return true
}

/**
 * Strategi untuk integrasi Cognito.
 *
 * Alur masuk memakai Authorization Code + PKCE ke Hosted UI milik HRIS — user
 * pool yang sama dengan hris-web dan Taskfy. hris-api tidak punya endpoint
 * login sama sekali; login memang terjadi sepenuhnya di sisi klien, dan API
 * hanya pernah melihat JWT yang sudah jadi.
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
      // Tidak menunggu: pemanggilan ini berakhir dengan berpindah halaman.
      void berangkat()
    },

    clearSession() {
      // Hanya membersihkan memori. Penanda pernah-masuk sengaja dibiarkan:
      // interceptor 401 yang memanggil ini, dan sekali percobaan senyap
      // berikutnya masih pantas dicoba.
      lupakanToken()
    },

    signOut() {
      lupakanToken()
      lupakanPernahMasuk()

      // Sesi Hosted UI ikut dimatikan. Tanpa langkah ini, re-auth senyap
      // langsung memasukkan orang itu kembali dan tombol keluar tampak rusak.
      const url = new URL(`${env.cognito.domain}/logout`)
      url.searchParams.set('client_id', env.cognito.clientId)
      url.searchParams.set('logout_uri', alamatBalik())
      window.location.assign(url.toString())
    },

    refresh: segarkan,
  }
}

/**
 * Kapan token akses kedaluwarsa, dalam epoch milidetik. Belum dipakai:
 * penyegaran saat ini dipicu oleh 401, bukan oleh jam. Disimpan karena
 * nilainya memang datang cuma-cuma bersama balasan token, dan penyegaran
 * proaktif akan membutuhkannya.
 */
export function kedaluwarsaPada(): number | null {
  return expiresAt
}
```

- [ ] **Step 2: Periksa tipe dan lint**

```bash
cd /d/Erdigma/satudata-erdigma
npm run typecheck
npm run lint
```

Expected: keduanya bersih. Bila lint mengeluh `kedaluwarsaPada` tidak terpakai, biarkan — ia diekspor, bukan variabel lokal.

- [ ] **Step 3: Commit (bersama Task 5)**

```bash
cd /d/Erdigma/satudata-erdigma
git add src/features/auth/model/types.ts src/features/auth/model/dummyStrategy.ts src/features/auth/model/cognitoStrategy.ts src/features/auth/hooks/useSignOut.ts
git commit -m "feat(auth): alur masuk Cognito dengan PKCE dan penyegaran token"
```

---

### Task 7: `httpClient` menyegarkan token saat 401

Repositori: `satudata-erdigma`

**Files:**
- Modify: `src/shared/api/httpClient.ts`

**Interfaces:**
- Consumes: `authStrategy.refresh?()` dan `authStrategy.clearSession()` dari Task 5 dan 6.

Sekarang setiap 401 langsung membuang sesi. Token akses Cognito berumur satu jam, jadi tanpa perubahan ini pengguna terlempar ke halaman masuk setiap jam sekali di tengah pekerjaan.

- [ ] **Step 1: Tandai permintaan yang sudah pernah diulang**

Modify `src/shared/api/httpClient.ts` — tepat di bawah blok impor, tambahkan:

```ts
declare module 'axios' {
  export interface AxiosRequestConfig {
    /**
     * Penanda bahwa permintaan ini sudah pernah diulang setelah penyegaran
     * token. Ditaruh di config, bukan di variabel modul: dua permintaan
     * berbeda tidak boleh saling menghabiskan jatah ulang satu sama lain.
     */
    _sudahDiulang?: boolean
  }
}
```

- [ ] **Step 2: Ganti penanganan `unauthorized`**

Modify `src/shared/api/httpClient.ts` — ganti seluruh interceptor respons yang sekarang berbunyi:

```ts
instance.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error)

    // Sesi tidak sah: bersihkan supaya permintaan berikutnya tidak mengulang
    // kredensial yang sudah jelas ditolak.
    if (apiError.kind === 'unauthorized') {
      authStrategy.clearSession()
    }

    // Galat sengaja tidak di-console.log: isinya bisa memuat header
    // autentikasi. Detail lengkap tetap terbawa di `apiError.detail` untuk
    // ditangani lapisan atas.
    return Promise.reject(apiError)
  },
)
```

menjadi:

```ts
instance.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const apiError = toApiError(error)

    if (apiError.kind === 'unauthorized') {
      const config = axios.isAxiosError(error) ? error.config : undefined

      // Token akses Cognito berumur satu jam. Tanpa percobaan penyegaran ini,
      // pengguna terlempar ke halaman masuk sejam sekali di tengah pekerjaan.
      // Mode dummy tidak punya `refresh`, jadi cabang ini tidak aktif di sana.
      if (authStrategy.refresh && config && !config._sudahDiulang) {
        config._sudahDiulang = true

        if (await authStrategy.refresh()) {
          // Header dipasang ulang oleh interceptor permintaan, yang membaca
          // token terbaru dari seam — bukan dari salinan yang sudah basi.
          return instance(config)
        }
      }

      // Sesi tidak sah dan tidak bisa diselamatkan: bersihkan supaya
      // permintaan berikutnya tidak mengulang kredensial yang jelas ditolak.
      authStrategy.clearSession()
    }

    // Galat sengaja tidak di-console.log: isinya bisa memuat header
    // autentikasi. Detail lengkap tetap terbawa di `apiError.detail` untuk
    // ditangani lapisan atas.
    return Promise.reject(apiError)
  },
)
```

- [ ] **Step 3: Periksa tipe dan lint**

```bash
cd /d/Erdigma/satudata-erdigma
npm run typecheck
npm run lint
```

Expected: keduanya bersih.

- [ ] **Step 4: Commit**

```bash
cd /d/Erdigma/satudata-erdigma
git add src/shared/api/httpClient.ts
git commit -m "feat(auth): segarkan token sekali saat 401 sebelum membuang sesi"
```

---

### Task 8: Bootstrap — callback dan re-auth senyap

Repositori: `satudata-erdigma`

**Files:**
- Modify: `src/features/auth/model/authStrategy.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `completeSignIn()`, `pernahMasuk()`, `lupakanPernahMasuk()` dari Task 6.
- Produces: `bootstrapAuth(): Promise<boolean>` — `true` berarti aplikasi boleh dirender, `false` berarti peramban sedang berpindah ke Hosted UI.

`bootstrapAuth` diletakkan di `authStrategy.ts` karena berkas itu memang satu-satunya tempat yang memilih mode. `main.tsx` tidak perlu tahu Cognito itu ada.

- [ ] **Step 1: Tambah `bootstrapAuth` ke pemilih mode**

Modify `src/features/auth/model/authStrategy.ts` — tambahkan impor dan fungsi di bawah `export const authStrategy` yang sudah ada:

```ts
import {
  completeSignIn,
  createCognitoStrategy,
  lupakanPernahMasuk,
  pernahMasuk,
} from './cognitoStrategy'
```

```ts
/**
 * Dijalankan sekali sebelum aplikasi dirender.
 *
 * Dua tugas, keduanya harus selesai sebelum router pertama kali membaca
 * alamat halaman:
 *
 *  1. Menyelesaikan kepulangan dari Hosted UI bila ada `?code=` di alamat.
 *  2. Memulihkan sesi yang hilang karena tab dimuat ulang. Token hanya hidup
 *     di memori, tapi Cognito masih memegang cookie sesinya sendiri — jadi
 *     satu kunjungan ke /oauth2/authorize memantul balik tanpa pengguna
 *     melihat formulir apa pun.
 *
 * @returns `true` bila aplikasi boleh dirender, `false` bila peramban sedang
 *          berpindah ke Hosted UI dan tidak ada gunanya merender apa pun.
 */
export async function bootstrapAuth(): Promise<boolean> {
  if (authStrategy.mode !== 'cognito') return true

  await completeSignIn()
  if (authStrategy.hasSession()) return true

  // Belum pernah masuk di tab ini: tampilkan halaman masuk, jangan menculik
  // orang yang baru pertama kali membuka portal ke halaman Cognito.
  if (!pernahMasuk()) return true

  // Penanda dihapus SEBELUM berangkat, bukan sesudah. Inilah penjaga loop:
  // satu percobaan otomatis per rantai muat halaman. Kalau Cognito memantulkan
  // balik tanpa sesi, pengguna mendarat di /login dan menekan tombol sendiri.
  lupakanPernahMasuk()
  authStrategy.signIn()
  return false
}
```

- [ ] **Step 2: `main.tsx` menunggu bootstrap**

Replace seluruh isi `src/main.tsx` dengan:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { AppErrorBoundary } from '@/app/providers/AppErrorBoundary'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { router } from '@/app/router/router'
import { bootstrapAuth } from '@/features/auth/model/authStrategy'

import '@/styles/index.css'

const wadah = document.getElementById('root')
if (!wadah) throw new Error('Elemen #root tidak ditemukan di index.html')

// Autentikasi diselesaikan lebih dulu, karena keduanya mengubah alamat halaman
// sebelum router membacanya: kepulangan dari Hosted UI membuang `?code=` dan
// mengembalikan tujuan semula, sedangkan re-auth senyap justru meninggalkan
// halaman ini sama sekali. Merender lebih dulu berarti pengguna sempat melihat
// halaman masuk berkedip untuk sesi yang sebenarnya masih hidup.
if (await bootstrapAuth()) {
  createRoot(wadah).render(
    <StrictMode>
      <AppErrorBoundary>
        <QueryProvider>
          <RouterProvider router={router} />
        </QueryProvider>
      </AppErrorBoundary>
    </StrictMode>,
  )
}
```

`await` di tingkat modul sah di sini: berkas ini adalah modul ES (`"type": "module"`) dan Vite menargetkan peramban yang mendukung top-level await.

- [ ] **Step 3: Periksa tipe dan lint**

```bash
cd /d/Erdigma/satudata-erdigma
npm run typecheck
npm run lint
```

Expected: keduanya bersih. Bila `tsc` mengeluh soal top-level await, tambahkan `"target": "ES2022"` dan `"module": "ESNext"` pada `compilerOptions` di `tsconfig.app.json` — periksa dulu isinya, kemungkinan besar sudah demikian.

- [ ] **Step 4: Pastikan mode dummy tidak berubah perilakunya**

```bash
cd /d/Erdigma/satudata-erdigma
npm run dev
```

Buka `http://localhost:5174` dengan `VITE_AUTH_MODE=dummy` (bawaan `.env.local`). Expected: halaman masuk muncul seperti sebelumnya, memilih identitas tetap bekerja, tombol keluar tetap mengembalikan ke halaman masuk. Tidak boleh ada redirect ke Cognito. Hentikan server setelah selesai.

- [ ] **Step 5: Commit**

```bash
cd /d/Erdigma/satudata-erdigma
git add src/features/auth/model/authStrategy.ts src/main.tsx
git commit -m "feat(auth): selesaikan callback Cognito dan pulihkan sesi senyap saat boot"
```

---

### Task 9: Verifikasi ujung-ke-ujung

**Files:** tidak ada berkas berubah kecuali `.env.local` yang tidak masuk git.

Alur Cognito tidak punya test otomatis di rencana ini — front-end belum punya kerangka uji, dan yang diuji di sini justru perilaku peramban dan Hosted UI yang sungguhan. Verifikasinya manual, dan harus dijalankan.

**Prasyarat yang tidak bisa dilewati:** app client `3bujv9976rnq1smm31kff4h9s5` sudah memuat `http://localhost:5174` pada daftar **callback URL** dan **sign-out URL** di AWS Console. Tanpa itu, langkah pertama berhenti di layar galat Cognito bertuliskan `redirect_mismatch`, dan tidak ada kode yang bisa menutupinya.

- [ ] **Step 1: Jalankan back-end pada profil non-dummy**

```bash
cd /d/Erdigma/satudata-erdigma-api
docker compose up -d db
SPRING_PROFILES_ACTIVE=dev ./mvnw.cmd spring-boot:run
```

Expected: aplikasi start tanpa `NoSuchBeanDefinitionException`. Sebelum rencana ini, perintah yang sama gagal.

- [ ] **Step 2: Nyalakan mode Cognito di web**

Buat atau sunting `d:\Erdigma\satudata-erdigma\.env.local`:

```
VITE_API_BASE_URL=
VITE_DEV_PROXY_TARGET=http://localhost:8082
VITE_AUTH_MODE=cognito
VITE_COGNITO_DOMAIN=https://ap-southeast-19qsfqsnwn.auth.ap-southeast-1.amazoncognito.com
VITE_COGNITO_CLIENT_ID=3bujv9976rnq1smm31kff4h9s5
VITE_COGNITO_REDIRECT_URI=
```

```bash
cd /d/Erdigma/satudata-erdigma
npm run dev
```

- [ ] **Step 3: Masuk**

Buka `http://localhost:5174`, tekan **Masuk dengan akun Erdigma**.

Expected, berurutan:
1. Peramban berpindah ke Hosted UI Cognito; alamatnya memuat `code_challenge` dan `code_challenge_method=S256`.
2. Setelah kredensial HRIS dimasukkan, peramban kembali ke `http://localhost:5174`.
3. Alamat menjadi bersih — tidak ada `?code=` maupun `?state=` yang tersisa.
4. Beranda tampil dengan nama dan inisial yang benar di header.

Bila berhenti di layar penolakan "Akun tidak dapat digunakan", baca log back-end: `hris-api menjawab 401/403` berarti hris-api menolak token itu, bukan Satu Data.

- [ ] **Step 4: Periksa baris `users` benar-benar terisi otomatis**

```bash
docker exec -it erdigma-postgres psql -U postgres -d satudata -c "select cognito_id, name, email, position, job_level, hris_permission_level, role, division_id from users where cognito_id not like 'dummy-%';"
```

Expected: satu baris berisi identitas Anda dari HRIS, dengan `role` sesuai jenjang jabatan. `division_id` kosong — itu memang diharapkan, `division.hris_departement_id` belum diisi.

- [ ] **Step 5: Re-auth senyap**

Muat ulang tab (F5).

Expected: halaman kembali tampil tanpa pengguna melihat formulir masuk. Pada tab Network akan terlihat satu perjalanan ke `/oauth2/authorize` yang langsung memantul kembali. Halaman masuk **tidak boleh** berkedip.

- [ ] **Step 6: Deep link**

Buka `http://localhost:5174/datasets` langsung di tab yang sesinya masih hidup.

Expected: setelah pantulan senyap, yang tampil adalah halaman Datasets — bukan beranda.

- [ ] **Step 7: Keluar**

Tekan tombol keluar di header.

Expected: peramban berpindah ke endpoint logout Cognito lalu kembali ke `http://localhost:5174`, dan yang tampil adalah halaman masuk. Menekan **Masuk** setelah itu harus menampilkan formulir Cognito lagi — kalau langsung masuk tanpa ditanya, sesi Hosted UI belum benar-benar mati.

- [ ] **Step 8: Penyegaran token**

Biarkan tab terbuka lebih dari satu jam, lalu klik salah satu menu.

Expected: halaman tetap bekerja. Pada tab Network terlihat satu permintaan 401, satu panggilan `/oauth2/token` dengan `grant_type=refresh_token`, lalu permintaan semula diulang dan berhasil. Tidak ada lemparan ke halaman masuk.

Bila menunggu satu jam tidak praktis, ganti sementara nilai `accessToken` di `cognitoStrategy` lewat breakpoint DevTools menjadi teks sembarang, lalu picu satu permintaan. Jalurnya sama.

- [ ] **Step 9: Kembalikan mode dummy**

Sunting `.env.local` kembali ke `VITE_AUTH_MODE=dummy` supaya pengembangan sehari-hari tidak memerlukan jaringan.

- [ ] **Step 10: Commit dokumen rencana yang sudah dicentang**

```bash
cd /d/Erdigma/satudata-erdigma
git add docs/superpowers/
git commit -m "docs: spec dan rencana login Cognito"
```

---

## Sesudah rencana ini

Tiga hal sengaja ditinggalkan, dan semuanya akan terasa saat pemakaian nyata:

1. **`division.hris_departement_id` masih kosong.** Semua pengguna hasil provisioning berdivisi null sampai kedelapan divisi dipetakan ke departemen HRIS yang sungguhan.
2. **Sesi Hosted UI menentukan segalanya.** Bila Cognito memperpendek umur cookie sesinya, re-auth senyap berubah menjadi formulir masuk yang muncul setiap kali tab dimuat ulang.
3. **Penyegaran masih reaktif.** Token disegarkan setelah 401, bukan sebelum kedaluwarsa. `kedaluwarsaPada()` sudah menyimpan bahannya bila kelak ingin proaktif.
