import { useMutation, useQueryClient } from '@tanstack/react-query'

import { deleteDataset, updateDatasetPositions } from '@/features/dataset/api/datasetApi'
import { queryKeys } from '@/shared/api/queryKeys'

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

  const updatePositions = useMutation({
    mutationFn: async ({ slugs, positions }: { slugs: string[]; positions: string[] }) => {
      const failed: string[] = []
      for (const slug of slugs) {
        try {
          await updateDatasetPositions(slug, positions)
        } catch {
          failed.push(slug)
        }
      }
      return { total: slugs.length, failed }
    },
    onSuccess: refresh,
  })

  return { remove, updatePositions }
}
