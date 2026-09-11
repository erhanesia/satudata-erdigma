import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";
import { useRef, type ReactNode } from "react";

import { compressUpload, willCompress } from "@/features/admin/lib/compressUpload";

import {
  KIND_LABELS,
  MAX_BYTES,
  kindFromFileName,
  type FileRowState,
} from "@/features/admin/lib/datasetFormState";
import { formatBytes } from "@/shared/lib/format";

import { FormatBadge } from "./FormatBadge";

/**
 * Potongan tampilan yang dipakai bersama formulir terbit dan formulir sunting.
 *
 * <h2>Kenapa dikeluarkan, bukan disalin</h2>
 *
 * Kedua formulir itu memang harus terlihat sama — orang yang sudah pernah
 * menerbitkan dataset tidak semestinya perlu belajar ulang saat menyuntingnya.
 * Menyalin potongan ini ke dua berkas membuat kesamaan itu bergantung pada
 * kedisiplinan: satu perubahan warna atau jarak di satu sisi, dan keduanya mulai
 * menyimpang tanpa ada yang gagal.
 *
 * Baris berkas ikut ke sini belakangan, dan justru itu yang paling penting
 * dipakai bersama: di dalamnya ada aturan bahwa jenis berkas dibaca dari
 * ekstensi dan tidak bisa dipilih tangan. Aturan itu penjagaan, bukan gaya, dan
 * salinan yang menyimpang akan melepasnya di satu layar saja.
 *
 * Isinya sengaja hanya komponen. Keadaan barisnya beserta aturan penilaiannya
 * ada di `admin/lib/datasetFormState`, karena mencampur keduanya di satu berkas
 * mematikan Fast Refresh untuk seluruh berkas ini.
 */

export function Card({ children, full }: { children: ReactNode; full?: boolean }) {
  return (
    <div
      className={[
        "rounded-lg bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.06)] sm:p-6",
        full ? "h-full" : "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-[17px] font-bold text-[#2E3646]">{title}</h2>
      <p className="mt-1 text-[13.5px] leading-relaxed text-[#6B7280]">
        {description}
      </p>
    </div>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-1.5 text-[14px] font-semibold text-[#3C4A56]">
        {label}
        {required ? <span className="ml-1 text-[#B4231B]">*</span> : null}
      </div>
      {hint ? <p className="mb-2 text-[13px] text-[#9CA3AF]">{hint}</p> : null}
      {children}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-[52px] w-full rounded-lg border border-[#E9EBF0] px-3.5 text-[16px] text-[#3C4A56] outline-none transition-colors focus:border-[#4F6BED] placeholder:text-[#9CA3AF]"
    />
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors",
        active
          ? "border-[#4F6BED] bg-[#EDF2FF] text-[#4F6BED]"
          : "border-[#E9EBF0] text-[#4B5563] hover:bg-[#F8FAFC]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/**
 * Satu baris berkas.
 *
 * Muncul dengan animasi `tab-in` yang sama dengan perpindahan tab di seluruh
 * aplikasi — baris yang tiba-tiba ada terasa seperti layar yang meloncat.
 */
export function FileRow({
  rows,
  rowNumber,
  onChangeRow,
  onRemove,
}: {
  rows: FileRowState;
  rowNumber: number;
  onChangeRow: (u: Partial<FileRowState>) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  /*
    Berkas terakhir yang dipilih di baris ini.

    Pengecilan berjalan asinkron dan bisa memakan belasan detik. Kalau
    penerbit mengganti pilihannya di tengah jalan, hasil yang datang
    belakangan adalah milik berkas yang sudah DIBUANG, dan menerapkannya
    akan menimpa pilihan barunya diam-diam. Penanda ini yang membuat hasil
    kedaluwarsa bisa dikenali lalu diabaikan.
  */
  const terakhirDipilih = useRef<File | null>(null);


  // Ukuran yang dinilai selalu ukuran SETELAH dikecilkan, karena itulah
  // yang akan dikirim. Selama masih diproses, penolakannya ditahan
  // fileBlocker supaya tidak muncul lalu hilang lagi.
  const tooLarge = !rows.compressing && (rows.file?.size ?? 0) > MAX_BYTES;

  // Berkas yang baru dipilih selalu mengalahkan yang tersimpan, karena itulah
  // yang akan dikirim. Menampilkan nama lama setelah orang memilih pengganti
  // membuat layar menyebut berkas yang justru sedang dibuang.
  const shownName =
    rows.file?.name ??
    rows.existingName ??
    `unggahan-${String(rowNumber).padStart(2, "0")}`;
  const shownSize = rows.file?.size ?? rows.existingSize;
  const replaced = Boolean(rows.id && rows.file);

  return (
    /*
      Masuk dan keluarnya diurus AnimatePresence di halaman induk.

      Animasi KELUAR tidak bisa dikerjakan CSS sendirian: React melepas
      elemennya seketika, dan animasi pada elemen yang sudah tidak ada tidak
      pernah tergambar. AnimatePresence menahan elemennya tetap terpasang
      sampai animasinya selesai, lalu melepasnya.

      `height: auto` menuju nol juga bukan hal yang bisa ditulis di CSS,
      karena tinggi tiap baris berbeda-beda tergantung ada tidaknya pesan
      galat di dalamnya. Pustaka ini mengukurnya sendiri.

      Menyusutkan tingginya penting, bukan sekadar memudarkan. Kalau barisnya
      cuma memudar lalu dilepas, baris di bawahnya menyentak naik pada saat
      terakhir, dan justru sentakan itu yang terlihat kasar.

      Opacity sengaja lebih singkat daripada tingginya, supaya isinya sudah
      hilang sebelum ruangnya habis. Terbalik, yang terlihat teks yang
      terpotong-potong oleh tepi yang menutup.
    */
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{
        duration: 0.28,
        ease: [0.16, 1, 0.3, 1],
        opacity: { duration: 0.16 },
      }}
      className="overflow-hidden border-b border-[#E9EBF0] py-5 first:pt-0 last:border-b-0"
    >
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
          <FormatBadge ext={rows.kind} />
          <span className="min-w-0">
            <span className="block truncate font-mono text-[14px] text-[#3C4A56]">
              {shownName}
            </span>
            {/* Ukuran turun ke baris kedua di ponsel supaya nama berkas
                mendapat lebar penuh; di layar lebar ia kembali sebaris. */}
            {rows.compressing ? (
              /*
                Lencana ditambah bilah, bukan sekadar teks berputar.

                Mengecilkan berkas bisa memakan belasan detik, jauh lebih lama
                daripada tunggu-sebentar biasa. Ikon berputar sendirian pada
                rentang selama itu terbaca seperti aplikasi yang tersangkut,
                sedangkan bilah yang bergerak menegaskan ada yang benar-benar
                sedang dikerjakan.
              */
              <span className="mt-1 flex items-center gap-2 sm:mt-0 sm:inline-flex sm:pl-2.5 sm:align-middle">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EEF1FE] px-2.5 py-1 text-[12.5px] font-semibold text-[#4F6BED]">
                  <Loader2 className="size-3.5 animate-spin" />
                  Mengecilkan berkas
                </span>
                <span className="h-[3px] w-20 overflow-hidden rounded-full bg-[#E9EBF0]">
                  <span className="animate-sweep block h-full w-1/5 rounded-full bg-[#4F6BED]" />
                </span>
              </span>
            ) : shownSize !== undefined ? (
              <span className="flex items-center gap-1 text-[13px] text-[#9CA3AF] sm:inline-flex sm:pl-2.5">
                {/*
                  Ukuran asli tetap ditampilkan, dicoret.

                  Yang tersimpan nanti versi yang dikecilkan, bukan berkas
                  yang penerbit pilih. Menampilkan angka barunya saja akan
                  terbaca seolah ia salah lihat waktu memilih.
                */}
                {rows.originalSize ? (
                  <>
                    <span className="line-through">{formatBytes(rows.originalSize)}</span>
                    <ArrowRight className="size-3.5" />
                    <span className="inline-flex items-center rounded-full bg-[#E7F8EF] px-2.5 py-1 text-[12.5px] font-semibold text-[#137A46]">
                      {formatBytes(shownSize)}
                    </span>
                  </>
                ) : (
                  formatBytes(shownSize)
                )}
              </span>
            ) : null}
            {rows.compressionFutile ? (
              <span className="mt-1 inline-flex items-center rounded-full bg-[#F1F3F7] px-2.5 py-1 text-[12px] font-medium text-[#9CA3AF] sm:mt-0 sm:ml-2 sm:align-middle">
                sudah sekecil yang bisa
              </span>
            ) : null}
          </span>
        </div>
        {/*
          Kelabu saat diam, memerah saat disentuh.

          Sebelumnya tombol ini merah terus-menerus. Pada formulir yang bisa
          memuat sepuluh baris berkas, itu berarti sepuluh titik merah
          berteriak bersamaan, dan warna merah kehilangan artinya justru di
          tempat yang paling membutuhkannya: pesan galat di baris yang sama.

          Warnanya muncul tepat saat kursor berada di atasnya, yaitu saat
          peringatan itu benar-benar berguna.
        */}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Hapus ${shownName}`}
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13.5px] font-semibold text-[#9CA3AF] transition-colors hover:bg-[#FEF3F2] hover:text-[#B4231B] focus-visible:bg-[#FEF3F2] focus-visible:text-[#B4231B] focus-visible:outline-none"
        >
          <Trash2 className="size-4" />
          Hapus
        </button>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[1fr_200px_200px]">
        <label className="block">
          <span className="mb-1.5 block text-[14px] font-semibold text-[#3C4A56]">
            Nama file
          </span>
          <input
            value={rows.label}
            onChange={(e) => onChangeRow({ label: e.target.value })}
            placeholder="Contoh: Rekap Capaian 2026"
            className={[
              "h-[52px] w-full rounded-lg px-3.5 text-[16px] text-[#3C4A56] outline-none transition-colors focus:border-[#4F6BED]",
              rows.label.trim()
                ? "border border-[#E9EBF0] bg-white"
                : "border border-[#CBD2DC] bg-[#F8FAFC]",
            ].join(" ")}
          />
        </label>

        {/*
          Bacaan, bukan pilihan.

          Jenis berkas adalah FAKTA tentang berkas yang diunggah, bukan
          pendapat penerbit. Selama ia bisa diubah tangan, seseorang bisa
          memilih PDF untuk berkas .csv — dan keterangan yang salah di katalog
          data lebih berbahaya daripada penolakan. Server memang menolaknya,
          tapi penolakan yang baru muncul setelah unggahan selesai adalah
          pemborosan waktu untuk kesalahan yang tidak perlu bisa terjadi.
        */}
        <div className="block">
          <span className="mb-1.5 block text-[14px] font-semibold text-[#3C4A56]">
            Jenis file
          </span>
          <div
            className={[
              "flex h-[52px] w-full items-center rounded-lg border px-3.5 text-[16px]",
              rows.kind
                ? "border-[#E9EBF0] bg-[#F8FAFC] font-semibold text-[#3C4A56]"
                : "border-[#CBD2DC] bg-[#F8FAFC] text-[#9CA3AF]",
            ].join(" ")}
          >
            {rows.kind ? (KIND_LABELS[rows.kind] ?? rows.kind) : "Ikut File"}
          </div>
        </div>

        <div className="block">
          <span className="mb-1.5 block text-[14px] font-semibold text-[#3C4A56]">
            File
          </span>
          <input
            ref={input}
            type="file"
            accept=".csv,.xlsx,.pdf,.docx"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              /*
                Nilai kotaknya dikosongkan setelah dibaca.

                Tanpa ini, memilih berkas yang SAMA dua kali berturut-turut
                tidak memicu apa pun, karena peramban hanya mengirim change
                ketika nilainya berubah. Yang terlihat penerbit: ia menekan
                Pilih file, memilih berkasnya, dan layar diam saja seolah
                klik-nya tidak masuk.

                Terasa persis setelah percobaan yang gagal, yaitu justru saat
                orang paling ingin mencoba berkas yang sama sekali lagi.
              */
              e.target.value = "";
              if (!selected) return;
              // Jenis SELALU ditulis ulang dari berkas yang baru, termasuk
              // ketika hasilnya kosong karena ekstensinya tidak didukung.
              // Dulu yang kosong dilewati sehingga jenis milik berkas
              // SEBELUMNYA tertinggal — berkas .zip bisa terkirim berlabel CSV.
              const kind = kindFromFileName(selected.name);
              terakhirDipilih.current = selected;

              const akanDikecilkan = willCompress(selected, kind);
              onChangeRow({
                file: selected,
                kind,
                compressing: akanDikecilkan,
                originalSize: undefined,
                compressionFutile: false,
              });
              if (!akanDikecilkan) return;

              void compressUpload(selected, kind).then((hasil) => {
                // Hasil milik berkas yang sudah diganti penerbit dibuang.
                if (terakhirDipilih.current !== selected) return;
                onChangeRow({
                  file: hasil.file,
                  originalSize: hasil.originalSize,
                  compressing: false,
                  compressionFutile: hasil.originalSize === undefined,
                });
              });
            }}
          />
          <button
            type="button"
            onClick={() => input.current?.click()}
            className={[
              "flex h-[52px] w-full items-center justify-center gap-2 rounded-lg text-[15px] font-bold transition-colors",
              rows.file || rows.id
                ? "border border-[#E9EBF0] bg-white text-[#4B5563] hover:bg-[#F8FAFC]"
                : "bg-[#1F2A37] text-white hover:bg-[#111A24]",
            ].join(" ")}
          >
            <Upload className="size-[18px]" />
            {rows.file || rows.id ? "Ganti file" : "Pilih file"}
          </button>
        </div>
      </div>

      {/*
        Mengganti isi berkas disebut terang-terangan.

        Yang terjadi di back-end bukan menimpa melainkan melepas berkas lama
        lalu memasang penggantinya, dan bersamanya ikut hilang isi tabel yang
        pernah dibaca dari berkas itu. Orang yang mengira ia cuma "memperbarui
        datanya" berhak tahu itu sebelum menekan Simpan, bukan sesudah.
      */}
      {replaced ? (
        <p className="mt-2.5 flex items-start gap-1.5 text-[13px] text-[#B45309]">
          <AlertTriangle className="mt-px size-4 shrink-0" />
          Berkas lama akan dilepas dan diganti berkas ini. Isi tabel yang dibaca
          dari berkas lama ikut terhapus.
        </p>
      ) : null}

      {rows.file && !rows.kind ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-[#B4231B]">
          <AlertTriangle className="size-4" />
          Jenis file ini belum didukung. Yang bisa diunggah hanya CSV, Excel,
          PDF, dan Word.
        </p>
      ) : null}

      {tooLarge ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-[#B4231B]">
          <AlertTriangle className="size-4" />
          {/*
            Kalau sistem sudah berusaha mengecilkan dan tetap gagal, itu harus
            disebut. Tanpa itu penerbit akan mencoba mengecilkannya sendiri
            dengan alat lain, untuk pekerjaan yang sudah dilakukan di sini.
          */}
          {rows.originalSize
            ? `Sudah dikecilkan menjadi ${formatBytes(rows.file?.size ?? 0)}, masih melebihi batas ${formatBytes(MAX_BYTES)} per file.`
            : `Ukuran melebihi batas ${formatBytes(MAX_BYTES)} per file.`}
        </p>
      ) : null}
    </motion.div>
  );
}
