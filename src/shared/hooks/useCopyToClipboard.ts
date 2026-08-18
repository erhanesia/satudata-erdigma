import { useCallback, useState } from 'react'

import { useToast } from '@/shared/components/ui/toastStore'

/**
 * Menyalin teks ke papan klip.
 *
 * `navigator.clipboard` hanya tersedia pada konteks aman (HTTPS atau
 * localhost). Kalau tidak ada, salinan dilaporkan gagal alih-alih diam saja —
 * pengguna yang mengira API key sudah tersalin lalu menempel teks kosong akan
 * bingung tanpa sebab yang jelas.
 */
export function useCopyToClipboard(resetMs = 1800) {
  const [kunciTersalin, setKunciTersalin] = useState<string | null>(null)
  const toast = useToast()

  const copy = useCallback(
    async (teks: string, kunci = 'default') => {
      if (!navigator.clipboard) {
        toast.error('Penyalinan tidak didukung di konteks ini.')
        return false
      }
      try {
        await navigator.clipboard.writeText(teks)
        setKunciTersalin(kunci)
        window.setTimeout(() => setKunciTersalin(null), resetMs)
        toast.show('Disalin ke clipboard')
        return true
      } catch {
        toast.error('Gagal menyalin ke clipboard.')
        return false
      }
    },
    [resetMs, toast],
  )

  return { copy, kunciTersalin }
}
