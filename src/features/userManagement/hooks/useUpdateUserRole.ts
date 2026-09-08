import { useMutation, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/shared/api/queryKeys'
import type { PortalRole } from '@/shared/types/api'

import { updateUserRole } from '../api/userAdminApi'

export function useUpdateUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: PortalRole | null }) =>
      updateUserRole(id, role),
    onSuccess: () => {
      // Seluruh halaman daftar ikut basi: peran yang berubah menggeser urutan
      // dan isi kolom di halaman mana pun yang sedang dibuka.
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all })
    },
  })
}
