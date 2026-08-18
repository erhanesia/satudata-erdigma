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
    detail: (slug: string) => ['dataset', 'detail', slug] as const,
    datastore: (slug: string, page: number, size: number) =>
      ['dataset', 'datastore', slug, page, size] as const,
    summary: (slug: string, groupBy?: string, metric?: string) =>
      ['dataset', 'summary', slug, groupBy ?? null, metric ?? null] as const,
  },

  taxonomy: {
    topics: ['taxonomy', 'topic'] as const,
    formats: ['taxonomy', 'format'] as const,
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
  status: ['status'] as const,

} as const
