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
const DURATION_MS = 2600

let nextId = 1

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
      const id = nextId
      nextId += 1

      setToasts((previous) => [...previous, { id, message, tone }])
      window.setTimeout(() => {
        setToasts((previous) => previous.filter((t) => t.id !== id))
      }, DURATION_MS)
    },
    [setToasts],
  )

  return {
    show,
    success: useCallback((message: string) => show(message, 'success'), [show]),
    error: useCallback((message: string) => show(message, 'error'), [show]),
  }
}
