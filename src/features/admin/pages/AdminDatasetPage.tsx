import {
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
import { useToast } from "@/shared/components/ui/toastStore";
import { formatBytes, formatNumber } from "@/shared/lib/format";
import type { DatasetLite } from "@/shared/types/api";

import { DatasetDrawer } from "../components/DatasetDrawer";
import { FormatBadge } from "../components/FormatBadge";
import { useDatasetAdmin } from "../hooks/useDatasetAdmin";
import { usePositions } from "../hooks/usePositions";

/** Sesuai desain: tabel penuh satu halaman, bukan gulungan tanpa ujung. */
const PAGE_SIZE = 10;

/**
 * Daftar dataset di panel admin, mengikuti tabel pada `Panel Admin Satu Data`.
 *
 * Kolomnya sama dengan desain, termasuk kotak centang dan "Akses posisi".
 *
 * **Tentang kotak centangnya.** Sebelumnya sengaja tidak dibuat karena kedua
 * tindakan massal pada desain — ubah akses posisi dan hapus — tidak punya
 * endpoint, dan kotak centang yang tidak menghasilkan apa-apa lebih buruk
 * daripada tidak ada. Endpoint-nya kini ada (`PATCH /{slug}/positions` dan
 * `DELETE /{slug}`), keduanya menulis jejak audit, jadi kotak centangnya
 * benar-benar bekerja.
 *
 * **Tentang "Akses posisi".** Tag-nya berlaku sungguhan sejak changeset 00032:
 * daftar, detail, isi tabel, dan unduhan semuanya melewati
 * {@code DatasetAccessGuard}. Baris "Semua karyawan" berarti dataset itu tidak
 * bertag — keadaan bawaan katalog data bersama, bukan pekerjaan yang belum
 * selesai.
 */
export default function AdminDatasetPage() {
  const [search, setSearch] = useState("");
  const [division, setDivision] = useState("");
  const [format, setFormat] = useState("");
  const [position, setPosition] = useState("");
  const [page, setPage] = useState(0);

  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [dialog, setDialog] = useState<"hapus" | "posisi" | null>(null);

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
  const positions = usePositions();
  const { remove, updatePositions } = useDatasetAdmin();
  const toast = useToast();

  const datasets = useDatasets({
    search: search || undefined,
    divisions: division ? [division] : undefined,
    formats: format ? [format] : undefined,
    positions: position ? [position] : undefined,
    sort: "created",
    page: page,
    size: PAGE_SIZE,
  });

  const hasFilter = Boolean(search || division || format || position);
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
  }, [page, search, division, format, position]);

  const allChecked = rows.length > 0 && selected.length === rows.length;
  const busy = remove.isPending || updatePositions.isPending;

  // Tag yang sedang berlaku pada dataset-dataset yang dicentang, dipakai dialog
  // untuk menyalakan pilihan awalnya. Aman diambil dari `baris` karena pilihan
  // selalu direset saat berpindah halaman — jadi setiap slug yang tercentang
  // pasti ada di halaman yang sedang tampil.
  const selectedTags = useMemo(
    () =>
      rows
        .filter((d) => selected.includes(d.slug ?? ""))
        .map((d) => d.positions ?? []),
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
    const succeeded = result.total - result.failed.length;
    if (result.failed.length === 0) {
      toast.success(`${succeeded} dataset ${verb}.`);
    } else {
      // Angkanya disebut apa adanya. "Sebagian gagal" tanpa jumlah memaksa
      // orang menebak-nebak apa yang sebenarnya terjadi pada datanya.
      toast.error(
        `${succeeded} dari ${result.total} dataset ${verb}. Gagal: ${result.failed.join(", ")}.`,
      );
    }
    setSelected([]);
    setDialog(null);
  }

  return (
    <div>
      <Reveal>
        <div className="mb-5 flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-[300px] sm:min-w-[240px]">
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
            value={position}
            onChange={(v) => {
              setPosition(v);
              resetPage();
            }}
            all="Semua posisi"
          >
            {(positions.data ?? []).map((p) => (
              <option key={p} value={p}>
                {p}
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
              setPosition("");
              resetPage();
            }}
            className="flex h-[52px] items-center gap-2 rounded-lg border border-[#E9EBF0] bg-white px-4 text-[16px] font-semibold text-[#4B5563] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
          >
            <RotateCcw className="size-4" />
            Reset
          </button>

          <Link
            to={paths.adminDatasetNew}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-[#22C55E] px-6 text-[16px] font-bold text-white transition-colors hover:bg-[#1BA851] sm:ml-auto sm:w-auto"
          >
            <Plus className="size-[18px]" />
            Tambah dataset
          </Link>
        </div>
      </Reveal>

      <Reveal delay={70}>
        <div className="overflow-hidden rounded-[14px] border border-[#E9EBF0] bg-white">
          {/* Bilah pilihan muncul menggeser turun, tidak menyentak masuk. */}
          {selected.length > 0 ? (
            <div className="animate-tab-in flex flex-wrap items-center gap-3 border-b border-[#E9EBF0] bg-[#F7F9FF] px-4 py-3.5 sm:px-6">
              <span className="text-[14.5px] font-semibold text-[#2E3646]">
                {selected.length} dataset dipilih
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => setDialog("posisi")}
                className="flex items-center gap-1.5 rounded-lg border border-[#E9EBF0] bg-white px-3.5 py-2 text-[13.5px] font-semibold text-[#4B5563] transition-colors hover:bg-[#F8FAFC] disabled:opacity-40"
              >
                <ShieldQuestion className="size-4" />
                Ubah akses posisi
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
                className="ml-auto text-[13.5px] font-semibold text-[#6B7280] hover:underline"
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
          <div
            className={[
              "overflow-x-auto transition-opacity duration-[220ms] ease-out",
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
                    <span className="flex items-center gap-2">
                      Akses posisi
                    </span>
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
                          <PositionsCell positions={d.positions ?? []} />
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

      <PositionDialog
        open={dialog === "posisi"}
        count={selected.length}
        options={positions.data ?? []}
        tagSaatIni={selectedTags}
        busy={updatePositions.isPending}
        onClose={() => setDialog(null)}
        onSave={(pos) =>
          updatePositions.mutate(
            { slugs: selected, positions: pos },
            { onSuccess: (h) => report(h, "diperbarui") },
          )
        }
      />
    </div>
  );
}

/**
 * Dialog ganti tag posisi.
 *
 * **Pilihan awalnya menyala sesuai keadaan sekarang.** Ini bukan kenyamanan
 * tambahan melainkan syarat supaya dialognya aman: daftar yang dikirim
 * MENGGANTI, bukan menambah. Kalau dibuka dalam keadaan kosong, orang yang
 * sekadar ingin menambah satu posisi akan menekan Simpan dan diam-diam
 * menghapus semua tag yang sudah ada.
 *
 * **Saat banyak dataset dipilih**, tag mereka bisa berbeda-beda, jadi ada tiga
 * keadaan:
 *
 * - **menyala** — SEMUA dataset terpilih punya tag itu
 * - **sebagian** — hanya sebagian yang punya; ditandai khusus dan TIDAK ikut
 *   tersimpan sampai ditekan
 * - **mati** — tidak ada yang punya
 *
 * Keadaan "sebagian" tidak bisa dipeluk begitu saja: menyimpan berarti
 * menyeragamkan, dan menyeragamkan diam-diam ke salah satu arah adalah
 * keputusan yang seharusnya diambil manusia. Karena itu ada baris ringkasan di
 * bawah yang menyebutkan hasil akhirnya apa adanya sebelum tombol Simpan
 * ditekan.
 */
function PositionDialog({
  open,
  count,
  options,
  tagSaatIni,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  count: number;
  options: string[];
  /** Tag yang berlaku pada tiap dataset terpilih — satu larik per dataset. */
  tagSaatIni: string[][];
  busy: boolean;
  onClose: () => void;
  onSave: (positions: string[]) => void;
}) {
  const [chosen, setChosen] = useState<string[]>([]);

  // Dimiliki SEMUA dataset terpilih (irisan) versus hanya sebagian (gabungan
  // dikurangi irisan).
  const { all, partial } = useMemo(() => {
    if (tagSaatIni.length === 0)
      return { all: [] as string[], partial: [] as string[] };
    const combined = [...new Set(tagSaatIni.flat())];
    const intersection = combined.filter((p) =>
      tagSaatIni.every((tag) => tag.includes(p)),
    );
    return {
      all: intersection,
      partial: combined.filter((p) => !intersection.includes(p)),
    };
  }, [tagSaatIni]);

  // Disetel ulang setiap kali dibuka, bukan sekali saja: pilihan barisnya bisa
  // berubah di antara dua kali membuka dialog yang sama.
  useEffect(() => {
    if (open) setChosen(all);
    // `semua` sengaja tidak jadi dependensi — nilainya ikut berubah saat
    // pengguna sedang menyunting, dan itu akan membatalkan suntingannya.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const changed =
    chosen.length !== all.length ||
    chosen.some((p) => !all.includes(p)) ||
    partial.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={`Ubah akses posisi ${count} dataset`}
      description="Daftar ini MENGGANTI tag yang sudah ada, bukan menambah. Yang sedang berlaku sudah dinyalakan di bawah."
    >
      <div className="flex flex-wrap gap-2">
        {options.map((p) => {
          const active = chosen.includes(p);
          const half = !active && partial.includes(p);
          return (
            <button
              key={p}
              type="button"
              onClick={() =>
                setChosen((previous) =>
                  previous.includes(p)
                    ? previous.filter((x) => x !== p)
                    : [...previous, p],
                )
              }
              className={[
                "rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors",
                active
                  ? "border-[#4F6BED] bg-[#EDF2FF] text-[#4F6BED]"
                  : half
                    ? "border-dashed border-[#E0B060] bg-[#FFF9F0] text-[#B45309]"
                    : "border-[#E9EBF0] text-[#4B5563] hover:bg-[#F8FAFC]",
              ].join(" ")}
            >
              {p}
              {half ? (
                <span className="ml-1.5 text-[11px] font-bold opacity-80">
                  sebagian
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

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
            bertag{" "}
            <strong className="font-semibold text-[#2E3646]">
              {chosen.join(", ")}
            </strong>
          </>
        )}
        .
        {partial.length > 0 ? (
          <span className="mt-1 block text-[#B45309]">
            {partial.filter((p) => !chosen.includes(p)).length > 0
              ? `Tag yang kini hanya dipunyai sebagian (${partial
                  .filter((p) => !chosen.includes(p))
                  .join(", ")}) akan dilepas dari semuanya.`
              : "Tag yang tadinya hanya dipunyai sebagian akan diberikan ke semuanya."}
          </span>
        ) : null}
      </p>

      <p className="mt-2.5 rounded-[8px] border border-[#CDE9D8] bg-[#F2FBF6] px-3 py-2 text-[12.5px] leading-relaxed text-[#137A46]">
        <strong className="font-semibold">
          Perubahan ini berlaku seketika.
        </strong>{" "}
        Karyawan di luar posisi yang Anda pilih langsung kehilangan akses
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
 * "5 posisi" dengan dua nama pertama dan sisanya diringkas.
 *
 * Menyebut jumlahnya lebih dulu disengaja: yang paling sering ingin diketahui
 * dari kolom ini adalah seberapa sempit aksesnya, bukan siapa persisnya. Daftar
 * lengkapnya ada di panel detail.
 */
function PositionsCell({ positions }: { positions: string[] }) {
  if (positions.length === 0) {
    // Bukan "belum diatur" — tanpa tag memang berarti terbuka, dan itu keadaan
    // bawaan yang sah untuk katalog data bersama. Menyebutnya "belum" membuat
    // setiap baris terbaca seperti pekerjaan yang belum selesai.
    return <span className="text-[14.5px] text-[#9CA3AF]">Semua karyawan</span>;
  }

  const visible = positions.slice(0, 2);
  const remaining = positions.length - visible.length;

  return (
    <>
      <div className="text-[14.5px] font-semibold text-[#3C4A56]">
        {positions.length} posisi
      </div>
      <div className="mt-0.5 text-[12.5px] text-[#9CA3AF]">
        {visible.join(", ")}
        {remaining > 0 ? ` +${remaining}` : ""}
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
