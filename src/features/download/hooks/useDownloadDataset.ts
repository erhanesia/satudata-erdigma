import { useMutation } from '@tanstack/react-query'

import { downloadDataset } from '@/features/dataset/api/datasetApi'
import { sanitizeFileName } from '@/shared/lib/format'

/**
 * Menyimpan blob ke disk pengguna.
 *
 * Tautan objek **wajib** dicabut setelah dipakai. Setiap `createObjectURL`
 * menahan seluruh isi berkas di memori sampai `revokeObjectURL` dipanggil atau
 * tab ditutup — mengunduh beberapa berkas puluhan megabita tanpa mencabutnya
 * cukup untuk membuat tab kehabisan memori.
 */
function simpanBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    // Ditunda sesaat: sebagian peramban membaca blob-nya secara asinkron
    // setelah klik, dan pencabutan seketika bisa membatalkan unduhan.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}

/**
 * Mengunduh berkas dataset.
 *
 * Unduhan sengaja lewat XHR, bukan `<a href>` langsung ke endpoint: permintaan
 * perlu membawa header autentikasi, dan server mencatat setiap unduhan ke audit
 * log sebelum bita pertama dikirim.
 */
export function useDownloadDataset() {
  return useMutation({
    mutationFn: async ({ slug, agreement }: { slug: string; agreement: boolean }) => {
      const { blob, fileName } = await downloadDataset(slug, agreement)
      simpanBlob(blob, sanitizeFileName(fileName ?? `${slug}.csv`, `${slug}.csv`))
      return { slug, size: blob.size }
    },
  })
}
