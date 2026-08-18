import { Link } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import { Button } from '@/shared/components/ui/Button'
import { CodeBlock } from '@/shared/components/ui/CodeBlock'
import type { Dataset } from '@/shared/types/api'

/**
 * Contoh pemanggilan API untuk satu dataset.
 *
 * ⚠️ SAAT INI TIDAK DIRENDER. Halaman detail mengikuti desain yang hanya punya
 * tiga tab — Ringkasan, Data Explorer, Kolom — sehingga tab "API" dilepas.
 *
 * Berkasnya tetap disimpan, bukan dibuang, karena dua hal: desainnya sendiri
 * masih memuat `apiEl()` beserta `tabApi` (hanya tidak didaftarkan di daftar
 * tab), dan repositori ini belum punya satu pun commit sehingga kode yang
 * dihapus tidak bisa dipulihkan. Hapus berkas ini kalau tabnya memang tidak
 * akan kembali.
 */
export function ApiSnippetPanel({ dataset }: { dataset: Dataset }) {
  const slug = dataset.slug ?? ''
  const contoh = [
    'import requests',
    '',
    'BASE = "https://api.erdigma.com"',
    `SLUG = "${slug}"`,
    '',
    'resp = requests.get(',
    '    f"{BASE}/api/v1/datasets/{SLUG}/datastore",',
    '    params={"page": 0, "size": 100},',
    '    headers={"Authorization": "Bearer <API_KEY>"},',
    ')',
    'rows = resp.json()["rows"]',
    'print(rows[:5])',
  ].join('\n')

  return (
    <div className="border-line-200 bg-surface rounded-[14px] border p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-ink-900 text-base font-bold">Contoh pemanggilan API</h3>
        <code className="bg-line-50 rounded-md px-2 py-1 font-mono text-[12.5px] font-semibold">
          {slug}
        </code>
      </div>

      <CodeBlock code={contoh} copyKey="api-contoh" />

      <div className="mt-4 flex flex-wrap gap-2.5">
        <Link to={paths.apiDocs}>
          <Button variant="tinted" size="sm">
            Dokumentasi lengkap
          </Button>
        </Link>
      </div>
    </div>
  )
}
