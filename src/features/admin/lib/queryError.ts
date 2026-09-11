import { ApiError } from '@/shared/api/errors'

/**
 * Kalimat yang ditampilkan ketika sebuah permintaan panel admin gagal.
 *
 * <h2>Kenapa ini perlu ada, dan kenapa bukan sekadar kerapian</h2>
 *
 * Sebelumnya beberapa halaman panel admin tidak punya cabang galat sama
 * sekali: permintaan yang gagal jatuh ke cabang "kosong", dan yang terbaca
 * pengguna adalah "Belum ada dataset".
 *
 * Itu kebohongan yang mahal untuk sebuah katalog data. "Belum ada dataset"
 * adalah pernyataan tentang ISI SISTEM, bukan tentang koneksi. Admin yang
 * membacanya menyimpulkan divisinya memang belum punya data, lalu mungkin
 * mengunggah ulang sesuatu yang sebenarnya sudah ada di sana.
 *
 * Ini bukan kekhawatiran teoretis. Saat back-end mati di lingkungan
 * pengembangan, dasbor menampilkan lima tanda hubung tanpa satu pun
 * keterangan, dan yang melihatnya harus bertanya kepada orang lain untuk tahu
 * apa yang terjadi.
 *
 * <h2>Kenapa memakai pesan dari server apa adanya</h2>
 *
 * {@link ApiError} sudah memilihkan kalimat yang aman: untuk galat 4xx ia
 * memakai pesan dari back-end, sedangkan untuk 5xx dan kegagalan jaringan ia
 * memakai kalimat tetap, karena isi galat 5xx bisa memuat nama tabel atau
 * jejak tumpukan.
 *
 * Itu penting justru pada kasus yang paling perlu dijelaskan. Admin yang belum
 * terhubung ke divisi mana pun di HRIS menerima 403 beserta kalimat yang
 * menyebut sebabnya sekaligus jalan keluarnya, dan kalimat itu jauh lebih
 * berguna daripada "Gagal dimuat" yang kita karang sendiri.
 */
export function pesanGagalMuat(error: unknown): string {
  if (error instanceof ApiError) return error.message

  /*
    Sampai di sini berarti galatnya bukan dari lapisan HTTP kita, misalnya
    kesalahan saat merender. Sebabnya tidak bisa diterangkan kepada pengguna,
    jadi yang ditawarkan tindakan yang masuk akal untuk dicoba.
  */
  return 'Gagal dimuat. Coba muat ulang halaman.'
}
