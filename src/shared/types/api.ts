import type { components } from './api.generated'

/**
 * Nama ramah untuk skema yang di-generate dari `/v3/api-docs`.
 *
 * JANGAN menulis tipe respons dengan tangan. Berkas `api.generated.ts` dibuat
 * ulang dengan `npm run api:types` setiap kali kontrak back-end berubah; kalau
 * ada field yang hilang atau berganti tipe, `npm run build` gagal di sini —
 * bukan rusak diam-diam saat demo di depan orang.
 */
type Schemas = components['schemas']

export type Division = Schemas['DivisionResponse']
export type DivisionLite = Schemas['DivisionResponseLite']
// Tipe ApiKey sengaja tidak lagi diekspor: fitur API key dibuang dari
// front-end. Endpoint-nya masih ada di back-end, jadi skemanya tetap muncul
// di api.generated.ts — tapi tidak ada kode yang memakainya.
export type Collection = Schemas['CollectionResponse']
export type CollectionLite = Schemas['CollectionResponseLite']
export type Dataset = Schemas['DatasetResponse']
export type DatasetLite = Schemas['DatasetResponseLite']
export type DatasetColumn = Schemas['DatasetColumnResponse']
export type DatasetResource = Schemas['DatasetResourceResponse']
export type DatasetSummary = Schemas['DatasetSummaryResponse']
export type Datastore = Schemas['DatastoreResponse']
export type Format = Schemas['FormatResponse']
export type Incident = Schemas['IncidentItem']
export type Stats = Schemas['StatsResponse']
export type Status = Schemas['StatusResponse']
export type StatusComponent = Schemas['Component']
export type SummaryGroup = Schemas['SummaryGroup']
export type Topic = Schemas['TopicResponse']
export type CurrentUser = Schemas['UserResponse']

/** Halaman Spring Data. `number` berbasis 0 — perhatikan saat menampilkannya. */
export type PageOfDatasets = Schemas['PageDatasetResponseLite']

/** Peran portal Satu Data — dasar otorisasi, terpisah dari tingkat izin HRIS. */
export type PortalRole = NonNullable<CurrentUser['role']>

/** Hasil hitungan HRIS, direkam untuk pemetaan. Bukan dasar otorisasi di sini. */
export type HrisPermissionLevel = NonNullable<CurrentUser['hrisPermissionLevel']>

/**
 * Satu baris data di Data Explorer.
 *
 * Back-end menyimpannya sebagai JSONB, jadi kuncinya berbeda-beda tiap dataset
 * dan tidak mungkin diketahui saat compile. Nilainya `unknown`, bukan `any`,
 * supaya pemakaian tetap dipaksa memeriksa tipe sebelum dirender.
 */
export type DatastoreRow = Record<string, unknown>
