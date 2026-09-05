import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { ApiError } from '@/shared/api/errors'
import { queryKeys } from '@/shared/api/queryKeys'
import type { Dataset } from '@/shared/types/api'

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

export function useDataset(slug: string, recordView = true) {
  return useQuery({
    queryKey: queryKeys.dataset.detail(slug, recordView),
    queryFn: ({ signal }) => fetchDataset(slug, recordView, signal),
    enabled: slug.length > 0,
  })
}

export function useDatastore(
  slug: string,
  resourceId: string | undefined,
  page: number,
  size: number,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.dataset.datastore(slug, resourceId, page, size),
    queryFn: ({ signal }) => fetchDatastore(slug, resourceId, page, size, signal),
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
 * Mencari dataset yang barusan diunggah, setelah browser menyerah menunggu.
 *
 * <h2>Kenapa ini ada</h2>
 *
 * Waktu tunggu habis di sisi klien bukan kegagalan di sisi server. HTTP tidak
 * punya cara membatalkan pekerjaan yang sudah berjalan hanya karena peminta
 * berhenti mendengarkan: back-end tetap menyimpan berkasnya, membaca isinya, dan
 * memasukkan barisnya sampai tuntas.
 *
 * Ini pernah terjadi sungguhan. Satu XLSX berisi 61.876 baris memakan 64 detik,
 * sementara ambang waktu klien saat itu 20 detik. Yang terlihat penerbit pesan
 * gagal; yang tersimpan di database dataset yang utuh. Penerbit yang percaya
 * pesan itu akan mengulang unggahannya, dan yang kedua berebut slug dengan yang
 * pertama.
 *
 * <h2>Kenapa mencari, bukan menghapus</h2>
 *
 * Godaan berikutnya: kalau waktu tunggu habis, hapus saja datasetnya supaya
 * bersih. Itu jauh lebih berbahaya — perintah hapus akan menyasar unggahan yang
 * BERHASIL, dan menghancurkan pekerjaan yang sudah selesai hanya karena
 * jaringan penerbit lambat. Gagal ke arah menyimpan, bukan menghapus.
 *
 * Slug-nya tidak dikirim klien melainkan diturunkan back-end dari judulnya, jadi
 * pencarian dilakukan lewat judul. Dicoba beberapa kali karena saat waktu tunggu
 * habis, impor barisnya bisa jadi masih berjalan dan datasetnya belum muncul di
 * daftar.
 */
async function findPublished(title: string): Promise<Dataset | null> {
  const wanted = title.trim().toLowerCase()

  for (let attempt = 0; attempt < ATTEMPTS_AFTER_TIMEOUT; attempt++) {
    try {
      const page = await fetchDatasets({ search: title.trim(), size: 10, sort: 'created' })
      const match = (page.content ?? []).find(
        (item) => (item.title ?? '').trim().toLowerCase() === wanted,
      )
      if (match?.slug) return await fetchDataset(match.slug)
    } catch {
      // Pencarian yang gagal tidak boleh menutupi galat aslinya. Diamkan, coba
      // lagi, dan kalau tetap tidak ketemu biarkan galat unggahannya yang bicara.
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  return null
}

/** Sekitar satu menit menunggu, cukup untuk impor yang masih menyelesaikan diri. */
const ATTEMPTS_AFTER_TIMEOUT = 12
const POLL_INTERVAL_MS = 5_000

/**
 * Menerbitkan dataset baru, lalu membatalkan cache daftar dataset dan statistik
 * agar beranda maupun halaman Datasets langsung memuat yang baru.
 */
export function useUploadDataset() {
  const queryClient = useQueryClient()

  /*
    Kemajuan pengiriman berkas, 0-100.

    Ada dua babak yang dilihat penerbit sebagai satu tombol menunggu: byte
    berkasnya dikirim, lalu back-end membaca dan memasukkan tiap barisnya. Hanya
    babak pertama yang bisa diukur browser; angka ini berhenti di 100 dan diam
    di situ selama babak kedua berlangsung.

    Diam yang tidak dijelaskan itulah yang membuat unggahan 64 detik terasa
    seperti gagal — jadi tombolnya berganti kalimat saat angkanya penuh, bukan
    menampilkan bilah yang mandek.
  */
  const [progress, setProgress] = useState(0)

  const mutation = useMutation({
    mutationFn: async ({ files, body }: { files: File[]; body: DatasetUploadBody }) => {
      setProgress(0)
      try {
        return await uploadDataset(files, body, setProgress)
      } catch (error) {
        // Waktu tunggu habis TIDAK berarti unggahannya gagal. Yang menyerah
        // browser; back-end tidak pernah tahu dan terus bekerja sampai selesai.
        // Sebelum mengabarkan kegagalan, tanyakan dulu apakah datasetnya
        // benar-benar terbit.
        if (error instanceof ApiError && error.kind === 'timeout') {
          const published = await findPublished(body.title)
          if (published) return published
        }
        throw error
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dataset.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
      // Menerbitkan dataset menulis baris audit CREATE. Tanpa pembatalan ini,
      // panel "Aktivitas terakhir" di dasbor berpura-pura tidak terjadi apa-apa.
      void queryClient.invalidateQueries({ queryKey: queryKeys.log.all })
    },
  })

  return Object.assign(mutation, { progress })
}
