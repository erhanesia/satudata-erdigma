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
  apiDocs: '/api-docs',
  status: '/status',
  datasetUpload: '/datasets/unggah',
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
  apiDocs: 'api-docs',
  status: 'status',
  // Didaftarkan SEBELUM 'datasets/:slug' di router, kalau tidak
  // "unggah" akan ditangkap sebagai slug dataset.
  datasetUpload: 'datasets/unggah',
} as const
