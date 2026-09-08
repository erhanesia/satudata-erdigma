import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { deleteDataset, updateDataset } from '@/features/dataset/api/datasetApi'
import { queryKeys } from '@/shared/api/queryKeys'
import type { DatasetUpdate } from '@/shared/types/api'

/**
 * Tindakan pengelolaan dataset dari panel admin.
 *
 * Keduanya membatalkan cache dataset DAN cache log. Alasannya bukan
 * kehati-hatian berlebih: back-end menulis baris audit untuk setiap perubahan,
 * jadi daftar "Aktivitas terakhir" di dasbor benar-benar basi begitu salah satu
 * tindakan ini berhasil. Tanpa pembatalan itu, admin mengubah sesuatu lalu
 * melihat dasbor yang berpura-pura tidak terjadi apa-apa.
 *
 * Penghapusan dijalankan berurutan, bukan serentak. Menghapus sepuluh dataset
 * dengan sepuluh permintaan sekaligus membuat kegagalan di tengah menyisakan
 * keadaan yang tidak bisa diceritakan kepada pengguna — berurutan membuat
 * "berhasil 4 dari 7" menjadi kalimat yang benar.
 */
export function useDatasetAdmin() {
  const queryClient = useQueryClient()

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.dataset.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.log.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.stats })
  }

  const remove = useMutation({
    mutationFn: async (slugs: string[]) => {
      const failed: string[] = []
      for (const slug of slugs) {
        try {
          await deleteDataset(slug)
        } catch {
          failed.push(slug)
        }
      }
      return { total: slugs.length, failed }
    },
    onSuccess: refresh,
  })

  /*
    Kemajuan pengiriman berkas, 0-100.

    Sama persis dengan yang ada di penerbitan, dan karena alasan yang sama: ada
    dua babak yang dilihat penyunting sebagai satu tombol menunggu — byte
    berkasnya dikirim, lalu back-end membacanya dan memasukkan tiap barisnya.
    Hanya babak pertama yang bisa diukur browser; angka ini berhenti di 100 dan
    diam di situ selama babak kedua berlangsung.
  */
  const [progress, setProgress] = useState(0)

  /*
    Menyunting satu dataset.

    Satu dataset per panggilan, tidak berbentuk daftar seperti `remove` di
    atas: menyunting judul dan deskripsi memang tidak punya bentuk massal, dan
    memaksakannya jadi daftar hanya menambah lapisan yang tidak pernah dipakai.

    Aturan akses ikut lewat sini. Sebelumnya ada mutasi tersendiri untuk ubah
    akses massal dari tabel dataset, dan itu dilepas bersama dialognya: siapa
    yang boleh melihat kini disetel di formulir sunting, satu layar yang sama
    dengan formulir terbit. Endpoint `PATCH /{slug}/access-rules` di sisi server
    tetap ada, hanya tidak lagi punya pemanggil di sini.

    Berkas juga lewat sini, sehingga menambah, mengganti, dan membuang berkas
    berangkat dalam permintaan yang SAMA dengan perubahan judul dan aturan
    akses. Memecahnya jadi beberapa permintaan berarti sebagiannya bisa
    berhasil dan sebagiannya gagal, dan penyuntingnya tidak punya cara
    mengembalikan keadaan.
  */
  const update = useMutation({
    mutationFn: ({
      slug,
      body,
      files,
    }: {
      slug: string
      body: DatasetUpdate
      files?: File[]
    }) => {
      setProgress(0)
      return updateDataset(slug, body, files ?? [], setProgress)
    },
    onSuccess: refresh,
  })

  /*
    Objek baru untuk `update`, bukan `Object.assign`.

    `useMutation` mengembalikan `observer.getCurrentResult()`, dan itu objek
    INTERNAL milik React Query yang dikembalikan apa adanya. Objek itu hanya
    dibuat ulang saat status mutation berubah, sehingga selama penyimpanan
    berjalan statusnya tetap `pending` dan objeknya tidak pernah berganti.
    Menempelkan `progress` ke situ berarti menimpa isi milik pustaka berulang
    kali, dan nilainya ikut terlihat oleh siapa pun yang berlangganan observer
    yang sama.
  */
  return { remove, update: { ...update, progress } }
}
