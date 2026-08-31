import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { AdminLayout } from '@/features/admin/layouts/AdminLayout'
import { RootLayout } from '@/app/layouts/RootLayout'

import { NotFoundPage } from './NotFoundPage'
import { AdminRoute } from './AdminRoute'
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
const CollectionListPage = lazy(() => import('@/features/collection/pages/CollectionListPage'))
const CollectionDetailPage = lazy(() => import('@/features/collection/pages/CollectionDetailPage'))
const DivisionListPage = lazy(() => import('@/features/division/pages/DivisionListPage'))
const StatusPage = lazy(() => import('@/features/status/pages/StatusPage'))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))

// Panel admin — kerangka dan halamannya terpisah penuh dari panel pengguna.
const AdminDashboardPage = lazy(() => import('@/features/admin/pages/AdminDashboardPage'))
const AdminDatasetPage = lazy(() => import('@/features/admin/pages/AdminDatasetPage'))
const AdminDatasetNewPage = lazy(() => import('@/features/admin/pages/AdminDatasetNewPage'))
const AdminLogPage = lazy(() => import('@/features/admin/pages/AdminLogPage'))

function page(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  // Di luar penjaga dan di luar RootLayout: halaman login tidak boleh memakai
  // header yang isinya justru identitas pengguna yang belum ada.
  {
    path: routePatterns.login,
    element: page(<LoginPage />),
    errorElement: <NotFoundPage />,
  },
  {
    // Rute tanpa path — hanya pembungkus. Seluruh halaman di dalamnya hanya
    // dirender setelah ProtectedRoute memastikan ada sesi.
    element: <ProtectedRoute />,
    children: [
      {
        // Panel admin. Didaftarkan SEBELUM panel pengguna karena rute pengguna
        // berpath '/' dan menangkap '*' di dalamnya — '/admin' akan berakhir di
        // halaman NotFound kalau urutannya terbalik.
        path: routePatterns.admin,
        element: <AdminRoute />,
        errorElement: <NotFoundPage />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: page(<AdminDashboardPage />) },
              { path: routePatterns.adminDatasetNew, element: page(<AdminDatasetNewPage />) },
              { path: routePatterns.adminDatasets, element: page(<AdminDatasetPage />) },
              { path: routePatterns.adminLog, element: page(<AdminLogPage />) },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
      {
        path: routePatterns.home,
        element: <RootLayout />,
        errorElement: <NotFoundPage />,
        children: [
          { index: true, element: page(<HomePage />) },
          { path: routePatterns.datasets, element: page(<DatasetListPage />) },
          { path: routePatterns.datasetDetail, element: page(<DatasetDetailPage />) },
          { path: routePatterns.collections, element: page(<CollectionListPage />) },
          { path: routePatterns.collectionDetail, element: page(<CollectionDetailPage />) },
          { path: routePatterns.divisions, element: page(<DivisionListPage />) },
          { path: routePatterns.status, element: page(<StatusPage />) },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
