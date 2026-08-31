/**
 * Seluruh rute aplikasi dalam satu tempat.
 *
 * Kenapa bukan string literal yang ditulis di tiap `<Link>`: mengganti alamat
 * halaman jadi satu suntingan, dan tautan yang salah ketik ketahuan saat
 * compile, bukan saat pengguna menemukan halaman kosong.
 *
 * Kesembilan rute ini cerminan dari `route` pada berkas desain. `login` adalah
 * tambahan di luar desain: prototipe menganggap penggunanya sudah masuk, tapi
 * aplikasi sungguhan tetap butuh pintu depan.
 */
export const paths = {
  home: '/',
  login: '/login',
  datasets: '/datasets',
  datasetDetail: (slug: string) => `/datasets/${encodeURIComponent(slug)}`,
  collections: '/collections',
  collectionDetail: (slug: string) => `/collections/${encodeURIComponent(slug)}`,
  divisions: '/divisions',
  status: '/status',

  /**
   * Panel admin — kerangka terpisah dari panel pengguna: sidebar gelap, tanpa
   * footer. Rute unggah dataset dipindahkan ke sini dari `/datasets/unggah`.
   */
  admin: '/admin',
  adminDatasets: '/admin/dataset',
  adminDatasetNew: '/admin/dataset/tambah',
  adminLog: '/admin/log',
} as const

/** Pola rute untuk react-router (bukan alamat jadi). */
export const routePatterns = {
  home: '/',
  login: '/login',
  datasets: 'datasets',
  datasetDetail: 'datasets/:slug',
  collections: 'collections',
  collectionDetail: 'collections/:slug',
  divisions: 'divisions',
  status: 'status',

  admin: '/admin',
  // Relatif terhadap 'admin'. 'dataset/tambah' didaftarkan sebelum rute
  // berparameter agar tidak pernah tertangkap sebagai nilai parameter.
  adminDatasets: 'dataset',
  adminDatasetNew: 'dataset/tambah',
  adminLog: 'log',
} as const
