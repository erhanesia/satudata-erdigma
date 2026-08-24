import { AlertTriangle, CheckCircle2, FileUp, Loader2, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
import { paths } from '@/app/router/paths'
import { ApiError } from '@/shared/api/errors'
import { Reveal } from '@/shared/components/motion/Reveal'
import { Badge } from '@/shared/components/ui/Badge'
import { Button } from '@/shared/components/ui/Button'
import { Card, CardBody } from '@/shared/components/ui/Card'
import { Input } from '@/shared/components/ui/Input'
import { PageContainer, PageHeading } from '@/shared/components/ui/PageContainer'
import { useToast } from '@/shared/components/ui/toastStore'

import { useTopics, useUploadDataset } from '../hooks/useDatasets'

/**
 * Halaman penerbitan dataset — **versi internal untuk pengujian.**
 *
 * Desain sisi penerbit belum ada sama sekali, jadi tata letaknya sengaja
 * sederhana dan memakai komponen yang sudah dipakai halaman lain, bukan pola
 * baru. Begitu desainnya turun, yang perlu diganti hanya tampilan; kontrak ke
 * back-end sudah tetap.
 */

/**
 * Cerminan `SlugGenerator.slugify` di back-end, dipakai hanya untuk pratinjau.
 *
 * Server tetap yang berwenang: ia yang memeriksa ketersediaan dan menolak slug
 * bentrok. Fungsi ini ada supaya penerbit bisa melihat alamat yang akan
 * terbentuk sambil mengetik judul, bukan baru tahu setelah menekan Terbitkan.
 */
function slugify(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '')
}

export default function DatasetUploadPage() {
  const { data: user } = useCurrentUser()
  const topics = useTopics()
  const unggah = useUploadDataset()
  const toast = useToast()
  const navigate = useNavigate()

  const [file, setFile] = useState<File | null>(null)
  const [judul, setJudul] = useState('')
  const [slugManual, setSlugManual] = useState<string | null>(null)
  const [catatan, setCatatan] = useState('')
  const [disclaimer, setDisclaimer] = useState('')
  const [cakupan, setCakupan] = useState('')
  const [topikDipilih, setTopikDipilih] = useState<string[]>([])

  const slugOtomatis = useMemo(() => slugify(judul), [judul])

  const bolehTerbit = user?.role === 'ADMIN' || user?.role === 'PUBLISHER'
  const siap = Boolean(file) && judul.trim().length > 0 && !unggah.isPending

  function pilihTopik(nama: string) {
    setTopikDipilih((sebelum) =>
      sebelum.includes(nama) ? sebelum.filter((t) => t !== nama) : [...sebelum, nama],
    )
  }

  function kirim() {
    if (!file || !judul.trim()) return
    unggah.mutate(
      {
        file,
        body: {
          title: judul.trim(),
          // Hanya dikirim bila penerbit benar-benar menyuntingnya. Mengirim
          // hasil pratinjau akan membuat server memperlakukannya sebagai slug
          // pilihan manusia — yang ditolak saat bentrok alih-alih diberi angka.
          slug: slugManual?.trim() || undefined,
          notes: catatan.trim() || undefined,
          disclaimer: disclaimer.trim() || undefined,
          coverage: cakupan.trim() || undefined,
          topics: topikDipilih.length ? topikDipilih : undefined,
        },
      },
      {
        onSuccess: (dataset) => {
          toast.success(`Dataset "${dataset.title}" terbit.`)
          navigate(paths.datasetDetail(dataset.slug ?? ''))
        },
        onError: (error) =>
          toast.error(
            error instanceof ApiError ? error.message : 'Gagal menerbitkan dataset.',
          ),
      },
    )
  }

  if (!bolehTerbit) {
    return (
      <PageContainer className="py-10">
        <PageHeading title="Terbitkan Dataset" />
        <Card>
          <CardBody className="flex items-start gap-3 py-6">
            <AlertTriangle className="text-warning mt-0.5 size-5 shrink-0" />
            <div>
              <p className="text-ink-900 text-sm font-semibold">
                Peran Anda tidak berhak menerbitkan dataset.
              </p>
              <p className="text-ink-500 mt-1 text-[13px] leading-relaxed">
                Dibutuhkan peran ADMIN atau PUBLISHER. Peran mengikuti jenjang jabatan Anda di
                HRIS — hubungi administrator bila menurut Anda ini keliru.
              </p>
              <Link to={paths.datasets} className="text-primary mt-3 inline-block text-[13px] font-semibold">
                ← Kembali ke Datasets
              </Link>
            </div>
          </CardBody>
        </Card>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="py-10">
      <Reveal>
        <PageHeading
          title="Terbitkan Dataset"
          description={`Diterbitkan atas nama ${user?.division?.name ?? 'divisi Anda'}`}
        />
      </Reveal>

      <Reveal delay={70}>
        <Card>
          <CardBody className="flex flex-col gap-5 py-6">
            {/* Berkas */}
            <label className="border-line-200 hover:border-primary/50 flex cursor-pointer flex-col items-center gap-2 rounded-[12px] border border-dashed bg-[#FBFCFE] px-4 py-8 text-center transition-colors">
              <FileUp className="text-ink-400 size-7" />
              {file ? (
                <>
                  <span className="text-ink-900 text-sm font-semibold">{file.name}</span>
                  <span className="text-ink-400 text-[12.5px]">
                    {(file.size / 1024).toFixed(1)} KB — klik untuk mengganti
                  </span>
                </>
              ) : (
                <>
                  <span className="text-ink-900 text-sm font-semibold">Pilih berkas data</span>
                  {/* Label dibuat netral karena katalog mengenal lima format,
                      tapi keterangannya menyebut keadaan sebenarnya: baru CSV
                      yang bisa diproses server. Menjanjikan format yang akan
                      ditolak 400 hanya membuat orang mengira aplikasinya rusak. */}
                  <span className="text-ink-400 text-[12.5px]">
                    Maksimal 10 MB · saat ini baru <strong className="font-semibold">CSV</strong> yang
                    bisa diproses
                  </span>
                  <span className="text-ink-400 text-[12px]">
                    XLSX, GeoJSON, dan KML menyusul
                  </span>
                </>
              )}
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            {/* Judul — sengaja dibiarkan kosong, tanpa tebakan dari nama berkas.
                Kolom yang sudah terisi cenderung diterima begitu saja, dan
                "Furniture 10k FIXED" bukan judul yang pantas masuk katalog. */}
            <Kolom
              label="Judul dataset"
              wajib
              petunjuk="Contoh: Penjualan Furnitur Ritel 2025"
            >
              <Input
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Penjualan Furnitur Ritel 2025"
                maxLength={255}
              />
            </Kolom>

            {/* Slug */}
            <Kolom
              label="Alamat URL"
              petunjuk="Terisi sendiri dari judul. Ubah hanya bila ingin lebih pendek — setelah terbit tidak bisa diganti."
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-ink-400 font-mono text-[13px]">/datasets/</span>
                {slugManual === null ? (
                  <>
                    <code className="text-ink-900 font-mono text-[13px]">
                      {slugOtomatis || '—'}
                    </code>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!slugOtomatis}
                      onClick={() => setSlugManual(slugOtomatis)}
                    >
                      Ubah
                    </Button>
                  </>
                ) : (
                  <>
                    <Input
                      value={slugManual}
                      onChange={(e) => setSlugManual(e.target.value)}
                      className="max-w-[320px] font-mono"
                      maxLength={60}
                    />
                    <Button variant="secondary" size="sm" onClick={() => setSlugManual(null)}>
                      Ikuti judul
                    </Button>
                  </>
                )}
              </div>
            </Kolom>

            <Kolom label="Catatan" petunjuk="Penjelasan isi dataset dan cara membacanya.">
              <TextArea value={catatan} onChange={setCatatan} rows={3} />
            </Kolom>

            {/* Memakai kata serapannya apa adanya, bukan "Penyangkalan".
                Terjemahan harfiah itu berkonotasi menyangkal — padahal isi
                sungguhannya adalah hal yang harus diketahui agar angkanya
                dibaca benar. "Disclaimer" juga sama dengan nama kolom database
                dan field API, jadi tidak ada dua istilah untuk satu hal. */}
            <Kolom
              label="Disclaimer"
              petunjuk="Hal yang harus diketahui pembaca agar datanya tidak salah ditafsirkan — misalnya angka yang masih sementara, batas cakupan, atau dasar perhitungan."
            >
              <TextArea value={disclaimer} onChange={setDisclaimer} rows={2} />
            </Kolom>

            <Kolom label="Cakupan periode" petunjuk="Contoh: Jan - Des 2025">
              <Input
                value={cakupan}
                onChange={(e) => setCakupan(e.target.value)}
                placeholder="Jan - Des 2025"
              />
            </Kolom>

            <Kolom label="Topik" petunjuk="Boleh lebih dari satu, boleh dikosongkan.">
              <div className="flex flex-wrap gap-2">
                {(topics.data ?? []).map((t) => {
                  const aktif = topikDipilih.includes(t.name ?? '')
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pilihTopik(t.name ?? '')}
                      className={[
                        'rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                        aktif
                          ? 'border-primary bg-primary-tint text-primary'
                          : 'border-line-200 text-ink-600 hover:bg-surface-50',
                      ].join(' ')}
                    >
                      {t.name}
                    </button>
                  )
                })}
              </div>
            </Kolom>

            {/* Apa yang dihitung sendiri — ditulis terang supaya penerbit tidak
                mencari-cari kolom yang memang sengaja tidak ada. */}
            <div className="border-line-200 bg-surface-50 rounded-[10px] border p-3.5">
              <div className="text-ink-700 mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold">
                <CheckCircle2 className="text-success size-4" />
                Dihitung sendiri dari berkas Anda
              </div>
              <div className="text-ink-500 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px]">
                <span>Jumlah baris</span>
                <span>Jumlah kolom</span>
                <span>Ukuran berkas</span>
                <span>Nama &amp; tipe tiap kolom</span>
                <span>Format berkas</span>
                <span>Divisi penerbit</span>
              </div>
              <p className="text-ink-400 mt-2 text-[12px] leading-relaxed">
                Tipe kolom ditebak dari 200 nilai pertama dan sengaja konservatif — kolom yang
                meragukan dianggap teks. Periksa hasilnya di tab Kolom setelah terbit.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge tone="warning">Versi internal untuk pengujian</Badge>
              <Button disabled={!siap} onClick={kirim}>
                {unggah.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Upload className="size-4" />
                )}
                Terbitkan dataset
              </Button>
            </div>
          </CardBody>
        </Card>
      </Reveal>
    </PageContainer>
  )
}

function Kolom({
  label,
  petunjuk,
  wajib,
  children,
}: {
  label: string
  petunjuk?: string
  wajib?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-ink-700 mb-1.5 text-[13px] font-semibold">
        {label}
        {wajib ? <span className="text-danger ml-1">*</span> : null}
      </div>
      {children}
      {petunjuk ? <p className="text-ink-400 mt-1.5 text-[12px]">{petunjuk}</p> : null}
    </div>
  )
}

function TextArea({
  value,
  onChange,
  rows,
}: {
  value: string
  onChange: (v: string) => void
  rows: number
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      className="border-line-300 text-ink-900 placeholder:text-ink-400 focus:border-primary w-full resize-y rounded-[var(--radius-control)] border bg-white px-3 py-2 text-sm outline-none transition-colors"
    />
  )
}
