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
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const toast = useToast()

  const copy = useCallback(
    async (text: string, key = 'default', successMessage = 'Disalin ke clipboard') => {
      if (!navigator.clipboard) {
        toast.error('Penyalinan tidak didukung di konteks ini.')
        return false
      }
      try {
        await navigator.clipboard.writeText(text)
        setCopiedKey(key)
        window.setTimeout(() => setCopiedKey(null), resetMs)
        toast.show(successMessage)
        return true
      } catch {
        toast.error('Gagal menyalin ke clipboard.')
        return false
      }
    },
    [resetMs, toast],
  )

  return { copy, copiedKey }
}
