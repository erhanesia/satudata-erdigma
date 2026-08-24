import type { DatasetQuery } from '@/features/dataset/api/datasetApi'

/**
 * Kunci cache react-query, terkumpul di satu tempat.
 *
 * Kenapa tidak ditulis inline di tiap hook: pembatalan cache silang antar-fitur
 * jadi mustahil ditelusuri kalau kuncinya tersebar. Mengunduh berkas, misalnya,
 * menaikkan penghitung unduhan sehingga detail dataset dan kartu statistik
 * beranda sama-sama basi. Dengan kunci terpusat, kaitan seperti itu terlihat.
 */
export const queryKeys = {
  me: ['me'] as const,

  dataset: {
    all: ['dataset'] as const,
    list: (params: DatasetQuery) => ['dataset', 'list', params] as const,
    /**
     * `recordView` ikut jadi bagian kunci. Kalau tidak, hasil bacaan panel
     * admin yang sengaja tidak menghitung kunjungan akan dipakai ulang oleh
     * halaman detail portal — dan kunjungan yang seharusnya tercatat menguap
     * tanpa jejak.
     */
    detail: (slug: string, recordView = true) =>
      ['dataset', 'detail', slug, recordView] as const,
    datastore: (slug: string, resourceId: string | undefined, page: number, size: number) =>
      ['dataset', 'datastore', slug, resourceId ?? 'utama', page, size] as const,
    summary: (slug: string, groupBy?: string, metric?: string) =>
      ['dataset', 'summary', slug, groupBy ?? null, metric ?? null] as const,
  },

  taxonomy: {
    topics: ['taxonomy', 'topic'] as const,
    formats: ['taxonomy', 'format'] as const,
    positions: ['taxonomy', 'position'] as const,
  },

  division: {
    list: ['division', 'list'] as const,
  },

  collection: {
    all: ['collection'] as const,
    list: ['collection', 'list'] as const,
    detail: (slug: string) => ['collection', 'detail', slug] as const,
  },

  stats: ['stats'] as const,
  statsDailyDownloads: (days: number) => ['stats', 'downloads', 'daily', days] as const,
  status: ['status'] as const,

  /**
   * Log panel admin. Keduanya ikut dibatalkan setelah unggahan berhasil:
   * menerbitkan dataset menulis baris audit baru, dan daftar yang tidak
   * dibatalkan akan menampilkan riwayat yang ketinggalan satu kejadian.
   */
  log: {
    all: ['log'] as const,
    audit: (page: number, size: number, slug?: string) =>
      ['log', 'audit', page, size, slug ?? null] as const,
    download: (page: number, size: number, from?: string, to?: string) =>
      ['log', 'download', page, size, from ?? null, to ?? null] as const,
  },

} as const
