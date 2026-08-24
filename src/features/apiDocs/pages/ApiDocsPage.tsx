import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { CodeBlock } from '@/shared/components/ui/CodeBlock'
import { PageContainer, PageHeading } from '@/shared/components/ui/PageContainer'

/**
 * Daftar endpoint publik.
 *
 * Sengaja ditulis manual dan ringkas: halaman ini untuk memahami bentuk API
 * sekilas. Acuan resmi yang selalu sinkron ada di Swagger UI back-end, dan
 * tautannya diberikan di bawah.
 */
const ENDPOINTS = [
  { method: 'GET', path: '/api/v1/datasets', note: 'Daftar dataset — mendukung filter, urutan, paginasi' },
  { method: 'GET', path: '/api/v1/datasets/{slug}', note: 'Detail satu dataset beserta skema kolom' },
  { method: 'GET', path: '/api/v1/datasets/{slug}/datastore', note: 'Isi tabel dataset, berpaginasi' },
  { method: 'GET', path: '/api/v1/datasets/{slug}/summary', note: 'Agregat per kelompok' },
  { method: 'GET', path: '/api/v1/datasets/{slug}/download', note: 'Unduh berkas — butuh agreement=true' },
  { method: 'GET', path: '/api/v1/topics', note: 'Daftar topik' },
  { method: 'GET', path: '/api/v1/formats', note: 'Daftar format berkas' },
  { method: 'GET', path: '/api/v1/divisions', note: 'Daftar divisi kontributor' },
  { method: 'GET', path: '/api/v1/collections', note: 'Daftar koleksi' },
  { method: 'GET', path: '/api/v1/stats', note: 'Statistik ringkas portal' },
  { method: 'GET', path: '/api/v1/status', note: 'Status komponen layanan' },
  { method: 'GET', path: '/api/v1/me', note: 'Identitas pengguna yang sedang masuk' },
] as const

const METHOD_COLORS: Record<string, 'success' | 'brand' | 'danger'> = {
  GET: 'brand',
  POST: 'success',
  DELETE: 'danger',
}

const CURL_SAMPLE = [
  'curl -H "Authorization: Bearer $TOKEN" \\',
  '  "https://api.erdigma.com/api/v1/datasets?topics=Penjualan&size=10"',
].join('\n')

const RESPONSE_SAMPLE = `{
  "content": [
    {
      "slug": "penjualan-furnitur-2025",
      "title": "Penjualan Furnitur 2025",
      "division": { "code": "SALES", "name": "Divisi Penjualan" },
      "topics": ["Penjualan"],
      "formats": ["CSV"],
      "downloads": 0,
      "lastUpdatedAt": "2026-08-14T10:12:00"
    }
  ],
  "totalElements": 9,
  "totalPages": 2,
  "number": 0
}`

export default function ApiDocsPage() {
  return (
    <PageContainer className="py-7 sm:py-10">
      <PageHeading
        title="Dokumentasi API"
        description="Ambil data Satu Data Erdigma langsung dari skrip atau aplikasi Anda."
      />

      <div className="flex flex-col gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Autentikasi</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-ink-600 text-sm leading-relaxed">
              Portal ini tidak menerbitkan API key. Yang dipakai adalah token akun Erdigma yang
              sama dengan yang Anda pakai masuk ke portal, dikirim pada header{' '}
              <code className="font-mono">Authorization</code>. Dengan begitu akses lewat skrip
              tunduk pada posisi dan divisi Anda, persis seperti akses lewat halaman.
            </p>
            <CodeBlock code={CURL_SAMPLE} copyKey="curl" className="mt-4" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Daftar endpoint</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="border-line-100 overflow-x-auto rounded-[10px] border">
              <table className="w-full min-w-[620px] border-collapse">
                <thead className="bg-surface-50">
                  <tr>
                    {['Method', 'Path', 'Keterangan'].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="border-line-200 text-ink-600 border-b-2 px-3.5 py-3 text-left text-[12.5px] font-bold"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((e) => (
                    <tr key={`${e.method}-${e.path}`}>
                      <td className="border-line-50 border-b px-3.5 py-2.5">
                        <Badge tone={METHOD_COLORS[e.method] ?? 'neutral'}>{e.method}</Badge>
                      </td>
                      <td className="border-line-50 text-ink-900 border-b px-3.5 py-2.5 font-mono text-[12.5px] whitespace-nowrap">
                        {e.path}
                      </td>
                      <td className="border-line-50 text-ink-500 border-b px-3.5 py-2.5 text-[13px]">
                        {e.note}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contoh respons</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-ink-600 mb-3 text-sm">
              Daftar dataset memakai format paginasi Spring Data. Perhatikan{' '}
              <code className="font-mono">number</code> berbasis 0 — halaman pertama bernilai 0,
              bukan 1.
            </p>
            <CodeBlock code={RESPONSE_SAMPLE} copyKey="respons" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Acuan lengkap</CardTitle>
          </CardHeader>
          <CardBody>
            <p className="text-ink-600 text-sm leading-relaxed">
              Spesifikasi OpenAPI yang selalu sinkron dengan server tersedia di Swagger UI back-end.
              Halaman ini summaryLine; kalau keduanya berbeda, Swagger yang benar.
            </p>
            <a
              href="http://localhost:8082/swagger-ui.html"
              target="_blank"
              // noreferrer mencegah alamat halaman internal ikut terkirim ke
              // situs tujuan; noopener mencegah tab baru mengakses window ini.
              rel="noopener noreferrer"
              className="mt-4 inline-block"
            >
              <Button variant="secondary" size="sm">
                Buka Swagger UI
              </Button>
            </a>
          </CardBody>
        </Card>
      </div>
    </PageContainer>
  )
}
