import { AlertTriangle, Upload, X } from "lucide-react";
import { useRef, type ReactNode } from "react";

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
  const tooLarge = (rows.file?.size ?? 0) > MAX_BYTES;

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
    <div className="animate-tab-in border-b border-[#E9EBF0] py-5 first:pt-0 last:border-b-0">
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5 sm:items-center">
          <FormatBadge ext={rows.kind} />
          <span className="min-w-0">
            <span className="block truncate font-mono text-[14px] text-[#3C4A56]">
              {shownName}
            </span>
            {/* Ukuran turun ke baris kedua di ponsel supaya nama berkas
                mendapat lebar penuh; di layar lebar ia kembali sebaris. */}
            {shownSize !== undefined ? (
              <span className="block text-[13px] text-[#9CA3AF] sm:inline sm:pl-2.5">
                {formatBytes(shownSize)}
              </span>
            ) : null}
          </span>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="flex shrink-0 items-center gap-1 text-[14px] font-semibold text-[#B4231B] transition-colors hover:underline"
        >
          <X className="size-4" />
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
              if (!selected) return;
              // Jenis SELALU ditulis ulang dari berkas yang baru, termasuk
              // ketika hasilnya kosong karena ekstensinya tidak didukung.
              // Dulu yang kosong dilewati sehingga jenis milik berkas
              // SEBELUMNYA tertinggal — berkas .zip bisa terkirim berlabel CSV.
              onChangeRow({
                file: selected,
                kind: kindFromFileName(selected.name),
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
          Ukuran melebihi batas {formatBytes(MAX_BYTES)} per file.
        </p>
      ) : null}
    </div>
  );
}
