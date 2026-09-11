import type { CurrentUser } from '@/shared/types/api'

/**
 * Apakah admin ini berurusan dengan SELURUH divisi.
 *
 * <h2>Kenapa tingkat izin HRIS, bukan peran portal</h2>
 *
 * Keduanya sama-sama bernama ADMIN dan itu memang membingungkan, tetapi asalnya
 * berbeda dan justru itu intinya: peran portal ditunjuk dari panel pengguna,
 * sedangkan tingkat izin HRIS hanya bisa datang dari HRIS.
 *
 * Kalau yang dibaca peran portal, seorang admin bisa menunjuk admin baru yang
 * seketika melihat seluruh divisi, dan pembatasan ini kehilangan artinya dalam
 * satu klik.
 *
 * <h2>Ini kenyamanan, bukan penjagaan</h2>
 *
 * Yang menolak tetap server, lewat AdminDivisionScope. Fungsi ini hanya
 * menentukan apakah penyaring divisi masuk akal ditampilkan: bagi admin yang
 * cuma punya satu divisi, pilihan "Semua divisi" menjanjikan sesuatu yang tidak
 * akan terjadi, dan memilih divisi lain hanya menghasilkan tabel kosong yang
 * terbaca seperti kerusakan.
 *
 * Menyembunyikan penyaringnya karena itu bukan menyembunyikan data. Datanya
 * memang sudah tidak dikirim.
 */
export function seesEveryDivision(user: CurrentUser | undefined): boolean {
  return user?.hrisPermissionLevel === 'ADMIN'
}
