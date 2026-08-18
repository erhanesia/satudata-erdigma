import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

import { ApiError } from '@/shared/api/errors'

/**
 * QueryClient dibuat di dalam state komponen, bukan sebagai variabel modul.
 *
 * Kalau dibuat di tingkat modul, cache ikut bertahan lintas remount saat
 * hot-reload dan — lebih penting — akan dipakai bersama bila suatu saat aplikasi
 * ini dirender di server. Membuatnya per-instance menghindari kebocoran data
 * antar pengguna.
 */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Katalog data jarang berubah dalam hitungan detik. Satu menit menekan
        // permintaan berulang saat pengguna bolak-balik antar halaman.
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,

        retry: (gagalKe, error) => {
          // Galat yang jelas bukan gangguan sementara tidak perlu diulang.
          // Mengulang 401 atau 403 hanya membuat pengguna menunggu lebih lama
          // untuk pesan yang sama, dan membebani server tanpa guna.
          if (error instanceof ApiError) {
            const takPerluUlang = ['unauthorized', 'forbidden', 'notFound', 'validation']
            if (takPerluUlang.includes(error.kind)) return false
          }
          return gagalKe < 2
        },
      },
      mutations: {
        // Perubahan data tidak pernah diulang otomatis: percobaan kedua bisa
        // membuat entitas ganda kalau permintaan pertama sebetulnya berhasil.
        retry: false,
      },
    },
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
