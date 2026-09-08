import { formatBytes } from "@/shared/lib/format";

/**
 * Keadaan baris berkas pada formulir dataset, beserta aturan yang menilainya.
 *
 * <h2>Kenapa terpisah dari komponennya</h2>
 *
 * Isinya dipakai bersama formulir terbit dan formulir sunting, dan tidak satu
 * pun di antaranya komponen. Menaruhnya di berkas yang sama dengan komponen
 * membuat Fast Refresh berhenti bekerja untuk seluruh berkas itu: satu
 * penyuntingan kecil pada baris berkas akan memuat ulang halamannya dan
 * membuang isian yang sedang diketik.
 *
 * Yang paling penting dipakai bersama justru {@link fileBlocker}. Ia bukan
 * kenyamanan tampilan melainkan penjagaan: batas ukuran dan jenis berkas yang
 * didukung. Salinan yang menyimpang akan melepas penjagaan itu di satu layar
 * saja, dan yang terlepas baru ketahuan setelah unggahannya ditolak server.
 */

export const MAX_FILES = 10;

/** Sejalan dengan MAX_BYTES di DatasetFileService. */
export const MAX_BYTES = 10 * 1024 * 1024;

export const KINDS = ["CSV", "XLSX", "PDF", "DOCX"] as const;

export const KIND_LABELS: Record<string, string> = {
  CSV: "CSV",
  XLSX: "Excel",
  PDF: "PDF",
  DOCX: "Word",
};

/**
 * Satu baris berkas pada formulir, entah berkas baru maupun yang sudah tersimpan.
 *
 * <h2>Kombinasi `id` dan `file` yang menentukan artinya</h2>
 *
 * | `id` | `file` | Artinya |
 * |---|---|---|
 * | kosong | ada | berkas baru |
 * | ada | kosong | berkas lama, dipertahankan apa adanya |
 * | ada | ada | berkas lama yang isinya DIGANTI |
 *
 * Baris ketiga itu yang membuat "ganti file" bekerja tanpa endpoint tersendiri:
 * yang dikirim adalah berkas baru, dan `id` lamanya cukup tidak ikut disebutkan
 * sehingga back-end melepasnya. Satu permintaan, satu transaksi, jadi tidak ada
 * keadaan setengah jalan tempat berkas lama sudah hilang tetapi penggantinya
 * belum masuk.
 */
export interface FileRowState {
  /** Kunci React saja, tidak pernah dikirim ke back-end. */
  rowKey: number;
  /** Id berkas yang sudah tersimpan. Kosong berarti baris ini berkas baru. */
  id?: string;
  label: string;
  kind: string;
  file: File | null;
  /** Nama dan ukuran berkas yang sudah tersimpan, untuk ditampilkan. */
  existingName?: string;
  existingSize?: number;
}

let order = 0;

export function newFileRow(): FileRowState {
  order += 1;
  return { rowKey: order, label: "", kind: "", file: null };
}

/** Baris untuk berkas yang sudah tersimpan, dipakai formulir sunting. */
export function existingFileRow(resource: {
  id?: string;
  label?: string;
  fileName?: string;
  formatName?: string;
  sizeBytes?: number;
}): FileRowState {
  order += 1;
  return {
    rowKey: order,
    id: resource.id,
    label: resource.label ?? "",
    kind: (resource.formatName ?? "").toUpperCase(),
    file: null,
    existingName: resource.fileName ?? "",
    existingSize: resource.sizeBytes ?? 0,
  };
}

export function kindFromFileName(name: string): string {
  const ext = name.slice(name.lastIndexOf(".") + 1).toUpperCase();
  return (KINDS as readonly string[]).includes(ext) ? ext : "";
}

/**
 * Alasan tombol simpan belum bisa ditekan, atau null kalau sudah siap.
 *
 * Dikembalikan sebagai kalimat, bukan boolean. Tombol mati tanpa keterangan
 * memaksa orang menebak apa yang kurang — dan pada formulir sepanjang ini, yang
 * kurang biasanya sedang berada di luar layar.
 *
 * Dipakai kedua formulir supaya penolakannya berbunyi sama. Masing-masing
 * menambahkan syaratnya sendiri setelah memanggil ini.
 */
export function fileBlocker(files: FileRowState[]): string | null {
  if (files.length === 0) return "Belum ada file";
  // Baris berkas lama sudah punya isinya; yang wajib dipilih hanya baris baru.
  if (files.some((b) => !b.id && !b.file))
    return "Ada file yang belum dipilih file-nya";
  // Jenis kosong padahal berkasnya sudah ada berarti ekstensinya di luar
  // keempat yang didukung. Ditahan di sini supaya penolakannya terbaca sebelum
  // mengunggah, bukan sesudah menunggu unggahan selesai.
  if (files.some((b) => (b.file || b.id) && !b.kind))
    return "Ada file dengan jenis yang tidak didukung";
  if (files.some((b) => !b.label.trim())) return "Ada file yang belum diberi nama";
  if (files.some((b) => (b.file?.size ?? 0) > MAX_BYTES))
    return `Ada file melebihi ${formatBytes(MAX_BYTES)}`;
  return null;
}
