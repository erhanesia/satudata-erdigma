import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteDataset, updateDatasetAccessRules } from '@/features/dataset/api/datasetApi'
import { queryKeys } from '@/shared/api/queryKeys'
import type { AccessRule } from '@/shared/types/api'

/**
 * Tindakan pengelolaan dataset dari panel admin.
 *
 * Keduanya membatalkan cache dataset DAN cache log. Alasannya bukan
 * kehati-hatian berlebih: back-end menulis baris audit untuk setiap perubahan,
 * jadi daftar "Aktivitas terakhir" di dasbor benar-benar basi begitu salah satu
 * tindakan ini berhasil. Tanpa pembatalan itu, admin mengubah sesuatu lalu
 * melihat dasbor yang berpura-pura tidak terjadi apa-apa.
 *
 * Dijalankan berurutan, bukan serentak. Menghapus sepuluh dataset dengan
 * sepuluh permintaan sekaligus membuat kegagalan di tengah menyisakan keadaan
 * yang tidak bisa diceritakan kepada pengguna — berurutan membuat "berhasil 4
 * dari 7" menjadi kalimat yang benar.
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
    Payload per slug, bukan satu daftar untuk semua sekaligus.

    Bentuk ini menjaga hook tetap bebas dari kebijakan antarmuka. "Semua yang
    terpilih dapat aturan yang sama" adalah keputusan dialognya, bukan keputusan
    lapisan data; di sini cukup "terapkan aturan ini pada dataset ini".

    Kelonggarannya juga berguna: pemanggil yang hanya bisa menyunting sebagian
    sumbu dapat membawa serta aturan yang tidak ia tampilkan, alih-alih
    menghapusnya hanya karena layarnya tidak bisa menunjukkannya.
  */
  const updateAccessRules = useMutation({
    mutationFn: async (items: { slug: string; accessRules: AccessRule[] }[]) => {
      const failed: string[] = []
      for (const { slug, accessRules } of items) {
        try {
          await updateDatasetAccessRules(slug, accessRules)
        } catch {
          failed.push(slug)
        }
      }
      return { total: items.length, failed }
    },
    onSuccess: refresh,
  })

  return { remove, updateAccessRules }
}
