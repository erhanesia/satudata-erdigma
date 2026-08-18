import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { AppErrorBoundary } from '@/app/providers/AppErrorBoundary'
import { QueryProvider } from '@/app/providers/QueryProvider'
import { router } from '@/app/router/router'

import '@/styles/index.css'

const wadah = document.getElementById('root')
if (!wadah) throw new Error('Elemen #root tidak ditemukan di index.html')

createRoot(wadah).render(
  <StrictMode>
    <AppErrorBoundary>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </AppErrorBoundary>
  </StrictMode>,
)
