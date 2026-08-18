import axios from 'axios'

/** Golongan galat yang membedakan cara UI menanggapinya. */
export type ApiErrorKind =
  | 'network' // permintaan tidak sampai ke server
  | 'timeout'
  | 'unauthorized' // 401 — sesi tidak sah
  | 'forbidden' // 403 — masuk akal tapi tidak berhak (mis. karyawan resign)
  | 'notFound' // 404
  | 'validation' // 400 / 422
  | 'server' // 5xx
  | 'unknown'

/**
 * Galat API yang sudah dinormalkan.
 *
 * Kenapa dinormalkan: komponen tidak boleh tahu bentuk galat axios. Kalau suatu
 * saat axios diganti fetch, hanya berkas ini yang berubah.
 *
 * Kenapa pesannya diseleksi: badan galat dari server bisa memuat jejak tumpukan
 * atau nama tabel. Yang ditampilkan ke pengguna adalah kalimat aman; detail
 * mentahnya disimpan di `detail` untuk keperluan penelusuran, dan tidak pernah
 * dirender.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind
  readonly status: number | undefined
  readonly detail: unknown

  constructor(kind: ApiErrorKind, message: string, status?: number, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.detail = detail
  }
}

const PESAN: Record<ApiErrorKind, string> = {
  network: 'Tidak dapat terhubung ke server. Periksa koneksi Anda lalu coba lagi.',
  timeout: 'Permintaan terlalu lama. Coba lagi sebentar lagi.',
  unauthorized: 'Sesi Anda tidak sah atau sudah berakhir. Silakan masuk kembali.',
  forbidden: 'Anda tidak memiliki akses ke data ini.',
  notFound: 'Data yang Anda cari tidak ditemukan.',
  validation: 'Permintaan tidak dapat diproses. Periksa kembali isian Anda.',
  server: 'Terjadi gangguan pada server. Tim kami sedang menanganinya.',
  unknown: 'Terjadi kesalahan yang tidak diketahui.',
}

/** Mengubah galat apa pun menjadi ApiError yang aman ditampilkan. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return new ApiError('timeout', PESAN.timeout, undefined, error.message)
    }
    if (!error.response) {
      return new ApiError('network', PESAN.network, undefined, error.message)
    }

    const status = error.response.status
    const kind = kindFromStatus(status)

    // Pesan dari GlobalExceptionHandler back-end dipakai hanya untuk galat yang
    // memang ditujukan ke pengguna (4xx). Galat 5xx tidak pernah diteruskan apa
    // adanya — isinya bisa membocorkan struktur internal.
    const pesanServer = kind !== 'server' ? ambilPesanServer(error.response.data) : null

    return new ApiError(kind, pesanServer ?? PESAN[kind], status, error.response.data)
  }

  if (error instanceof Error) {
    return new ApiError('unknown', PESAN.unknown, undefined, error.message)
  }
  return new ApiError('unknown', PESAN.unknown, undefined, error)
}

function kindFromStatus(status: number): ApiErrorKind {
  if (status === 401) return 'unauthorized'
  if (status === 403) return 'forbidden'
  if (status === 404) return 'notFound'
  if (status === 400 || status === 422) return 'validation'
  if (status >= 500) return 'server'
  return 'unknown'
}

/**
 * Mengambil pesan dari badan galat, hanya bila berupa teks pendek yang wajar.
 *
 * `error` diperiksa lebih dulu karena itulah kunci yang dipakai
 * `GlobalExceptionHandler` di back-end — seluruh empat penanganannya
 * mengembalikan `Map.of("error", ...)`. `message` tetap diterima sebagai
 * cadangan: itu bentuk bawaan galat Spring yang tidak lewat handler tersebut,
 * misalnya isian yang gagal divalidasi.
 */
const KUNCI_PESAN = ['error', 'message'] as const

function ambilPesanServer(data: unknown): string | null {
  if (typeof data === 'string' && data.length > 0 && data.length <= 300) return data
  if (data && typeof data === 'object') {
    for (const kunci of KUNCI_PESAN) {
      const kandidat = (data as Record<string, unknown>)[kunci]
      if (typeof kandidat === 'string' && kandidat.length > 0 && kandidat.length <= 300) {
        return kandidat
      }
    }
  }
  return null
}
