import { MotionConfig } from 'motion/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { AppErrorBoundary } from '@/app/providers/AppErrorBoundary'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { bootstrapAuth } from '@/features/auth/model/authStrategy'

import '@/styles/index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Elemen #root tidak ditemukan di index.html')

// Autentikasi diselesaikan lebih dulu, karena keduanya mengubah alamat halaman
// sebelum router membacanya: kepulangan dari Hosted UI membuang `?code=` dan
// mengembalikan tujuan semula, sedangkan re-auth senyap justru meninggalkan
// halaman ini sama sekali. Merender lebih dulu berarti pengguna sempat melihat
// halaman masuk berkedip untuk sesi yang sebenarnya masih hidup.
//
// history.replaceState dan sessionStorage yang dipakai bootstrap bisa
// melempar (mis. SecurityError, QuotaExceededError di mode privat) sebelum
// sempat memutuskan render atau tidak. Halaman kosong tanpa jalan keluar
// lebih buruk daripada diarahkan ke halaman masuk untuk mencoba lagi.
let lanjutkanRender = true
try {
  lanjutkanRender = await bootstrapAuth()
} catch (error) {
  console.error('Bootstrap autentikasi gagal, arahkan ke halaman masuk.', error)
  try {
    window.history.replaceState(null, '', '/login')
  } catch {
    // Diabaikan: gagal dengan sebab yang sama seperti di atas. Tetap render
    // supaya router masih bisa menangani alamat yang ada sekarang.
  }
}

if (lanjutkanRender) {
  // Diimpor secara dinamis DI SINI, bukan di atas sebagai import statis: modul
  // ini memanggil createBrowserRouter() saat dievaluasi, dan react-router
  // membaca alamat halaman tepat saat itu juga lalu hanya menyimak popstate
  // sesudahnya. replaceState() yang dipakai completeSignIn() untuk membuang
  // ?code=&state= dan mengembalikan tujuan semula TIDAK memicu popstate. Kalau
  // import ini statis, evaluasi modul (dan snapshot alamatnya) terjadi sebelum
  // baris `await bootstrapAuth()` di atas sempat berjalan, sehingga router
  // selalu membaca "/" — persis gejala di temuan awal: kandidat mendarat di
  // Beranda meski tujuannya /datasets. Jangan "dirapikan" balik jadi import
  // statis tanpa mengulang analisis ini.
  //
  // Konsekuensinya, import ini bisa gagal sendiri terlepas dari chunk entri —
  // gejala klasik: index.html basi masih menunjuk hash chunk router yang sudah
  // hilang sesudah redeploy. AppErrorBoundary belum terpasang di titik ini,
  // jadi kegagalan ditangani manual: muat ulang sekali (index.html yang segar
  // membawa hash yang benar), dicek lewat Navigation Timing API supaya tidak
  // berulang kalau muat ulang pun tetap gagal.
  try {
    const { router } = await import('@/app/router/router')

    createRoot(container).render(
      <StrictMode>
        <AppErrorBoundary>
          <QueryProvider>
            {/*
              Preferensi "kurangi animasi" dihormati untuk animasi Motion.

              Blok @media prefers-reduced-motion di styles/index.css TIDAK
              menjangkau animasi ini. Yang dimatikannya `animation-duration`
              dan `transition-duration`, yaitu animasi dan transisi CSS,
              sedangkan Motion menggerakkan gaya sebaris lewat JavaScript dan
              Web Animations API. Keduanya bukan animasi CSS, jadi aturan itu
              lewat begitu saja.

              Bawaan Motion `reducedMotion: "never"`, artinya setelan
              perangkat diabaikan sepenuhnya sampai ada yang menyuruhnya
              sebaliknya. Bisa dibaca di context/MotionConfigContext.

              Dipasang di akar, bukan pada komponen yang dilaporkan. Yang
              keliru bukan tempat-tempat itu melainkan setelan bawaannya, dan
              setelan itu berlaku untuk seluruh aplikasi. Memperbaikinya
              setempat berarti setiap animasi baru harus mengingat hal yang
              sama lagi, dan yang lupa tidak mendapat peringatan apa pun.

              Hari ini yang benar-benar berubah cuma satu tempat, yaitu baris
              berkas pada formulir dataset, yang menggeser y dan menyusutkan
              tingginya. Baris tabel di panel admin hanya memudarkan opacity,
              dan itu memang TIDAK ikut dimatikan.

              "user" mematikan yang benar-benar memicu keluhan, yaitu yang
              menggeser dan mengubah ukuran: motion-dom memakainya untuk
              melangkahi positionalKeys, yaitu width, height, top, left,
              right, bottom, dan seluruh properti transform, sekaligus
              membuat animasi layout langsung ke keadaan akhirnya.

              Opacity SENGAJA tidak ikut dimatikan. Memudar tidak menimbulkan
              rasa pusing, dan panduan aksesibilitas justru menyarankannya
              sebagai PENGGANTI gerak. Mematikannya membuat baris muncul dan
              hilang begitu saja, dan justru itu yang sulit diikuti mata.
            */}
            <MotionConfig reducedMotion="user">
              <RouterProvider router={router} />
            </MotionConfig>
          </QueryProvider>
        </AppErrorBoundary>
      </StrictMode>,
    )
  } catch (error) {
    console.error('Gagal memuat chunk router.', error)
    const navigasi = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    if (navigasi?.type !== 'reload') {
      window.location.reload()
    } else {
      container.textContent = 'Gagal memuat aplikasi. Silakan muat ulang halaman.'
    }
  }
}
