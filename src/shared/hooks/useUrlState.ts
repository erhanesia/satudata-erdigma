import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Menyimpan penyaring dan nomor halaman di URL, bukan di state React.
 *
 * <h2>Kenapa di URL</h2>
 *
 * Tiga hal langsung berfungsi tanpa kode tambahan, dan ketiganya hal yang
 * benar-benar diminta orang:
 *
 * <ul>
 *   <li>Tautannya bisa dibagikan. "Coba lihat log unduhan bulan Agustus"
 *       menjadi satu tautan, bukan tujuh langkah yang harus diulang penerima.</li>
 *   <li>Menyegarkan halaman tidak menghapus pilihan. Sekarang menekan F5 di
 *       tengah menelusuri mengembalikan orang ke keadaan kosong.</li>
 *   <li>Bookmark berfungsi seperti yang diharapkan orang dari sebuah alamat.</li>
 * </ul>
 *
 * <h2>Kenapa hook tersendiri, bukan disalin ke tiap halaman</h2>
 *
 * Polanya sudah lebih dulu ada di {@code useDatasetFilters} untuk katalog, dan
 * tiga keputusan di dalamnya semuanya tidak kentara: nilai bawaan tidak ditulis
 * ke URL, mengubah penyaring mengembalikan ke halaman pertama, dan riwayat
 * peramban tidak dibanjiri. Menyalinnya ke empat halaman berarti empat salinan
 * yang perlahan berbeda, dan bedanya baru ketahuan saat salah satunya lupa
 * mengosongkan halaman lalu pengguna melihat tabel kosong.
 *
 * <h2>Semuanya string, dan itu disengaja</h2>
 *
 * URL memang cuma berisi teks. Menerjemahkannya menjadi angka atau enum adalah
 * urusan halaman yang memakainya, karena hanya halaman itu yang tahu nilai apa
 * saja yang sah. Hook yang mencoba menebaknya akan salah pada halaman
 * berikutnya.
 */
export function useUrlState<K extends string>(
  defaults: Record<K, string>,
): [Record<K, string>, (perubahan: Partial<Record<K, string>>) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  const values = useMemo(() => {
    const hasil = {} as Record<K, string>
    for (const key of Object.keys(defaults) as K[]) {
      hasil[key] = searchParams.get(key) ?? defaults[key]
    }
    return hasil
    // `defaults` sengaja tidak jadi kebergantungan. Pemanggilnya menuliskannya
    // sebagai literal, jadi acuannya baru setiap render, dan memasukkannya di
    // sini membuat nilai ini dihitung ulang terus-menerus tanpa ada yang
    // berubah.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const setValues = useCallback(
    (perubahan: Partial<Record<K, string>>) => {
      const params = new URLSearchParams(searchParams)

      for (const [key, value] of Object.entries(perubahan) as [K, string][]) {
        /*
          Nilai bawaan DIHAPUS dari URL, bukan ditulis.

          Tanpa ini setiap alamat berisi rentetan `?page=1&search=&division=`
          yang menyebutkan hal yang sama dengan alamat kosong. Yang paling
          terasa saat orang menyalin tautannya: yang dikirim jadi terlihat rumit
          padahal tidak menyaring apa pun.
        */
        if (value === '' || value == null || value === defaults[key]) {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }

      /*
        Mengubah penyaring apa pun mengembalikan ke halaman pertama.

        Tanpa ini, orang yang sedang di halaman 7 lalu memilih penyaring baru
        mendarat di halaman 7 dari hasil yang mungkin cuma dua halaman, dan
        yang tampil tabel kosong yang terbaca persis seperti "tidak ada
        datanya".

        Hanya berlaku kalau halamannya memang dikelola di sini, dan tidak
        berlaku saat yang diubah justru nomor halamannya sendiri.
      */
      if ('page' in defaults && !('page' in perubahan)) {
        params.delete('page')
      }

      /*
        `replace`, bukan menambah riwayat.

        Kotak cari memanggil ini pada tiap ketikan. Dengan riwayat yang
        bertambah, menekan Kembali sekali setelah mengetik "penjualan" berarti
        menghapus satu huruf, dan orang harus menekannya sembilan kali untuk
        keluar dari satu pencarian.

        Yang ditukar: tombol Kembali tidak membatalkan penyaring. Tautan yang
        bisa dibagikan dan halaman yang tahan disegarkan lebih berharga
        daripada itu, dan ini keputusan yang sama dengan yang sudah dipakai
        katalog.
      */
      setSearchParams(params, { replace: true })
    },
    // Alasan yang sama dengan di atas: `defaults` literal baru tiap render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, setSearchParams],
  )

  return [values, setValues]
}

/**
 * Membaca nomor halaman dari URL. SELALU berbasis 1.
 *
 * <h2>Kenapa berbasis 1, dan kenapa tidak bisa dipilih</h2>
 *
 * URL dibaca manusia. Orang yang melihat "halaman 2 dari 3" lalu membaca
 * `?page=1` di alamatnya wajar mengira ada yang rusak, dan ia tidak salah:
 * dua angka yang menyebut hal yang sama seharusnya sama.
 *
 * API-nya memang berbasis 0, tetapi itu urusan pemanggilnya. Halaman yang
 * memakainya mengurangi satu tepat saat menyusun permintaan, di satu baris
 * yang terlihat.
 *
 * Basisnya sengaja TIDAK bisa dipilih. Versi pertama fungsi ini menerimanya
 * sebagai parameter, dan dua halaman admin langsung memilih 0 karena itu yang
 * cocok dengan API-nya. Hasilnya alamat yang menyebut halaman satu lebih
 * kecil dari yang tertulis di layar, di dua halaman sekaligus.
 *
 * <h2>Nilai yang tidak masuk akal</h2>
 *
 * Isinya dikendalikan siapa pun yang menyunting alamatnya, jadi `?page=abc`
 * dan `?page=-3` mendarat di halaman pertama. Diteruskan mentah, keduanya
 * menghasilkan tabel kosong atau permintaan yang ditolak server, dan yang
 * dilihat orang cuma layar kosong tanpa penjelasan.
 */
export function pageFromUrl(value: string): number {
  const angka = Number.parseInt(value, 10)
  return Number.isFinite(angka) && angka >= 1 ? angka : 1
}
