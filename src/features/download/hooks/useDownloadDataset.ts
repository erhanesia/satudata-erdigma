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
function saveBlob(blob: Blob, fileName: string): void {
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

export interface RequestedFile {
  /** `id` dari daftar `resources`. Kosong berarti berkas pertama. */
  resourceId?: string
  /** Nama cadangan bila server tidak mengirim Content-Disposition. */
  fileName?: string
}

/**
 * Mengunduh satu atau beberapa berkas dataset.
 *
 * Unduhan sengaja lewat XHR, bukan `<a href>` langsung ke endpoint: permintaan
 * perlu membawa header autentikasi, dan server mencatat setiap unduhan ke audit
 * log sebelum bita pertama dikirim.
 *
 * **Berurutan, bukan serentak.** Tiga permintaan sekaligus membuat kegagalan di
 * tengah menyisakan keadaan yang tidak bisa diceritakan kepada pengguna;
 * berurutan membuat "berhasil 2 dari 3" jadi kalimat yang benar. Sebagian
 * peramban juga membatasi jumlah unduhan otomatis yang dipicu bersamaan.
 */
/**
 * Penanda satu aksi unduh.
 *
 * <h2>Kenapa ada cadangannya</h2>
 *
 * crypto.randomUUID hanya tersedia pada konteks yang aman, yaitu HTTPS dan
 * localhost. Produksi memakai HTTPS dan pengembangan memakai localhost, jadi
 * seharusnya selalu ada. Tetapi kalau suatu saat aplikasinya dibuka lewat
 * alamat IP di jaringan kantor untuk diuji di ponsel, ia hilang, dan unduhan
 * berhenti bekerja sama sekali karena galat yang tidak ada hubungannya dengan
 * mengunduh.
 *
 * Cadangannya tidak perlu aman secara kriptografis. Yang dibutuhkan cuma nilai
 * yang tidak bertabrakan dengan penekanan tombol lain, dan server pun sudah
 * membatasi pencariannya pada orang dan dataset yang sama.
 */
function newActionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const acak = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0')
  return [
    acak() + acak(),
    acak(),
    '4' + acak().slice(1),
    ((8 + Math.floor(Math.random() * 4)).toString(16)) + acak().slice(1),
    acak() + acak() + acak(),
  ].join('-')
}

export function useDownloadDataset() {
  return useMutation({
    mutationFn: async ({
      slug,
      agreement,
      files,
    }: {
      slug: string
      agreement: boolean
      /** Kosong berarti satu berkas utama — bentuk lama. */
      files?: RequestedFile[]
    }) => {
      const items: RequestedFile[] = files?.length ? files : [{}]
      const failed: string[] = []
      let totalByte = 0

      /*
        Satu penanda untuk seluruh berkas dalam satu penekanan tombol.

        Server melihat sebanyak-banyaknya permintaan terpisah dan tidak punya
        cara menyimpulkan bahwa semuanya satu peristiwa. Penanda ini yang
        menyatakannya, sehingga log mencatat satu baris berisi seluruh format
        alih-alih satu baris per berkas.

        Dibuat di sini, bukan di dalam perulangan: dua penekanan tombol yang
        berjarak sepersepuluh ribu detik tetap dua peristiwa, dan penanda yang
        berbeda itulah yang membedakannya.
      */
      const actionId = newActionId()

      for (const item of items) {
        try {
          const { blob, fileName } = await downloadDataset(
            slug,
            agreement,
            item.resourceId,
            actionId,
          )
          const fallback = item.fileName ?? `${slug}`
          saveBlob(blob, sanitizeFileName(fileName ?? fallback, fallback))
          totalByte += blob.size
        } catch {
          failed.push(item.fileName ?? item.resourceId ?? slug)
        }
      }

      // Kegagalan sebagian TIDAK dilempar sebagai galat: sebagian berkasnya
      // sudah benar-benar tersimpan di disk pengguna, dan melaporkannya sebagai
      // kegagalan total akan membuat orang mengunduh ulang semuanya.
      return { slug, totalByte, requested: items.length, failed }
    },
  })
}
