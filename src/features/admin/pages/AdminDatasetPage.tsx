import {
  AlertTriangle,
  Check,
  Database,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  ShieldQuestion,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { paths } from "@/app/router/paths";
import { useDatasets, useFormats } from "@/features/dataset/hooks/useDatasets";
import { useDivisions } from "@/features/division/hooks/useDivisions";
import { Reveal } from "@/shared/components/motion/Reveal";
import { Dialog } from "@/shared/components/ui/Dialog";
import { Pagination } from "@/shared/components/ui/Pagination";
import { formatBytes, formatNumber } from "@/shared/lib/format";
import type { AccessRule, DatasetLite } from "@/shared/types/api";

import { DatasetDrawer } from "../components/DatasetDrawer";
import { FormatBadge } from "../components/FormatBadge";
import { AccessRulePicker } from "../components/AccessRulePicker";
import { useJobLevels } from "../hooks/useAccessOptions";
import { useDatasetAdmin } from "../hooks/useDatasetAdmin";

/** Sesuai desain: tabel penuh satu halaman, bukan gulungan tanpa ujung. */
const PAGE_SIZE = 10;

/**
 * Daftar dataset di panel admin, mengikuti tabel pada `Panel Admin Satu Data`.
 *
 * Kolomnya sama dengan desain, termasuk kotak centang dan kolom akses.
 *
 * **Tentang kotak centangnya.** Sebelumnya sengaja tidak dibuat karena kedua
 * tindakan massal pada desain — ubah akses dan hapus — tidak punya endpoint,
 * dan kotak centang yang tidak menghasilkan apa-apa lebih buruk daripada tidak
 * ada. Endpoint-nya kini ada (`PATCH /{slug}/access-rules` dan
 * `DELETE /{slug}`), keduanya menulis jejak audit, jadi kotak centangnya
 * benar-benar bekerja.
 *
 * **Tentang kolom aksesnya.** Aturannya berlaku sungguhan: daftar, detail, isi
 * tabel, dan unduhan semuanya melewati {@code DatasetAccessGuard}. Baris "Semua
 * karyawan" berarti dataset itu tidak beraturan — keadaan bawaan katalog data
 * bersama, bukan pekerjaan yang belum selesai.
 *
 * Penyaring di atas tabel hanya menyaring jenjang jabatan, bukan ketiga jenis
 * aturan. Posisi dan karyawan disimpan sebagai UUID; menaruhnya di `<select>`
 * berarti memuat ratusan nama dari HRIS hanya untuk satu kotak penyaring yang
 * jarang dipakai. Jenjangnya cuma dua belas dan sudah berupa nama.
 */
export default function AdminDatasetPage() {
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("");
  const [format, setFormat] = useState("");
  const [jobLevel, setJobLevel] = useState("");
  const [page, setPage] = useState(0);

  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [dialog, setDialog] = useState<"hapus" | "akses" | null>(null);

  /*
    Hasil tindakan massal yang baru selesai, ditampilkan sebagai pop-up.

    Dulu ini cuma toast. Toast cocok untuk kabar yang boleh terlewat, dan
    menghapus lima dataset bukan kabar semacam itu: tindakannya tidak bisa
    dibatalkan, dan kalau sebagian gagal, daftar mana saja yang gagal justru
    yang paling perlu dibaca — sementara toast menghilang sendiri sebelum sempat
    dibaca sampai habis.
  */
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  /*
   * Penghapusan menuntut satu tindakan sadar sebelum tombolnya hidup.
   *
   * Tombol merah di ujung dialog terlalu dekat dengan tempat orang menekan
   * "Batal", dan menghapus dataset TIDAK bisa dibatalkan. Kotak centang ini
   * memaksa mata membaca akibatnya lebih dulu, dan memotong jalur satu-klik
   * yang selama ini bisa terpicu tanpa sengaja.
   */
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  // Direset tiap kali dialognya berganti, termasuk saat DIBUKA. Centang yang
  // tertinggal dari penghapusan sebelumnya membuat penjagaan ini sia-sia.
  useEffect(() => {
    setDeleteConfirmed(false);
  }, [dialog]);

  const divisions = useDivisions();
  const formats = useFormats();
  const jobLevels = useJobLevels();
  const { remove, updateAccessRules } = useDatasetAdmin();

  const datasets = useDatasets({
    search: search || undefined,
    divisions: division ? [division] : undefined,
    formats: format ? [format] : undefined,
    jobLevels: jobLevel ? [jobLevel] : undefined,
    sort: "created",
    page: page,
    size: PAGE_SIZE,
  });

  const hasFilter = Boolean(search || division || format || jobLevel);
  const rows = useMemo(() => datasets.data?.content ?? [], [datasets.data]);
  const totalPages = datasets.data?.totalPages ?? 0;

  // Mengganti filter harus mengembalikan ke halaman pertama. Tanpa ini,
  // menyaring saat sedang di halaman 5 menghasilkan tabel kosong yang terlihat
  // seperti "tidak ada hasil" padahal hasilnya ada di halaman 1.
  const resetPage = () => setPage(0);

  // Pilihan hanya berlaku untuk baris yang terlihat. Menyimpan pilihan lintas
  // halaman berarti seseorang bisa menekan Hapus untuk dataset yang tidak ada
  // di layarnya — persis jenis kejutan yang tidak boleh ada di tombol hapus.
  useEffect(() => {
    setSelected([]);
  }, [page, search, division, format, jobLevel]);

  const allChecked = rows.length > 0 && selected.length === rows.length;
  const busy = remove.isPending || updateAccessRules.isPending;

  // Aturan yang sedang berlaku pada dataset-dataset yang dicentang, dipakai
  // dialog untuk menyalakan pilihan awalnya. Aman diambil dari `rows` karena
  // pilihan selalu direset saat berpindah halaman — jadi setiap slug yang
  // tercentang pasti ada di halaman yang sedang tampil.
  const selectedRules = useMemo(
    () =>
      rows
        .filter((d) => selected.includes(d.slug ?? ""))
        .map((d) => (d.accessRules ?? []) as AccessRule[]),
    [rows, selected],
  );

  function toggleSelection(slug: string) {
    setSelected((previous) =>
      previous.includes(slug)
        ? previous.filter((s) => s !== slug)
        : [...previous, slug],
    );
  }

  function report(result: { total: number; failed: string[] }, verb: string) {
    setActionResult({ ...result, verb });
    setSelected([]);
    setDialog(null);
  }

  return (
    <div>
      <Reveal>
        {/*
          Di ponsel penyaringnya disusun grid dua kolom, bukan dibiarkan
          membungkus sendiri. `flex-wrap` menempatkan tiap anak sesuai sisa ruang
          baris sebelumnya, sehingga tiga pilihan dan tombol Reset jatuh dengan
          lebar yang berbeda-beda — dan tepinya tidak pernah lurus. Grid memberi
          setiap anak lebar yang sama, jadi susunannya bisa diramalkan tanpa
          mengunci lebar satu per satu.
        */}
        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
          <div className="relative col-span-2 sm:w-[300px] sm:min-w-[240px]">
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Cari judul atau slug"
              className="h-[52px] w-full rounded-lg border border-[#E9EBF0] bg-white pr-11 pl-[18px] text-[16px] text-[#2E3646] outline-none transition-colors focus:border-[#4F6BED] placeholder:text-[#9CA3AF]"
            />
            <Search className="pointer-events-none absolute top-1/2 right-4 size-[19px] -translate-y-1/2 text-[#2E3646]" />
          </div>

          <Select
            value={division}
            onChange={(v) => {
              setDivision(v);
              resetPage();
            }}
            all="Semua divisi"
          >
            {(divisions.data ?? []).map((d) => (
              <option key={d.id} value={d.code ?? ""}>
                {d.code}
              </option>
            ))}
          </Select>

          <Select
            value={format}
            onChange={(v) => {
              setFormat(v);
              resetPage();
            }}
            all="Semua jenis file"
          >
            {(formats.data ?? []).map((f) => (
              <option key={f.id} value={f.name ?? ""}>
                {f.name}
              </option>
            ))}
          </Select>

          <Select
            value={jobLevel}
            onChange={(v) => {
              setJobLevel(v);
              resetPage();
            }}
            all="Semua job level"
          >
            {(jobLevels.data ?? []).map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </Select>

          <button
            type="button"
            disabled={!hasFilter}
            onClick={() => {
              setSearch("");
              setDivision("");
              setFormat("");
              setJobLevel("");
              resetPage();
            }}
            className="flex h-[52px] items-center justify-center gap-2 rounded-lg border border-[#E9EBF0] bg-white px-4 text-[16px] font-semibold text-[#4B5563] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
          >
            <RotateCcw className="size-4" />
            Reset
          </button>

          <Link
            to={paths.adminDatasetNew}
            className="col-span-2 flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#22C55E] px-6 text-[16px] font-bold text-white transition-colors hover:bg-[#1BA851] sm:ml-auto sm:w-auto"
          >
            <Plus className="size-[18px]" />
            Tambah dataset
          </Link>
        </div>
      </Reveal>

      <Reveal delay={70}>
        <div className="overflow-hidden rounded-[14px] border border-[#E9EBF0] bg-white">
          {/*
            Bilah pilihan muncul menggeser turun, tidak menyentak masuk.

            Jumlah terpilih dibuat `w-full` di ponsel supaya berdiri sendiri di
            baris atas dan ketiga tombolnya rapat di bawahnya. Sebelumnya
            semuanya satu baris ber-flex-wrap, dan di layar sempit "Batal pilih"
            yang didorong `ml-auto` terlempar ke baris sendiri dengan celah
            kosong lebar di kirinya — terbaca seperti tata letak yang rusak,
            bukan disengaja.

            Memakai `w-full`, bukan membungkus tombolnya dalam div sendiri:
            pembungkus akan mengurung `ml-auto` di dalam dirinya, sehingga di
            layar lebar "Batal pilih" berhenti di tepi pembungkus alih-alih di
            tepi bilahnya.
          */}
          {selected.length > 0 ? (
            <div className="animate-tab-in flex flex-wrap items-center gap-3 border-b border-[#E9EBF0] bg-[#F7F9FF] px-4 py-3.5 sm:px-6">
              <span className="w-full text-[14.5px] font-semibold text-[#2E3646] sm:w-auto">
                {selected.length} dataset dipilih
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDialog("akses")}
                className="flex items-center gap-1.5 rounded-lg border border-[#E9EBF0] bg-white px-3.5 py-2 text-[13.5px] font-semibold text-[#4B5563] transition-colors hover:bg-[#F8FAFC] disabled:opacity-40"
              >
                <ShieldQuestion className="size-4" />
                Ubah akses
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDialog("hapus")}
                className="flex items-center gap-1.5 rounded-lg border border-[#FECDCA] bg-white px-3.5 py-2 text-[13.5px] font-semibold text-[#B4231B] transition-colors hover:bg-[#FEF3F2] disabled:opacity-40"
              >
                <Trash2 className="size-4" />
                Hapus
              </button>
              <button
                type="button"
                onClick={() => setSelected([])}
                className="text-[13.5px] font-semibold text-[#6B7280] hover:underline sm:ml-auto"
              >
                Batal pilih
              </button>
            </div>
          ) : null}

          {/*
            Satu transisi opacity, satu durasi, tanpa membongkar DOM.

            Tiga kekeliruan yang sudah dilewati di sini, semuanya menghasilkan
            gerak tersendat alih-alih halus:

            1. `key={dataUpdatedAt}` pada pembungkus. React membongkar lalu
               membangun kembali seluruh tabel, DAN animasinya mulai di frame
               yang sama — frame pertama gerakannya jatuh, jadi terlihat
               menyangkut. Persis pada pemakaian PERTAMA sebuah penyaring, saat
               datanya belum ada di cache; pada pemakaian berikutnya react-query
               menjawab dari cache, `dataUpdatedAt` tidak berubah, animasinya
               tidak jalan sama sekali — dan justru itu yang terasa mulus.
            2. Durasi yang berbeda untuk masuk dan keluar (`duration-150` lawan
               `duration-300`). Menukar kelas durasi di tengah transisi membuat
               peramban memulai ulang perhitungannya, dan itu terlihat sebagai
               patahan.
            3. Menunda tandanya 250 ms. Endpoint menjawab 30–50 ms, jadi
               tandanya tidak pernah muncul dan geraknya hilang seluruhnya.

            Sekarang: DOM-nya tetap, React hanya memperbarui isi sel, dan yang
            berubah cuma `opacity` — satu properti yang ditangani compositor
            tanpa menghitung ulang tata letak. Peredupannya langsung menyala
            saat pengambilan dimulai, jadi ada tanggapan seketika atas klik, dan
            kembali terang saat data tiba. Pembalikan arah di tengah jalan tetap
            mulus karena durasi dan easing-nya sama untuk kedua arah.
          */}
          {/*
            Di ponsel tabelnya diganti daftar kartu, bukan digulung menyamping.

            Tabelnya butuh 1120px untuk tujuh kolomnya. Di layar 390px yang
            terlihat cuma kolom pertama, dan enam kolom sisanya — termasuk akses
            dan jumlah unduhan — hanya bisa dicapai dengan menggeser mendatar
            sambil kehilangan judul barisnya. Gulungan mendatar di dalam halaman
            yang juga bergulung tegak adalah gerakan yang paling sering salah
            kena.

            Kartunya menyusun data yang sama secara menurun, jadi tidak ada yang
            hilang. Yang berbeda cuma urutan bacanya.
          */}
          <div
            className={[
              "transition-opacity duration-[220ms] ease-out md:hidden",
              datasets.isFetching && !datasets.isPending
                ? "opacity-40"
                : "opacity-100",
            ].join(" ")}
          >
            {datasets.isPending ? (
              <CardNote>Memuat…</CardNote>
            ) : rows.length === 0 ? (
              <CardNote>
                {hasFilter
                  ? "Tidak ada dataset yang cocok dengan filter ini."
                  : "Belum ada dataset. Tekan “Tambah dataset” untuk menerbitkan yang pertama."}
              </CardNote>
            ) : (
              <>
                {/*
                  "Pilih semua" perlu tempatnya sendiri di sini. Di tabel ia
                  menumpang kepala kolom, dan kepala kolom itulah yang hilang
                  begitu tampilannya berganti kartu — tanpa baris ini, tindakan
                  massal jadi mustahil dari ponsel.
                */}
                <label className="flex items-center gap-3 border-b border-[#F1F3F7] bg-[#FCFDFF] px-4 py-3">
                  <CheckBox
                    checked={allChecked}
                    onChange={() =>
                      setSelected(allChecked ? [] : rows.map((d) => d.slug ?? ""))
                    }
                    label="Pilih semua baris di halaman ini"
                  />
                  <span className="text-[13.5px] font-semibold text-[#6B7280]">
                    Pilih semua di halaman ini
                  </span>
                </label>

                {rows.map((d) => {
                const slug = d.slug ?? "";
                const isChecked = selected.includes(slug);
                return (
                  <div
                    key={d.id}
                    onClick={() => setOpenSlug(slug || null)}
                    className={[
                      "flex cursor-pointer gap-3 border-b border-[#F1F3F7] px-4 py-4 transition-colors",
                      isChecked ? "bg-[#F7F9FF]" : "active:bg-[#F8FAFC]",
                    ].join(" ")}
                  >
                    <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                      <CheckBox
                        checked={isChecked}
                        onChange={() => toggleSelection(slug)}
                        label={`Pilih ${d.title ?? slug}`}
                      />
                    </div>

                    {/* min-w-0 supaya judul panjang memotong diri, bukan
                        melebarkan kartunya sampai halamannya bergulung. */}
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] leading-snug font-semibold text-[#2E3646]">
                        {d.title}
                      </div>
                      <div className="mt-0.5 truncate font-mono text-[12px] text-[#9CA3AF]">
                        {slug}
                      </div>

                      <div className="mt-2.5">
                        <FilesCell dataset={d} />
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[#F1F3F7] pt-3">
                        <CardField label="Diunggah oleh">
                          {d.uploadedBy?.name ?? "—"}
                          {d.division?.code ? (
                            <span className="text-[#9CA3AF]">
                              {" · "}
                              {d.division.code}
                            </span>
                          ) : null}
                        </CardField>
                        <CardField label="Diunggah">
                          {shortDate(d.createdAt)}
                        </CardField>
                        <CardField label="Akses">
                          <AccessCell
                            rules={(d.accessRules ?? []) as AccessRule[]}
                          />
                        </CardField>
                        <CardField label="Download">
                          {formatNumber(d.downloads ?? 0)}
                        </CardField>
                      </dl>
                    </div>
                  </div>
                );
                })}
              </>
            )}
          </div>

          <div
            className={[
              "hidden overflow-x-auto transition-opacity duration-[220ms] ease-out md:block",
              datasets.isFetching && !datasets.isPending
                ? "opacity-40"
                : "opacity-100",
            ].join(" ")}
          >
            <table className="w-full min-w-[1120px] border-collapse">
              <thead>
                <tr>
                  <th className="w-[56px] border-b border-[#E9EBF0] py-6 pr-0 pl-6">
                    <CheckBox
                      checked={allChecked}
                      onChange={() =>
                        setSelected(
                          allChecked ? [] : rows.map((d) => d.slug ?? ""),
                        )
                      }
                      label="Pilih semua baris di halaman ini"
                    />
                  </th>
                  <HeadCell>Judul</HeadCell>
                  <HeadCell>File</HeadCell>
                  <HeadCell>Diunggah oleh</HeadCell>
                  <HeadCell>
                    <span className="flex items-center gap-2">Akses</span>
                  </HeadCell>
                  <HeadCell>Diunggah</HeadCell>
                  <HeadCell>Download</HeadCell>
                </tr>
              </thead>
              <tbody>
                {datasets.isPending ? (
                  <Message>Memuat…</Message>
                ) : rows.length === 0 ? (
                  <Message>
                    {hasFilter
                      ? "Tidak ada dataset yang cocok dengan filter ini."
                      : "Belum ada dataset. Tekan “Tambah dataset” untuk menerbitkan yang pertama."}
                  </Message>
                ) : (
                  rows.map((d) => {
                    const slug = d.slug ?? "";
                    const isChecked = selected.includes(slug);
                    return (
                      <tr
                        key={d.id}
                        onClick={() => setOpenSlug(slug || null)}
                        className={[
                          "cursor-pointer transition-colors",
                          isChecked ? "bg-[#F7F9FF]" : "hover:bg-[#F8FAFC]",
                        ].join(" ")}
                      >
                        {/* Kotak centang menghentikan klik supaya tidak ikut
                            membuka panel detail. */}
                        <td
                          className="border-b border-[#F1F3F7] py-6 pr-0 pl-6"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CheckBox
                            checked={isChecked}
                            onChange={() => toggleSelection(slug)}
                            label={`Pilih ${d.title ?? slug}`}
                          />
                        </td>

                        <td className="border-b border-[#F1F3F7] p-6">
                          <div className="text-[15.5px] font-semibold text-[#2E3646]">
                            {d.title}
                          </div>
                          <div className="mt-1 font-mono text-[12.5px] text-[#9CA3AF]">
                            {slug}
                          </div>
                        </td>

                        <td className="border-b border-[#F1F3F7] p-6">
                          <FilesCell dataset={d} />
                        </td>

                        <td className="border-b border-[#F1F3F7] p-6">
                          {d.uploadedBy ? (
                            <>
                              <div className="text-[14.5px] font-semibold text-[#3C4A56]">
                                {d.uploadedBy.name}
                              </div>
                              <div className="mt-0.5 text-[12.5px] text-[#9CA3AF]">
                                {d.division?.code ?? "—"}
                              </div>
                            </>
                          ) : (
                            <span className="text-[14.5px] text-[#9CA3AF]">
                              —
                            </span>
                          )}
                        </td>

                        <td className="border-b border-[#F1F3F7] p-6">
                          <AccessCell
                            rules={(d.accessRules ?? []) as AccessRule[]}
                          />
                        </td>

                        <td className="border-b border-[#F1F3F7] p-6 text-[14.5px] whitespace-nowrap text-[#4B5563]">
                          {shortDate(d.createdAt)}
                        </td>

                        <td className="border-b border-[#F1F3F7] p-6 text-[14.5px] text-[#4B5563]">
                          {formatNumber(d.downloads ?? 0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {rows.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E9EBF0] px-4 py-4 sm:px-6">
              <span className="flex items-center gap-2 text-[13.5px] text-[#6B7280]">
                <Database className="size-4" />
                {formatNumber(datasets.data?.totalElements ?? 0)} dataset
                {totalPages > 1
                  ? ` · halaman ${page + 1} dari ${totalPages}`
                  : null}
              </span>

              <Pagination
                page={page + 1}
                totalPages={totalPages}
                onPageChange={(p) => setPage(p - 1)}
                labels
              />
            </div>
          ) : null}
        </div>
      </Reveal>

      <DatasetDrawer slug={openSlug} onClose={() => setOpenSlug(null)} />

      <Dialog
        open={dialog === "hapus"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Hapus ${selected.length} dataset?`}
        description="Dataset hilang dari katalog dan tidak bisa dibuka lagi. Slug-nya tidak dilepas, jadi tautan lama tidak akan menunjuk ke dataset lain."
      >
        <ul className="max-h-52 overflow-y-auto rounded-[10px] bg-[#F8FAFC] p-3.5 font-mono text-[13px] text-[#4B5563]">
          {selected.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-[#F5D2CF] bg-[#FEF3F2] px-3.5 py-3">
          <input
            type="checkbox"
            checked={deleteConfirmed}
            onChange={(e) => setDeleteConfirmed(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[#B4231B]"
          />
          <span className="text-[13.5px] leading-relaxed text-[#8A1F18]">
            Apakah anda yakin ingin menghapus dataset ini?
          </span>
        </label>

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setDialog(null)}
            className="rounded-lg border border-[#E9EBF0] px-4 py-2.5 text-[14px] font-semibold text-[#4B5563] transition-colors hover:bg-[#F8FAFC]"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={remove.isPending || !deleteConfirmed}
            onClick={() =>
              remove.mutate(selected, {
                onSuccess: (h) => report(h, "dihapus"),
              })
            }
            className="flex items-center gap-2 rounded-lg bg-[#B4231B] px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#961D16] disabled:opacity-60"
          >
            {remove.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Hapus
          </button>
        </div>
      </Dialog>

      <AccessRuleDialog
        open={dialog === "akses"}
        count={selected.length}
        currentRules={selectedRules}
        busy={updateAccessRules.isPending}
        onClose={() => setDialog(null)}
        onSave={(rules) =>
          updateAccessRules.mutate(
            { slugs: selected, accessRules: rules },
            { onSuccess: (h) => report(h, "diperbarui") },
          )
        }
      />

      <ActionResultDialog
        result={actionResult}
        onClose={() => setActionResult(null)}
      />
    </div>
  );
}

/** Hasil satu tindakan massal, dipakai pop-up di bawah. */
interface ActionResult {
  total: number;
  failed: string[];
  /** Kata kerja yang sudah dilakukan, mis. "dihapus" atau "diperbarui". */
  verb: string;
}

/**
 * Pop-up hasil setelah menghapus atau mengubah akses banyak dataset.
 *
 * <h2>Kenapa pop-up, bukan toast</h2>
 *
 * Toast cocok untuk kabar yang boleh terlewat. Menghapus lima dataset bukan
 * kabar semacam itu: tindakannya tidak bisa dibatalkan, dan ketika sebagian
 * gagal, daftar slug mana saja yang gagal justru bagian yang paling perlu
 * dibaca — sementara toast menghilang sendiri sebelum sempat dibaca sampai
 * habis, apalagi dicatat.
 *
 * Bentuknya sengaja dibuat sekeluarga dengan pop-up setelah unggah, supaya
 * ketiga tindakan yang mengubah katalog — terbit, hapus, ubah akses — berakhir
 * dengan cara yang sama dan sama-sama minta ditutup dengan sadar.
 *
 * <h2>Sebagian gagal bukan kegagalan, dan bukan keberhasilan</h2>
 *
 * Tindakan massal berjalan satu per satu, jadi hasilnya bisa campur. Menyebutnya
 * "berhasil" menyembunyikan yang gagal; menyebutnya "gagal" membuat orang
 * mengulang seluruhnya padahal sebagian sudah benar-benar terjadi. Karena itu
 * ada keadaan ketiga, dengan angkanya disebut apa adanya.
 */
function ActionResultDialog({
  result,
  onClose,
}: {
  result: ActionResult | null;
  onClose: () => void;
}) {
  const total = result?.total ?? 0;
  const failed = result?.failed ?? [];
  const succeeded = total - failed.length;
  const partial = failed.length > 0;

  return (
    <Dialog
      open={result !== null}
      onOpenChange={(next) => !next && onClose()}
      title={
        partial
          ? `Sebagian dataset gagal ${result?.verb ?? ""}`
          : `${succeeded} dataset ${result?.verb ?? ""}`
      }
      description={
        partial
          ? "Yang berhasil sudah berlaku dan tidak perlu diulang."
          : "Perubahannya sudah berlaku di katalog."
      }
    >
      <div
        className={[
          "flex items-center gap-3.5 rounded-[10px] border px-4 py-3.5",
          partial
            ? "border-[#F0D9A8] bg-[#FFFBF2]"
            : "border-[#CDE9D8] bg-[#F2FBF6]",
        ].join(" ")}
      >
        <span
          className={[
            "flex size-10 shrink-0 items-center justify-center rounded-full",
            partial ? "bg-[#FDF0D5]" : "bg-[#DCF3E6]",
          ].join(" ")}
        >
          {partial ? (
            <AlertTriangle className="size-5 text-[#B45309]" strokeWidth={2.6} />
          ) : (
            <Check className="size-5 text-[#137A46]" strokeWidth={3} />
          )}
        </span>
        <div
          className={[
            "min-w-0 text-[13.5px] leading-relaxed",
            partial ? "text-[#B45309]" : "text-[#137A46]",
          ].join(" ")}
        >
          {partial
            ? `${succeeded} dari ${total} dataset berhasil ${result?.verb ?? ""}.`
            : `Seluruhnya berhasil ${result?.verb ?? ""}.`}
        </div>
      </div>

      {partial ? (
        <div className="mt-4 rounded-[10px] bg-[#F8FAFC] px-3.5 py-3">
          <div className="text-[12.5px] font-bold text-[#6B7280]">
            {failed.length} yang gagal
          </div>
          {/*
            Slug-nya disebut satu per satu, bukan diringkas jadi angka. Ini
            satu-satunya tempat orang bisa tahu dataset mana yang perlu diulang;
            tanpa daftarnya, satu-satunya jalan adalah mencocokkan tabel baris
            demi baris.
          */}
          <ul className="mt-1.5 max-h-[132px] space-y-1 overflow-y-auto">
            {failed.map((slug) => (
              <li key={slug} className="font-mono text-[12.5px] text-[#3C4A56]">
                {slug}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-[#1F2A37] px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#111A24]"
        >
          Mengerti
        </button>
      </div>
    </Dialog>
  );
}

/**
 * Dialog ganti aturan "siapa boleh melihat" untuk banyak dataset sekaligus.
 *
 * **Pilihan awalnya menyala sesuai keadaan sekarang.** Ini bukan kenyamanan
 * tambahan melainkan syarat supaya dialognya aman: daftar yang dikirim
 * MENGGANTI, bukan menambah. Kalau dibuka dalam keadaan kosong, orang yang
 * sekadar ingin menambah satu aturan akan menekan Simpan dan diam-diam
 * membuka dataset itu untuk seluruh karyawan.
 *
 * **Saat banyak dataset dipilih**, aturan mereka bisa berbeda-beda. Yang
 * dinyalakan hanya IRISANNYA — aturan yang dipunyai semuanya. Aturan yang cuma
 * dipunyai sebagian disebutkan di peringatan bawah, karena menyimpan berarti
 * melepasnya dari dataset yang tadinya punya, dan itu keputusan yang harus
 * diambil sadar, bukan efek samping.
 *
 * Berbeda dari versi sebelumnya, pilihannya tidak lagi bisa menampilkan keadaan
 * "sebagian" per lencana: pemilihnya kini dipakai bersama halaman unggah, dan
 * menambahkan keadaan ketiga ke sana hanya demi dialog ini membuat komponen yang
 * sama berperilaku beda di dua tempat. Peringatan tertulis mengerjakan tugas yang
 * sama tanpa membebani pemilihnya.
 */
function AccessRuleDialog({
  open,
  count,
  currentRules,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  count: number;
  /** Aturan yang berlaku pada tiap dataset terpilih — satu larik per dataset. */
  currentRules: AccessRule[][];
  busy: boolean;
  onClose: () => void;
  onSave: (rules: AccessRule[]) => void;
}) {
  const [chosen, setChosen] = useState<AccessRule[]>([]);

  // Dimiliki SEMUA dataset terpilih (irisan) versus hanya sebagian.
  const { shared, partial } = useMemo(() => {
    if (currentRules.length === 0)
      return { shared: [] as AccessRule[], partial: [] as AccessRule[] };

    const byKey = new Map<string, AccessRule>();
    currentRules.flat().forEach((rule) => byKey.set(ruleKey(rule), rule));

    const shared: AccessRule[] = [];
    const partial: AccessRule[] = [];
    byKey.forEach((rule, key) => {
      const owned = currentRules.every((rules) =>
        rules.some((r) => ruleKey(r) === key),
      );
      (owned ? shared : partial).push(rule);
    });
    return { shared, partial };
  }, [currentRules]);

  // Disetel ulang setiap kali dibuka, bukan sekali saja: pilihan barisnya bisa
  // berubah di antara dua kali membuka dialog yang sama.
  useEffect(() => {
    if (open) setChosen(shared);
    // `shared` sengaja tidak jadi dependensi — nilainya ikut berubah saat
    // pengguna sedang menyunting, dan itu akan membatalkan suntingannya.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const chosenKeys = new Set(chosen.map(ruleKey));
  const dropped = partial.filter((rule) => !chosenKeys.has(ruleKey(rule)));
  const changed =
    chosen.length !== shared.length ||
    shared.some((rule) => !chosenKeys.has(ruleKey(rule))) ||
    partial.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Ubah akses ${count} dataset`}
      description="Daftar ini MENGGANTI aturan yang sudah ada, bukan menambah. Yang berlaku pada semuanya sudah dinyalakan di bawah."
    >
      {/* Pemilihnya sudah mengunci tingginya sendiri, jadi dialognya tidak
          perlu wadah bergulung lagi di luar. */}
      <AccessRulePicker value={chosen} onChange={setChosen} disabled={busy} />

      {/*
        Ringkasan hasil akhir. Dialog yang MENGGANTI harus menyatakan apa yang
        akan berlaku setelah ditekan, bukan membiarkan orang menyimpulkannya
        dari deretan lencana.
      */}
      <p className="mt-4 rounded-[8px] bg-[#F8FAFC] px-3.5 py-2.5 text-[13px] leading-relaxed text-[#4B5563]">
        Setelah disimpan, {count === 1 ? "dataset ini" : `${count} dataset ini`}{" "}
        {chosen.length === 0 ? (
          <strong className="font-semibold text-[#B4231B]">
            terbuka untuk seluruh karyawan
          </strong>
        ) : (
          <>
            dibatasi oleh{" "}
            <strong className="font-semibold text-[#2E3646]">
              {chosen.length} aturan
            </strong>
          </>
        )}
        .
        {dropped.length > 0 ? (
          <span className="mt-1 block text-[#B45309]">
            {dropped.length} aturan yang kini hanya dipunyai sebagian dataset
            akan dilepas dari semuanya.
          </span>
        ) : null}
      </p>

      <p className="mt-2.5 rounded-[8px] border border-[#CDE9D8] bg-[#F2FBF6] px-3 py-2 text-[12.5px] leading-relaxed text-[#137A46]">
        <strong className="font-semibold">
          Perubahan ini berlaku seketika.
        </strong>{" "}
        Karyawan di luar aturan yang Anda pilih langsung kehilangan akses
        membuka, membaca, dan mengunduh dataset tersebut. Admin portal dan
        pengunggahnya sendiri tidak terpengaruh.
      </p>

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#E9EBF0] px-4 py-2.5 text-[14px] font-semibold text-[#4B5563] transition-colors hover:bg-[#F8FAFC]"
        >
          Batal
        </button>
        {/*
          Simpan dimatikan kalau tidak ada yang berubah. Menekan tombol lalu
          mendapat "1 dataset diperbarui" padahal tidak ada yang bergeser
          membuat orang ragu apakah tindakannya benar-benar tersimpan — dan
          tetap meninggalkan baris UPDATE di log audit untuk perubahan kosong.
        */}
        <button
          type="button"
          disabled={busy || !changed}
          onClick={() => onSave(chosen)}
          className="flex items-center gap-2 rounded-lg bg-[#2E3646] px-4 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-[#1F2A37] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Simpan
        </button>
      </div>
    </Dialog>
  );
}

/** Kunci pembanding: jenis dan nilai harus cocok berpasangan, bukan salah satunya. */
function ruleKey(rule: AccessRule): string {
  return `${rule.ruleType}:${rule.ruleValue}`;
}

/** Lencana jenis berkas plus rangkuman "2 file · 420 KB + 96 KB", seperti desain. */
function FilesCell({ dataset }: { dataset: DatasetLite }) {
  const files = dataset.resources ?? [];

  if (files.length === 0) {
    return (
      <span className="text-[14.5px] text-[#9CA3AF]">
        {dataset.realtime ? "Realtime · tanpa berkas" : "—"}
      </span>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {files.map((r) => (
          <FormatBadge key={r.id} ext={r.formatName ?? ""} />
        ))}
      </div>
      <div className="mt-1.5 text-[12.5px] text-[#9CA3AF]">
        {files.length} file ·{" "}
        {files.map((r) => formatBytes(r.sizeBytes)).join(" + ")}
      </div>
    </div>
  );
}

/**
 * "3 pembatasan" dengan rinciannya per jenis.
 *
 * Yang ditampilkan JUMLAH, bukan nama. Aturan POSITION dan EMPLOYEE disimpan
 * sebagai UUID, dan menerjemahkannya jadi nama berarti satu panggilan HRIS per
 * baris — lima puluh panggilan untuk satu halaman tabel yang isinya bukan
 * tentang posisi. Nama lengkapnya ada di panel detail, tempat orang memang
 * sedang menengok satu dataset.
 *
 * Jumlah juga kebetulan yang paling sering ingin diketahui dari kolom ini:
 * seberapa sempit aksesnya, bukan siapa persisnya.
 */
function AccessCell({ rules }: { rules: AccessRule[] }) {
  if (rules.length === 0) {
    // Bukan "belum diatur" — tanpa aturan memang berarti terbuka, dan itu
    // keadaan bawaan yang sah untuk katalog data bersama. Menyebutnya "belum"
    // membuat setiap baris terbaca seperti pekerjaan yang belum selesai.
    return <span className="text-[14.5px] text-[#9CA3AF]">Semua karyawan</span>;
  }

  const perType = [
    {
      label: "jenjang",
      total: rules.filter((r) => r.ruleType === "JOB_LEVEL").length,
    },
    {
      label: "posisi",
      total: rules.filter((r) => r.ruleType === "POSITION").length,
    },
    {
      label: "karyawan",
      total: rules.filter((r) => r.ruleType === "EMPLOYEE").length,
    },
  ].filter((entry) => entry.total > 0);

  return (
    <>
      <div className="text-[14.5px] font-semibold text-[#3C4A56]">
        {rules.length} pembatasan
      </div>
      <div className="mt-0.5 text-[12.5px] text-[#9CA3AF]">
        {perType.map((entry) => `${entry.total} ${entry.label}`).join(" · ")}
      </div>
    </>
  );
}

/**
 * Kotak centang sesuai desain: 19px, sudut 5px, biru saat aktif.
 *
 * Memakai `<input type="checkbox">` sungguhan yang disembunyikan secara visual,
 * bukan `<div>` ber-onClick. Pembaca layar dan navigasi papan ketik ikut bekerja
 * tanpa perlu menirukan peran, keadaan, dan penanganan spasi satu per satu.
 */
function CheckBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        className="peer sr-only"
      />
      <span className="flex size-[19px] items-center justify-center rounded-[5px] border-[1.5px] border-[#CBD2DC] bg-white text-[12.5px] font-extrabold text-transparent transition-colors peer-checked:border-[#4F6BED] peer-checked:bg-[#4F6BED] peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-[#4F6BED]/40">
        ✓
      </span>
    </label>
  );
}

/**
 * "13 Jul 2026 08:12" — mengikuti desain.
 *
 * Sengaja tanpa "WIB", tidak seperti `formatDateTime` yang dipakai di halaman
 * Log. Di tabel serapat ini zona waktunya sama untuk setiap baris, jadi
 * mengulanginya tiga puluh kali hanya memakan lebar tanpa menambah keterangan.
 */
function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const take = (kind: string) =>
    parts.find((b) => b.type === kind)?.value ?? "";
  return `${take("day")} ${take("month")} ${take("year")} ${take("hour")}:${take("minute")}`;
}

function HeadCell({ children }: { children: ReactNode }) {
  return (
    <th className="border-b border-[#E9EBF0] p-6 text-left text-[16px] font-medium text-[#6B7280]">
      {children}
    </th>
  );
}

function Select({
  value,
  onChange,
  all,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  all: string;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-[52px] rounded-lg border border-[#E9EBF0] bg-white px-3.5 text-[16px] text-[#4B5563] outline-none transition-colors focus:border-[#4F6BED]"
    >
      <option value="">{all}</option>
      {children}
    </select>
  );
}

/**
 * Satu baris keterangan pada daftar kartu — padanan {@link Message} milik tabel.
 *
 * Dibuat terpisah karena `Message` mengembalikan `<tr><td colSpan={7}>`, dan
 * elemen itu tidak sah di luar tabel. Peramban akan membuangnya diam-diam, dan
 * keadaan "Memuat…" maupun "Belum ada dataset" hilang sama sekali di ponsel.
 */
function CardNote({ children }: { children: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center text-[14.5px] text-[#9CA3AF]">
      {children}
    </div>
  );
}

/**
 * Sepasang label dan nilai di dalam kartu.
 *
 * Labelnya perlu ada karena kartu kehilangan kepala kolom yang di tabel
 * menjelaskan arti tiap angka. Tanpa itu "12" dan "3 pembatasan" berdiri tanpa
 * keterangan, dan pembacanya harus menebak.
 */
function CardField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-semibold tracking-wide text-[#9CA3AF] uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-[13.5px] text-[#3C4A56]">{children}</dd>
    </div>
  );
}

function Message({ children }: { children: ReactNode }) {
  return (
    <tr>
      <td
        colSpan={7}
        className="p-8 text-center text-[14.5px] text-[#9CA3AF] sm:p-12"
      >
        {children}
      </td>
    </tr>
  );
}
