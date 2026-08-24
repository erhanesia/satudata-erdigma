import { z } from 'zod'

/**
 * Konfigurasi lingkungan, divalidasi saat modul dimuat.
 *
 * Kenapa divalidasi: `import.meta.env` bertipe `string | undefined`. Tanpa
 * pemeriksaan, salah ketik nama variabel baru ketahuan saat pengguna membuka
 * halaman dan melihat permintaan ke `undefined/api/v1/datasets`. Dengan validasi
 * ini, aplikasi gagal saat start dengan pesan yang menyebut variabel mana yang
 * salah.
 *
 * Ingat: semua nilai VITE_* ikut ter-bundle dan bisa dibaca siapa pun lewat
 * DevTools. Tidak boleh ada rahasia di sini.
 */
const envSchema = z.object({
  /**
   * Basis URL API. Kosong berarti permintaan dikirim relatif ke origin yang
   * sama — inilah yang dipakai saat development (proxy Vite) maupun produksi
   * di belakang reverse proxy.
   */
  VITE_API_BASE_URL: z
    .string()
    .trim()
    .default('')
    .refine((v) => v === '' || /^https?:\/\//.test(v), {
      message: 'harus kosong atau diawali http:// maupun https://',
    })
    // Garis miring di akhir membuat URL jadi ganda ("//api/v1"). Rapikan di sini.
    .transform((v) => v.replace(/\/+$/, '')),

  /** Mode autentikasi. Lihat features/auth. */
  VITE_AUTH_MODE: z.enum(['dummy', 'cognito']).default('dummy'),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n')
  throw new Error(`Konfigurasi lingkungan tidak sah:\n${details}\n\nPeriksa berkas .env Anda.`)
}

const raw = parsed.data

/**
 * Auth dummy hanya boleh hidup di development. Kalau seseorang men-deploy build
 * produksi dengan VITE_AUTH_MODE=dummy, siapa pun bisa menyamar jadi pengguna
 * mana pun cukup dengan mengubah satu header. Gagalkan build-nya.
 *
 * Ini cerminan DummyAuthProfileGuard di back-end, yang menolak start bila profil
 * 'auth-dummy' menyala bersama 'prod'.
 */
if (import.meta.env.PROD && raw.VITE_AUTH_MODE === 'dummy') {
  throw new Error(
    'VITE_AUTH_MODE=dummy terdeteksi pada build produksi. ' +
      'Mode dummy mengizinkan penyamaran identitas dan hanya boleh dipakai di lokal. ' +
      'Setel VITE_AUTH_MODE=cognito sebelum membangun untuk produksi.',
  )
}

export const env = {
  apiBaseUrl: raw.VITE_API_BASE_URL,
  authMode: raw.VITE_AUTH_MODE,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const

export type Env = typeof env
