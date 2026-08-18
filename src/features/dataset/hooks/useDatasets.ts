import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'

import {
  fetchDataset,
  fetchDatasets,
  fetchDatastore,
  fetchFormats,
  fetchSummary,
  fetchTopics,
  uploadDataset,
  type DatasetQuery,
  type DatasetUploadBody,
} from '../api/datasetApi'

export function useDatasets(query: DatasetQuery) {
  return useQuery({
    queryKey: queryKeys.dataset.list(query),
    queryFn: ({ signal }) => fetchDatasets(query, signal),
    // Saat pengguna berpindah halaman atau mengubah filter, hasil lama tetap
    // ditampilkan sampai yang baru tiba. Tanpa ini daftar berkedip menjadi
    // kosong lalu terisi lagi — terasa seperti aplikasi tersendat.
    placeholderData: keepPreviousData,
  })
}

export function useDataset(slug: string) {
  return useQuery({
    queryKey: queryKeys.dataset.detail(slug),
    queryFn: ({ signal }) => fetchDataset(slug, signal),
    enabled: slug.length > 0,
  })
}

export function useDatastore(slug: string, page: number, size: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.dataset.datastore(slug, page, size),
    queryFn: ({ signal }) => fetchDatastore(slug, page, size, signal),
    enabled: enabled && slug.length > 0,
    placeholderData: keepPreviousData,
  })
}

export function useDatasetSummary(
  slug: string,
  groupBy: string | undefined,
  metric: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.dataset.summary(slug, groupBy, metric),
    queryFn: ({ signal }) => fetchSummary(slug, groupBy, metric, signal),
    enabled: enabled && slug.length > 0,
  })
}

export function useTopics() {
  return useQuery({
    queryKey: queryKeys.taxonomy.topics,
    queryFn: ({ signal }) => fetchTopics(signal),
    // Daftar topik dan format nyaris tidak pernah berubah; sekali ambil cukup
    // untuk satu sesi.
    staleTime: 30 * 60_000,
  })
}

export function useFormats() {
  return useQuery({
    queryKey: queryKeys.taxonomy.formats,
    queryFn: ({ signal }) => fetchFormats(signal),
    staleTime: 30 * 60_000,
  })
}

/**
 * Menerbitkan dataset baru, lalu membatalkan cache daftar dataset dan statistik
 * agar beranda maupun halaman Datasets langsung memuat yang baru.
 */
export function useUploadDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, body }: { file: File; body: DatasetUploadBody }) =>
      uploadDataset(file, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dataset.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
    },
  })
}
