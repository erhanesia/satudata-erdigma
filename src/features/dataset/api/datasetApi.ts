import { apiDownload, apiGet, apiPost } from '@/shared/api/httpClient'
import type {
  Dataset,
  DatasetSummary,
  Datastore,
  Format,
  PageOfDatasets,
  Topic,
} from '@/shared/types/api'

/**
 * Lapisan HTTP modul dataset.
 *
 * Hanya berkas-berkas di dalam folder `api/` yang boleh tahu bentuk URL.
 * Komponen memanggil hook, hook memanggil fungsi di sini. Kalau back-end
 * memindahkan endpoint, satu berkas yang berubah.
 */

const BASE = '/api/v1/datasets'

/** Parameter pencarian, cerminan `DatasetRequestGetDTO` di back-end. */
export interface DatasetQuery {
  search?: string
  topics?: string[]
  formats?: string[]
  divisions?: string[]
  sort?: 'relevance' | 'downloads' | 'updated'
  /** Berbasis 0, mengikuti Spring Data. */
  page?: number
  size?: number
}

export function fetchDatasets(query: DatasetQuery, signal?: AbortSignal): Promise<PageOfDatasets> {
  return apiGet<PageOfDatasets>(BASE, {
    params: query,
    // Spring mengharapkan parameter berulang (topics=A&topics=B), bukan
    // bentuk indeks (topics[0]=A) yang jadi bawaan axios untuk array.
    paramsSerializer: { indexes: null },
    signal,
  })
}

export function fetchDataset(slug: string, signal?: AbortSignal): Promise<Dataset> {
  return apiGet<Dataset>(`${BASE}/${encodeURIComponent(slug)}`, { signal })
}

export function fetchDatastore(
  slug: string,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<Datastore> {
  return apiGet<Datastore>(`${BASE}/${encodeURIComponent(slug)}/datastore`, {
    params: { page, size },
    signal,
  })
}

export function fetchSummary(
  slug: string,
  groupBy?: string,
  metric?: string,
  signal?: AbortSignal,
): Promise<DatasetSummary> {
  return apiGet<DatasetSummary>(`${BASE}/${encodeURIComponent(slug)}/summary`, {
    params: { groupBy, metric },
    signal,
  })
}

/**
 * Mengambil berkas dataset sebagai blob.
 *
 * Bukan tautan langsung: unduhan tercatat di audit log server, dan permintaannya
 * perlu membawa header autentikasi — dua hal yang tidak bisa dilakukan tag
 * `<a href>` biasa.
 *
 * `agreement` adalah centang persetujuan pada modal. Server menolak unduhan
 * tanpa nilai itu dan mencatatnya di audit log, jadi ia bukan sekadar hiasan
 * antarmuka — jangan pernah dikirim `true` secara otomatis.
 */
export function downloadDataset(slug: string, agreement: boolean) {
  return apiDownload(`${BASE}/${encodeURIComponent(slug)}/download`, {
    params: { agreement },
    // Berkas bisa berukuran puluhan megabita di jaringan kantor yang lambat;
    // batas 20 detik milik klien standar terlalu pendek.
    timeout: 120_000,
  })
}

export function fetchTopics(signal?: AbortSignal): Promise<Topic[]> {
  return apiGet<Topic[]>('/api/v1/topics', { signal })
}

export function fetchFormats(signal?: AbortSignal): Promise<Format[]> {
  return apiGet<Format[]>('/api/v1/formats', { signal })
}

/** Metadata yang diketik penerbit. Sisanya dihitung server dari berkasnya. */
export interface DatasetUploadBody {
  title: string
  slug?: string
  notes?: string
  disclaimer?: string
  coverage?: string
  topics?: string[]
  collectionSlug?: string
}

/**
 * Menerbitkan dataset baru.
 *
 * Dikirim sebagai multipart dua bagian, `file` dan `body`. Bagian `body`
 * dibungkus `Blob` ber-`type: application/json` — tanpa itu browser
 * mengirimnya sebagai `text/plain` dan `@RequestPart` di Spring menolaknya
 * dengan galat tipe konten yang tidak menyebut penyebab sesungguhnya.
 *
 * `Content-Type` sengaja TIDAK diisi sendiri: axios harus menyusunnya bersama
 * boundary multipart, dan menuliskannya manual justru membuat boundary hilang.
 */
export function uploadDataset(file: File, body: DatasetUploadBody): Promise<Dataset> {
  const form = new FormData()
  form.append('file', file)
  form.append('body', new Blob([JSON.stringify(body)], { type: 'application/json' }))
  return apiPost<Dataset>(BASE, form)
}
