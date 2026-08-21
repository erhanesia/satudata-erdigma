import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'

import { authStrategy } from '@/features/auth/model/authStrategy'
import { env } from '@/shared/config/env'

import { toApiError } from './errors'

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

/** Ambang waktu tunggu. Permintaan yang menggantung tidak boleh membekukan UI. */
const TIMEOUT_MS = 20_000

/**
 * Klien HTTP tunggal untuk API Satu Data. Lapisan `api/` tiap fitur memanggil
 * `apiGet`/`apiPost`/`apiDelete` di bawah, sehingga mengganti pustaka HTTP
 * kelak cukup menyentuh berkas ini.
 *
 * Satu pengecualian yang disengaja: `cognitoStrategy.ts` memanggil `axios`
 * langsung ke endpoint token Cognito. Endpoint itu tidak boleh lewat klien
 * ini karena dua interceptor di bawah akan ikut bermain — permintaan
 * meminta token baru justru disisipi header autentikasi lama, dan 401 dari
 * situ akan memicu penyegaran yang memanggil balik endpoint yang sama.
 */
const instance: AxiosInstance = axios.create({
  // Kosong saat development: permintaan menjadi relatif ke origin yang sama dan
  // diteruskan proxy Vite ke Spring Boot. Browser tidak pernah melakukan
  // permintaan lintas-origin, jadi CORS maupun preflight tidak ikut bermain.
  baseURL: env.apiBaseUrl,
  timeout: TIMEOUT_MS,
  headers: { Accept: 'application/json' },
  // Cookie lintas-origin tidak dikirim. Autentikasi memakai header Bearer, dan
  // mengaktifkan ini tanpa alasan membuka celah CSRF.
  withCredentials: false,
})

/** Menyisipkan header autentikasi dari seam — bukan dari token yang di-hardcode. */
instance.interceptors.request.use((config) => {
  const headers = authStrategy.getAuthHeaders()
  for (const [nama, nilai] of Object.entries(headers)) {
    config.headers.set(nama, nilai)
  }
  return config
})

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

export async function apiGet<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await instance.get<T>(url, config)
  return response.data
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await instance.post<T>(url, body, config)
  return response.data
}

export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await instance.delete<T>(url, config)
  return response.data
}

/**
 * Mengunduh berkas biner beserta nama berkas dari header Content-Disposition.
 *
 * Kenapa tidak `<a href>` biasa: navigasi peramban tidak membawa header
 * autentikasi, sehingga server akan menolaknya dengan 401. Selain itu, menaruh
 * kredensial di query string agar bisa dipakai tag anchor berarti token ikut
 * tercatat di log akses server dan riwayat peramban.
 */
export async function apiDownload(
  url: string,
  config?: AxiosRequestConfig,
): Promise<{ blob: Blob; fileName: string | null }> {
  const response = await instance.get<Blob>(url, { ...config, responseType: 'blob' })
  return {
    blob: response.data,
    fileName: parseContentDispositionFileName(response.headers['content-disposition']),
  }
}

function parseContentDispositionFileName(header: unknown): string | null {
  if (typeof header !== 'string') return null

  // RFC 5987 (filename*=UTF-8''...) diutamakan karena mendukung karakter non-ASCII.
  const rfc5987 = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (rfc5987?.[1]) {
    try {
      return decodeURIComponent(rfc5987[1])
    } catch {
      // Persentase yang cacat: jatuh ke bentuk biasa di bawah.
    }
  }

  const biasa = /filename="?([^";]+)"?/i.exec(header)
  return biasa?.[1] ?? null
}
