import { Link } from 'react-router-dom'

import { Button } from '@/shared/components/ui/Button'

import { paths } from './paths'

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center px-5 py-24 text-center">
      <p className="text-brand text-sm font-bold tracking-wide uppercase">404</p>
      <h1 className="text-ink-900 mt-3 text-2xl font-extrabold">Halaman tidak ditemukan</h1>
      <p className="text-ink-500 mt-2 max-w-md text-sm">
        Alamat yang Anda buka tidak ada di portal ini. Mungkin dataset sudah dipindahkan atau
        tautannya salah ketik.
      </p>
      <Button className="mt-6" onClick={() => window.history.back()}>
        Kembali ke halaman sebelumnya
      </Button>
      <Link to={paths.home} className="text-brand mt-4 text-sm font-semibold">
        Ke beranda
      </Link>
    </div>
  )
}
