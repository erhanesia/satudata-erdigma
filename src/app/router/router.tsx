import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { RootLayout } from '@/app/layouts/RootLayout'

import { NotFoundPage } from './NotFoundPage'
import { ProtectedRoute } from './ProtectedRoute'
import { RouteFallback } from './RouteFallback'
import { routePatterns } from './paths'

/**
 * Setiap halaman dimuat terpisah (`lazy`).
 *
 * Beranda tidak perlu ikut mengunduh kode Data Explorer beserta pustaka
 * tabelnya. Pemecahan ini membuat muat pertama jauh lebih ringan, dan biayanya
 * hanya satu pembungkus Suspense.
 */
const HomePage = lazy(() => import('@/features/home/pages/HomePage'))
const DatasetListPage = lazy(() => import('@/features/dataset/pages/DatasetListPage'))
const DatasetDetailPage = lazy(() => import('@/features/dataset/pages/DatasetDetailPage'))
const DatasetUploadPage = lazy(() => import('@/features/dataset/pages/DatasetUploadPage'))
const CollectionListPage = lazy(() => import('@/features/collection/pages/CollectionListPage'))
const CollectionDetailPage = lazy(() => import('@/features/collection/pages/CollectionDetailPage'))
const DivisionListPage = lazy(() => import('@/features/division/pages/DivisionListPage'))
const ApiDocsPage = lazy(() => import('@/features/apiDocs/pages/ApiDocsPage'))
const StatusPage = lazy(() => import('@/features/status/pages/StatusPage'))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))

function halaman(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  // Di luar penjaga dan di luar RootLayout: halaman login tidak boleh memakai
  // header yang isinya justru identitas pengguna yang belum ada.
  {
    path: routePatterns.login,
    element: halaman(<LoginPage />),
    errorElement: <NotFoundPage />,
  },
  {
    // Rute tanpa path — hanya pembungkus. Seluruh halaman di dalamnya hanya
    // dirender setelah ProtectedRoute memastikan ada sesi.
    element: <ProtectedRoute />,
    children: [
      {
        path: routePatterns.home,
        element: <RootLayout />,
        errorElement: <NotFoundPage />,
        children: [
          { index: true, element: halaman(<HomePage />) },
          { path: routePatterns.datasets, element: halaman(<DatasetListPage />) },
          // Urutan penting: rute unggah harus di ATAS rute detail, kalau
          // tidak "unggah" tertangkap sebagai :slug dan yang muncul 404.
          { path: routePatterns.datasetUpload, element: halaman(<DatasetUploadPage />) },
          { path: routePatterns.datasetDetail, element: halaman(<DatasetDetailPage />) },
          { path: routePatterns.collections, element: halaman(<CollectionListPage />) },
          { path: routePatterns.collectionDetail, element: halaman(<CollectionDetailPage />) },
          { path: routePatterns.divisions, element: halaman(<DivisionListPage />) },
          { path: routePatterns.apiDocs, element: halaman(<ApiDocsPage />) },
          { path: routePatterns.status, element: halaman(<StatusPage />) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
