import { atom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback } from 'react'

export type ToastTone = 'info' | 'success' | 'error'

export interface Toast {
  id: number
  message: string
  tone: ToastTone
}

const toastsAtom = atom<Toast[]>([])

/** Lama tampil sebelum menghilang sendiri, mengikuti desain (2,6 detik). */
const DURASI_MS = 2600

let idBerikutnya = 1

export function useToasts() {
  return useAtomValue(toastsAtom)
}

/**
 * Pemberitahuan singkat. Sengaja ditulis sendiri alih-alih menarik pustaka
 * toast: kebutuhannya satu baris teks yang hilang sendiri, dan pustaka toast
 * umumnya membawa portal, animasi, serta antrean yang tidak dipakai di sini.
 */
export function useToast() {
  const setToasts = useSetAtom(toastsAtom)

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = idBerikutnya
      idBerikutnya += 1

      setToasts((sebelumnya) => [...sebelumnya, { id, message, tone }])
      window.setTimeout(() => {
        setToasts((sebelumnya) => sebelumnya.filter((t) => t.id !== id))
      }, DURASI_MS)
    },
    [setToasts],
  )

  return {
    show,
    success: useCallback((message: string) => show(message, 'success'), [show]),
    error: useCallback((message: string) => show(message, 'error'), [show]),
  }
}
