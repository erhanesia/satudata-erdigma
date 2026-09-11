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
export const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Sejalan dengan MAX_TOTAL_BYTES di DatasetFileService.
 *
 * Batas ini SELALU ditegakkan server; salinan di sini semata-mata supaya
 * penolakannya terbaca sebelum mengunggah, bukan sesudahnya. Bedanya nyata:
 * batas totalnya 60 MB, dan menunggu server menolak berarti menunggu 60 MB
 * benar-benar terkirim lebih dulu. Pada sambungan kantor yang biasa itu
 * menit-menit yang terbuang untuk jawaban yang sudah bisa diketahui sejak
 * berkasnya dipilih.
 */
export const MAX_TOTAL_BYTES = 60 * 1024 * 1024;

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
  /**
   * Sedang dikecilkan di peramban.
   *
   * Selama ini benar, tombol simpan ditahan. Bukan demi kerapian:
   * `file` masih berisi berkas ASLI yang belum dikecilkan, jadi menekan
   * simpan saat ini berarti mengirim yang besar dan kehilangan seluruh
   * guna fiturnya.
   */
  compressing?: boolean;
  /**
   * Ukuran sebelum dikecilkan, hanya terisi bila benar-benar mengecil.
   *
   * Ada supaya penerbit MELIHAT bahwa berkasnya diubah. Yang tersimpan
   * nanti versi kecilnya, bukan yang ia pilih, dan itu tidak boleh
   * terjadi diam-diam.
   */
  originalSize?: number;
  /**
   * Pengecilan sudah dicoba dan tidak ada yang bisa dikurangi.
   *
   * Dibedakan dari "belum pernah dicoba", karena tanpa itu keduanya
   * terlihat sama persis di layar: ukuran tidak berubah, tidak ada
   * keterangan apa pun. Yang melihatnya menyimpulkan fiturnya rusak,
   * padahal ia sudah berjalan dan memang tidak menemukan apa-apa.
   */
  compressionFutile?: boolean;
  /**
   * Pengecilan dicoba dan GAGAL di tengah jalan.
   *
   * Dipisahkan dari {@link compressionFutile} karena keduanya menghasilkan
   * keadaan yang sama persis, yaitu berkas asli tanpa ukuran sebelumnya,
   * padahal artinya berlawanan. Yang pertama berarti berkasnya memang sudah
   * padat; yang ini berarti kita tidak tahu apa-apa tentang berkasnya.
   *
   * Menyamakan keduanya membuat layar mengucapkan kalimat yang salah pada saat
   * yang paling menentukan, karena "sudah sekecil yang bisa" menghentikan
   * orang dari mencoba lagi.
   */
  compressionFailed?: boolean;
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
  /*
    Ditahan SEBELUM pemeriksaan ukuran di bawah, dan urutannya penting.

    Selama pengecilan berjalan, `file` masih berisi berkas aslinya yang
    besar. Kalau pemeriksaan ukuran berjalan lebih dulu, berkas 40 MB yang
    sedang dikecilkan akan ditolak sebagai kebesaran, padahal beberapa
    detik lagi ia menjadi 4 MB.
  */
  if (files.some((b) => b.compressing)) return "Ada file yang sedang dikecilkan";
  if (files.some((b) => (b.file?.size ?? 0) > MAX_BYTES))
    return `Ada file melebihi ${formatBytes(MAX_BYTES)}`;
  /*
    Berkas lama yang dipertahankan ikut dihitung.

    Batas totalnya milik DATASET, bukan milik satu permintaan, dan begitulah
    server menghitungnya: ukuran berkas yang tetap dipertahankan dijumlahkan
    bersama yang baru diunggah. Formulir yang cuma menjumlahkan berkas baru
    meloloskan dataset 50 MB yang ditambahi berkas 15 MB, dan penolakannya baru
    datang setelah 15 MB itu benar-benar terkirim.

    Ukuran berkas lama memang ada di tangan: `existingSize` diisi dari
    `sizeBytes` milik tiap berkas yang sudah tersimpan, dan angka itu sudah
    dipakai menampilkan ukurannya di baris yang sama.

    Baris yang berkasnya DIGANTI hanya menghitung berkas barunya. Yang lama
    dilepas server dalam transaksi yang sama, jadi menjumlahkan keduanya akan
    menolak penggantian yang sebenarnya tidak menambah apa-apa.

    Kalau ukuran lamanya tidak diketahui, yang terpakai nol. Penjagaan di klien
    boleh lebih longgar daripada server, tetapi tidak boleh lebih ketat: yang
    menolak lebih banyak daripada server akan memblokir unggahan yang sah, dan
    orangnya tidak punya cara membuktikan sebaliknya.
  */
  const total = files.reduce(
    (jumlah, b) => jumlah + (b.file?.size ?? b.existingSize ?? 0),
    0,
  );
  if (total > MAX_TOTAL_BYTES)
    return `Total ukuran file melebihi ${formatBytes(MAX_TOTAL_BYTES)}`;
  return null;
}
