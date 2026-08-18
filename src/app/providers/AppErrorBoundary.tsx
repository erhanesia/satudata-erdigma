import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/shared/components/ui/Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Jaring pengaman terakhir untuk galat render.
 *
 * React membongkar seluruh pohon komponen ketika ada galat yang tidak
 * tertangkap — tanpa batas seperti ini, satu kesalahan kecil di satu kartu
 * menyisakan layar putih kosong. Harus berupa class component: React belum
 * menyediakan padanan hook untuk `componentDidCatch`.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Di produksi, di sinilah galat dikirim ke layanan pemantauan (Sentry dan
    // sejenisnya). Sengaja tidak menulis ke console di produksi supaya isi
    // galat tidak tertinggal di peramban pengguna.
    if (import.meta.env.DEV) {
      console.error('Galat render tidak tertangkap:', error, info.componentStack)
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-ink-900 text-xl font-bold">Terjadi kesalahan tak terduga</h1>
        <p className="text-ink-500 max-w-md text-sm">
          Halaman gagal ditampilkan. Muat ulang halaman untuk mencoba lagi.
        </p>
        <Button onClick={() => window.location.reload()}>Muat ulang halaman</Button>
      </div>
    )
  }
}
