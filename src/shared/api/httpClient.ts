import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'

import { authStrategy } from '@/features/auth/model/authStrategy'
import { env } from '@/shared/config/env'

import { toApiError } from './errors'

/** Ambang waktu tunggu. Permintaan yang menggantung tidak boleh membekukan UI. */
const TIMEOUT_MS = 20_000

/**
 * Klien HTTP tunggal untuk seluruh aplikasi.
 *
 * Satu-satunya berkas yang tahu soal axios. Lapisan `api/` tiap fitur memanggil
 * `apiGet`/`apiPost`/`apiDelete` di bawah, sehingga mengganti pustaka HTTP
 * kelak cukup menyentuh berkas ini.
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
  for (const [name, value] of Object.entries(headers)) {
    config.headers.set(name, value)
  }
  return config
})

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

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await instance.patch<T>(url, body, config)
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
  const response = await instance.get<Blob>(url, {
    ...config,
    responseType: 'blob',
    /*
     * `Accept` HARUS ditimpa di sini.
     *
     * Instance-nya menyetel `application/json` untuk seluruh permintaan — masuk
     * akal untuk endpoint biasa, tapi mematikan setiap endpoint yang menyatakan
     * `produces` selain JSON: Spring menjawab **406 Not Acceptable** sebelum
     * kode controller-nya dijalankan sama sekali. Itu yang terjadi pada ekspor
     * CSV log unduhan.
     *
     * Endpoint unduhan berkas selamat hanya karena kebetulan tidak menyatakan
     * `produces`. Menimpanya di helper ini menutup jebakan itu untuk semua
     * endpoint berkas, sekarang dan nanti.
     */
    headers: { ...config?.headers, Accept: '*/*' },
  })
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

  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1] ?? null
}
