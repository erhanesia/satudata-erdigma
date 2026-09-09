import {
  AlertTriangle,
  Check,
  Database,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { paths } from "@/app/router/paths";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useAdminDatasets, useFormats } from "@/features/dataset/hooks/useDatasets";
import { useDivisions } from "@/features/division/hooks/useDivisions";
import { Reveal } from "@/shared/components/motion/Reveal";
import { Dialog } from "@/shared/components/ui/Dialog";
import { Pagination } from "@/shared/components/ui/Pagination";
import { SelectMenu } from "@/shared/components/ui/SelectMenu";
import {
  formatBytes,
  formatNumber,
  parseServerTime,
  TIME_ZONE,
} from "@/shared/lib/format";
import { pageFromUrl, useUrlState } from "@/shared/hooks/useUrlState";
import type { AccessRule, DatasetLite } from "@/shared/types/api";

import { DatasetDrawer } from "../components/DatasetDrawer";
import { FormatBadge } from "../components/FormatBadge";
import { seesEveryDivision } from "../lib/adminScope";
import { useJobLevels } from "../hooks/useAccessOptions";
import { useDatasetAdmin } from "../hooks/useDatasetAdmin";

/** Sesuai desain: tabel penuh satu halaman, bukan gulungan tanpa ujung. */
const PAGE_SIZE = 10;

/**
 * Daftar dataset di panel admin, mengikuti tabel pada `Panel Admin Satu Data`.
 *
 * Kolomnya sama dengan desain, termasuk kotak centang dan kolom akses.
 *
 * **Tentang kotak centangnya.** Dua tindakan yang bergantung padanya berbeda
 * jangkauan, dan bedanya disengaja. Hapus berlaku untuk semua yang tercentang;
 * Edit dataset baru menyala kalau yang tercentang tepat satu, karena formulir
 * suntingnya mengurus judul dan deskripsi yang memang milik satu dataset saja.
 *
 * Ubah akses massal dulu ada di sini dan kini dilepas. Pengaturan siapa yang
 * boleh melihat pindah ke formulir sunting, tempat yang sama dengan formulir
 * terbit — jadi aturan akses hanya punya satu layar, bukan dua yang harus
 * dijaga tetap sepakat. Endpoint `PATCH /{slug}/access-rules` di sisi server
 * tidak ikut dicabut; yang hilang cuma jalan pintas massalnya.
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
  /*
    Penyaring dan nomor halaman disimpan di URL.

    Yang paling terasa di halaman ini: admin sering menyaring lalu mengirim
    tautannya ke rekan kerja. Sebelumnya yang terkirim cuma alamat halaman
    kosong, dan penerimanya harus mengulang seluruh penyaringnya sendiri.
  */
  const [urlState, setUrlState] = useUrlState({
    search: "",
    division: "",
    format: "",
    jobLevel: "",
    page: "1",
  });

  const search = urlState.search;
  const division = urlState.division;
  const format = urlState.format;
  const jobLevel = urlState.jobLevel;
  // URL berbasis 1 karena dibaca manusia; API berbasis 0. Konversinya cuma
  // di baris ini dan di pemanggilan paginasinya.
  const page = pageFromUrl(urlState.page) - 1;

  const navigate = useNavigate();

  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [dialog, setDialog] = useState<"hapus" | null>(null);

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

  const { data: me } = useCurrentUser();

  /*
    Penyaring divisi hanya berarti bagi admin HRIS.

    Admin biasa sudah dibatasi server ke divisinya sendiri, jadi baginya
    "Semua divisi" menjanjikan sesuatu yang tidak akan terjadi, dan
    memilih divisi lain menghasilkan tabel kosong yang terbaca seperti
    kerusakan alih-alih seperti penolakan.

    Selama /me belum tiba nilainya false, jadi penyaringnya belum muncul.
    Itu arah yang benar untuk salah sesaat: yang tertunda cuma sebuah
    pilihan, bukan datanya.
  */
  const bolehLintasDivisi = seesEveryDivision(me);

  /*
    Membersihkan ?division= yang tertinggal di alamat.

    Tanpa ini, tautan berpenyaring divisi yang diteruskan ke admin divisi
    lain akan menyaring sesuatu yang kotaknya sudah tidak ada di layarnya,
    dan ia tidak punya cara membatalkannya selain menyunting alamat sendiri.

    Menunggu me benar-benar ada, bukan sekadar bukan-admin-HRIS: saat /me
    masih berjalan keduanya terlihat sama, dan bertindak lebih dulu berarti
    menghapus penyaring milik admin HRIS yang sebenarnya berhak.
  */
  useEffect(() => {
    if (me && !seesEveryDivision(me) && division) setUrlState({ division: "" });
  }, [me, division, setUrlState]);

  const divisions = useDivisions();
  const formats = useFormats();
  const jobLevels = useJobLevels();
  const { remove } = useDatasetAdmin();

  /*
    Jalur admin, BUKAN jalur portal.

    Endpoint portal memang tidak dibatasi divisi, karena ia juga melayani
    katalog yang dilihat seluruh karyawan. Yang membatasi ada di
    /api/v1/admin/datasets, dan pembatasannya diputuskan server dari
    identitas pemanggil, bukan dari sesuatu yang dikirim klien.
  */
  const datasets = useAdminDatasets({
    search: search || undefined,
    divisions: bolehLintasDivisi && division ? [division] : undefined,
    formats: format ? [format] : undefined,
    jobLevels: jobLevel ? [jobLevel] : undefined,
    sort: "created",
    page: page,
    size: PAGE_SIZE,
  });

  const hasFilter = Boolean(
    search || (bolehLintasDivisi && division) || format || jobLevel,
  );
  const rows = useMemo(() => datasets.data?.content ?? [], [datasets.data]);
  const totalPages = datasets.data?.totalPages ?? 0;

  // Mengganti filter mengembalikan ke halaman pertama; diurus useUrlState,
  // dan alasannya ada di sana.

  // Pilihan hanya berlaku untuk baris yang terlihat. Menyimpan pilihan lintas
  // halaman berarti seseorang bisa menekan Hapus untuk dataset yang tidak ada
  // di layarnya — persis jenis kejutan yang tidak boleh ada di tombol hapus.
  useEffect(() => {
    setSelected([]);
  }, [page, search, division, format, jobLevel]);

  const allChecked = rows.length > 0 && selected.length === rows.length;
  const busy = remove.isPending;

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
          DUA kelompok, bukan satu baris berisi semuanya.

          Penyaring dan tombol Tambah dataset dulu jadi anak dari satu
          `flex-wrap` yang sama, dengan `ml-auto` pada tombolnya. Selama semuanya
          muat sebaris itu terlihat benar. Begitu ruangnya menipis — di tablet,
          atau di jendela desktop yang dikecilkan — Reset jatuh ke baris kedua
          dan `ml-auto` melemparkan tombolnya ke ujung kanan baris yang sama,
          menyisakan celah kosong lebar di antara keduanya. Yang terbaca bukan
          susunan yang menyesuaikan diri, melainkan tata letak yang rusak.

          Penyakit yang sama sudah dibetulkan di bilah pilihan tepat di bawah,
          dan catatannya masih ada di sana. Yang membedakan obatnya: di sana
          tombolnya harus tetap menempel ke tepi BILAH, jadi yang dipakai
          `w-full`. Di sini tombolnya memang milik kelompoknya sendiri, jadi
          memisahkannya jadi dua kelompok justru yang benar — penyaring boleh
          membungkus sesukanya tanpa pernah menyeret tombolnya ikut berpindah.

          Di ponsel penyaringnya disusun grid dua kolom, bukan dibiarkan
          membungkus sendiri. `flex-wrap` menempatkan tiap anak sesuai sisa ruang
          baris sebelumnya, sehingga tiga pilihan dan tombol Reset jatuh dengan
          lebar yang berbeda-beda — dan tepinya tidak pernah lurus. Grid memberi
          setiap anak lebar yang sama, jadi susunannya bisa diramalkan tanpa
          mengunci lebar satu per satu.
        */}
        <div className="mb-5 flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
          <div className="relative col-span-2 sm:w-[300px] sm:min-w-[240px]">
            <input
              value={search}
              onChange={(e) => setUrlState({ search: e.target.value })}
              placeholder="Cari judul atau slug"
              className="h-[52px] w-full rounded-lg border border-[#E9EBF0] bg-white pr-11 pl-[18px] text-[16px] text-[#2E3646] outline-none transition-colors focus:border-[#4F6BED] placeholder:text-[#9CA3AF]"
            />
            <Search className="pointer-events-none absolute top-1/2 right-4 size-[19px] -translate-y-1/2 text-[#2E3646]" />
          </div>

          {/*
            Pilihan bernilai kosong DIBUANG, bukan dikirim apa adanya.

            Kode divisi dan nama format datang dari HRIS dan dari basis data,
            dan keduanya bertipe opsional. Satu baris tanpa kode akan menjadi
            pilihan bernilai kosong, dan pilihan seperti itu tidak bisa
            dibedakan dari "semua" -- menekannya justru akan membersihkan
            penyaringnya. Membuangnya lebih jujur daripada menampilkan baris
            yang tidak menyaring apa pun.
          */}
          {bolehLintasDivisi ? (
            <SelectMenu
              value={division}
              onChange={(v) => setUrlState({ division: v })}
              placeholder="Semua divisi"
              options={(divisions.data ?? [])
                .filter((d) => d.code)
                .map((d) => ({ value: d.code as string, label: d.code as string }))}
            />
          ) : null}

          <SelectMenu
            value={format}
            onChange={(v) => setUrlState({ format: v })}
            placeholder="Semua jenis file"
            options={(formats.data ?? [])
              .filter((f) => f.name)
              .map((f) => ({ value: f.name as string, label: f.name as string }))}
          />

          <SelectMenu
            value={jobLevel}
            onChange={(v) => setUrlState({ jobLevel: v })}
            placeholder="Semua job level"
            options={(jobLevels.data ?? []).map((level) => ({
              value: level,
              label: level,
            }))}
          />

          <button
            type="button"
            disabled={!hasFilter}
            onClick={() => {
              setUrlState({
                search: "",
                division: "",
                format: "",
                jobLevel: "",
              });
            }}
            className="flex h-[52px] items-center justify-center gap-2 rounded-lg border border-[#E9EBF0] bg-white px-4 text-[16px] font-semibold text-[#4B5563] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
          >
            <RotateCcw className="size-4" />
            Reset
          </button>
          </div>

          {/* `shrink-0` supaya tombolnya tidak ikut menyempit saat penyaring di
              sebelahnya melebar. Tombol utama yang hurufnya terpotong lebih buruk
              daripada penyaring yang membungkus satu baris lebih banyak. */}
          <Link
            to={paths.adminDatasetNew}
            className="flex h-[52px] w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-[#22C55E] px-6 text-[16px] font-bold text-white transition-colors hover:bg-[#1BA851] sm:w-auto"
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
              {/*
                Menyala hanya kalau yang tercentang TEPAT SATU.

                Formulir sunting mengurus judul, deskripsi, dan berkas -- semuanya
                milik satu dataset tertentu. Tidak ada bentuk masuk akal dari
                "sunting lima dataset sekaligus" untuk ruas-ruas itu.

                Tombolnya dimatikan, bukan disembunyikan, dan alasannya disebut di
                keterangan bawah. Tombol yang menghilang membuat orang mengira
                fiturnya tidak ada.

                Mengubah aturan akses kini juga lewat sini, bukan lagi lewat dialog
                massal tersendiri -- pemilih yang sama sudah jadi bagian formulirnya,
                lengkap dengan aturan yang sedang berlaku.
              */}
              <button
                type="button"
                disabled={busy || selected.length !== 1}
                onClick={() => void navigate(paths.adminDatasetEdit(selected[0] ?? ""))}
                className="flex items-center gap-1.5 rounded-lg border border-[#E9EBF0] bg-white px-3.5 py-2 text-[13.5px] font-semibold text-[#4B5563] transition-colors hover:bg-[#F8FAFC] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Pencil className="size-4" />
                Edit dataset
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
              {selected.length > 1 ? (
                <span className="text-[13px] text-[#9CA3AF]">
                  Pilih satu dataset saja untuk menyuntingnya.
                </span>
              ) : null}
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
            Sampai `lg`, tabelnya diganti daftar kartu — bukan digulung menyamping.

            Tabelnya butuh 1120px untuk tujuh kolomnya. Di layar 390px yang
            terlihat cuma kolom pertama, dan enam kolom sisanya — termasuk akses
            dan jumlah unduhan — hanya bisa dicapai dengan menggeser mendatar
            sambil kehilangan judul barisnya. Gulungan mendatar di dalam halaman
            yang juga bergulung tegak adalah gerakan yang paling sering salah
            kena.

            Ambangnya `lg`, bukan `md`. Di tablet 820px ruang isinya sekitar
            790px — masih jauh dari 1120px, dan yang terjadi persis keluhan yang
            dilaporkan: kolom terpotong di tepi kanan, judul kolom membungkus, dan
            nama pengunggah menumpuk tiga baris. Ambang ini juga menyamakan diri
            dengan sidebar panel, yang sudah lebih dulu berganti di `lg` dengan
            alasan yang sama persis.

            Di atas `lg` tabelnya memang masih perlu digeser mendatar, dan itu
            dibiarkan: di sana ada penunjuk dan roda gulir, gerakan yang sudah
            wajar untuk tabel data lebar. Yang tidak wajar adalah menuntutnya
            dari jari di layar sentuh.

            Kartunya menyusun data yang sama secara menurun, jadi tidak ada yang
            hilang. Yang berbeda cuma urutan bacanya.
          */}
          <div
            className={[
              "transition-opacity duration-[220ms] ease-out lg:hidden",
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
              "hidden overflow-x-auto transition-opacity duration-[220ms] ease-out lg:block",
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
                onPageChange={(p) => setUrlState({ page: String(p) })}
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
  /** Kata kerja yang sudah dilakukan, mis. "dihapus". */
  verb: string;
}

/**
 * Pop-up hasil setelah menghapus banyak dataset sekaligus.
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
 * ketiga tindakan yang mengubah katalog — terbit, sunting, hapus — berakhir
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
  const date = parseServerTime(iso);
  if (!date) return "—";
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: TIME_ZONE,
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
