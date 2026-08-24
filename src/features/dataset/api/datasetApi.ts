import { apiDelete, apiDownload, apiGet, apiPatch, apiPost } from '@/shared/api/httpClient'
import type {
  Dataset,
  DocumentText,
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
  /** Tag posisi. Disaring di database, bukan di layar — lihat catatan di panel admin. */
  positions?: string[]
  sort?: 'relevance' | 'downloads' | 'updated' | 'created'
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

/**
 * @param recordView `false` untuk membaca tanpa menaikkan penghitung kunjungan.
 *   Dipakai panel admin: menengok dataset lewat panel pengelolaan bukan
 *   kunjungan portal, dan kalau ikut dihitung, angka "Total kunjungan" naik
 *   setiap kali admin membuka dasbornya sendiri.
 */
export function fetchDataset(
  slug: string,
  recordView = true,
  signal?: AbortSignal,
): Promise<Dataset> {
  return apiGet<Dataset>(`${BASE}/${encodeURIComponent(slug)}`, {
    params: recordView ? undefined : { recordView: false },
    signal,
  })
}

/**
 * Isi tabel satu berkas.
 *
 * `resourceId` menentukan berkas yang mana. Satu dataset bisa memuat CSV dan
 * Excel sekaligus, dan masing-masing punya tabelnya sendiri; tanpa parameter
 * ini server menjawab dengan berkas utamanya.
 */
export function fetchDatastore(
  slug: string,
  resourceId: string | undefined,
  page: number,
  size: number,
  signal?: AbortSignal,
): Promise<Datastore> {
  return apiGet<Datastore>(`${BASE}/${encodeURIComponent(slug)}/datastore`, {
    params: resourceId ? { page, size, resourceId } : { page, size },
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
export function downloadDataset(slug: string, agreement: boolean, resourceId?: string) {
  return apiDownload(`${BASE}/${encodeURIComponent(slug)}/download`, {
    // `resourceId` dikosongkan berarti berkas pertama. Satu permintaan
    // mengambil satu berkas — beberapa berkas dipanggil berurutan, supaya
    // masing-masing punya barisnya sendiri di log unduhan.
    params: { agreement, ...(resourceId ? { resourceId } : {}) },
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
  topics?: string[]
  collectionSlug?: string
  /**
   * Posisi jabatan yang boleh melihat. Dikosongkan berarti terbuka untuk
   * seluruh karyawan; diisi berarti dibatasi — dan pembatasannya berlaku.
   */
  positions?: string[]
  /**
   * Keterangan tiap berkas, DIPASANGKAN MENURUT URUTAN dengan berkas yang
   * dikirim. Jumlahnya harus sama; back-end menolak kalau tidak.
   */
  files?: { label?: string; format?: string }[]
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
export function uploadDataset(files: File[], body: DatasetUploadBody): Promise<Dataset> {
  const form = new FormData()
  // Bagian `files` diulang, bukan dikirim sebagai satu larik. Urutan
  // penambahannya SAMA dengan urutan `body.files`, dan back-end memasangkan
  // keduanya berdasarkan urutan itu.
  files.forEach((file) => form.append('files', file))
  form.append('body', new Blob([JSON.stringify(body)], { type: 'application/json' }))
  return apiPost<Dataset>(BASE, form)
}

/**
 * Mengganti SELURUH tag posisi sebuah dataset — bukan menambah.
 *
 * Mengirim daftar utuh, bukan selisihnya, supaya dua admin yang menyunting
 * bersamaan tidak menghasilkan gabungan yang tidak dikehendaki siapa pun.
 */
export function updateDatasetPositions(slug: string, positions: string[]): Promise<string[]> {
  return apiPatch<string[]>(`${BASE}/${encodeURIComponent(slug)}/positions`, { positions })
}

/** Soft delete. Slug-nya tidak dilepas dan tidak bisa dipakai ulang. */
export function deleteDataset(slug: string): Promise<void> {
  return apiDelete<void>(`${BASE}/${encodeURIComponent(slug)}`)
}

/** Isi dokumen Word sebagai teks. Lihat catatan batasnya di PreviewService. */
export function fetchDocumentText(
  slug: string,
  resourceId: string,
  signal?: AbortSignal,
): Promise<DocumentText> {
  return apiGet<DocumentText>(`${BASE}/${encodeURIComponent(slug)}/preview/text`, {
    params: { resourceId },
    signal,
  })
}

/**
 * Mengambil PDF untuk digambar peramban di dalam halaman.
 *
 * Lewat XHR, bukan `<iframe src="/api/...">` langsung: navigasi iframe tidak
 * membawa header autentikasi, jadi server akan menjawab 401. Hasilnya dibungkus
 * jadi blob URL — dan pemanggil WAJIB mencabutnya, karena setiap blob menahan
 * seluruh isi berkas di memori sampai dicabut.
 */
export function fetchPdfPreview(slug: string, resourceId: string): Promise<Blob> {
  return apiDownload(`${BASE}/${encodeURIComponent(slug)}/preview`, {
    params: { resourceId },
    timeout: 120_000,
  }).then((result) => result.blob)
}
