import DOMPurify from 'dompurify'

/**
 * Aturan tentang HTML deskripsi dataset, di satu tempat.
 *
 * <h2>Yang menahan bukan berkas ini</h2>
 *
 * Penjagaan yang sesungguhnya ada di back-end, di `RichTextSanitizer`. Apa pun
 * yang dikerjakan di sini bisa dilewati begitu seseorang memanggil endpoint-nya
 * langsung, dan yang tersimpan di database itulah yang kelak digambar di
 * halaman semua orang.
 *
 * Yang dikerjakan berkas ini dua hal lain, dan keduanya tetap berguna:
 *
 * <ol>
 *   <li><b>Apa yang berangkat.</b> Quill 2.0.3 punya cacat XSS yang belum
 *       ditambal pada fitur ekspor HTML-nya (CVE-2025-15056). Membersihkan isi
 *       editor sebelum dikirim membuat cacat itu tidak menentukan apa-apa bagi
 *       kita: yang berangkat sudah bersih sebelum menyentuh jaringan.</li>
 *   <li><b>Apa yang digambar.</b> Deskripsi yang datang dari server memang
 *       sudah dibersihkan saat disimpan, tetapi baris lama bisa saja tersimpan
 *       sebelum pembersih itu ada. Membersihkan ulang saat menggambar berarti
 *       halaman tidak pernah bergantung pada kapan sebuah baris ditulis.</li>
 * </ol>
 *
 * <h2>Daftarnya sengaja sama persis dengan back-end</h2>
 *
 * Kalau keduanya berbeda, yang terjadi bukan celah keamanan melainkan
 * kebingungan: tulisan yang terlihat benar di editor hilang sebagian setelah
 * disimpan, atau sebaliknya. Setiap perubahan di sini harus dipasangkan dengan
 * perubahan di `RichTextSanitizer`.
 */

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  's',
  'ul',
  'ol',
  'li',
  'blockquote',
  // Satu tingkat judul saja; lihat alasannya di RichTextEditor.
  'h2',
  'a',
]

const ALLOWED_ATTR = ['href', 'rel', 'target']

/**
 * Membersihkan HTML deskripsi.
 *
 * `ALLOWED_URI_REGEXP` menutup protokol yang bisa menjalankan kode. Bawaan
 * DOMPurify sudah aman, tetapi ditulis ulang di sini supaya daftarnya terbaca
 * bersama daftar tag di atas alih-alih tersembunyi di dalam pustakanya.
 */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
  })
}

/**
 * Apakah isi ini sudah berupa HTML, atau masih teks polos.
 *
 * <h2>Kenapa perlu dibedakan</h2>
 *
 * Deskripsi yang ditulis sebelum editor teks kaya ada tersimpan sebagai teks
 * polos, lengkap dengan baris baru yang diketik orangnya. Menggambarnya sebagai
 * HTML membuat seluruh baris barunya lenyap — HTML tidak menganggap baris baru
 * sebagai apa pun — dan paragraf yang dulu tersusun rapi berubah jadi satu
 * gumpalan panjang.
 *
 * Kebalikannya juga tidak boleh: menggambar HTML sebagai teks polos akan
 * menampilkan tag-nya mentah-mentah di layar.
 *
 * Pemeriksaannya sederhana dan memang cuma perlu sederhana: satu-satunya
 * penghasil HTML di sini adalah editornya sendiri, dan ia selalu membungkus
 * isinya dengan tag.
 */
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

/**
 * Mengubah deskripsi menjadi satu baris teks polos.
 *
 * Dipakai kartu dan daftar hasil, yang memotong deskripsi jadi dua baris.
 * Menggambar HTML di sana salah dua kali: tebal dan daftar bernomor merusak
 * kerapian kartu yang seharusnya seragam, dan `line-clamp` menghitung baris
 * hasil gambar sehingga potongannya jadi tak terduga.
 *
 * Diurai lewat parser peramban, bukan dibuang dengan regex. Regex pada HTML
 * selalu punya bentuk yang meleset, dan di sini melesetnya berarti potongan
 * tag ikut tampil sebagai tulisan.
 */
export function richTextToPlain(html: string): string {
  if (!looksLikeHtml(html)) {
    return html
  }
  const doc = new DOMParser().parseFromString(sanitizeRichText(html), 'text/html')
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim()
}
