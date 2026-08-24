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

  /**
   * Domain Hosted UI Cognito, tanpa garis miring di akhir. Sama dengan yang
   * dipakai hris-web dan Taskfy — satu user pool untuk seluruh perusahaan.
   */
  VITE_COGNITO_DOMAIN: z
    .string()
    .trim()
    .min(1, 'wajib diisi')
    .refine((v) => /^https:\/\//.test(v), { message: 'harus diawali https://' })
    .transform((v) => v.replace(/\/+$/, '')),

  /**
   * Client id app client Cognito. Bukan rahasia: nilainya memang muncul di URL
   * setiap kali pengguna diarahkan ke Hosted UI. Yang menjaga pertukaran kode
   * adalah PKCE, bukan kerahasiaan nilai ini.
   */
  VITE_COGNITO_CLIENT_ID: z.string().trim().min(1, 'wajib diisi'),

  /**
   * Alamat balik setelah masuk. Kosong berarti origin halaman ini, yang benar
   * untuk semua lingkungan selama origin-nya terdaftar di app client.
   */
  VITE_COGNITO_REDIRECT_URI: z
    .string()
    .trim()
    .default('')
    .transform((v) => v.replace(/\/+$/, '')),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  const rincian = parsed.error.issues
    .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n')
  throw new Error(`Konfigurasi lingkungan tidak sah:\n${rincian}\n\nPeriksa berkas .env Anda.`)
}

const raw = parsed.data

export const env = {
  apiBaseUrl: raw.VITE_API_BASE_URL,
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  cognito: {
    domain: raw.VITE_COGNITO_DOMAIN,
    clientId: raw.VITE_COGNITO_CLIENT_ID,
    /** Kosong di sini; `cognitoStrategy` menggantinya dengan origin halaman. */
    redirectUri: raw.VITE_COGNITO_REDIRECT_URI,
  },
} as const

export type Env = typeof env
