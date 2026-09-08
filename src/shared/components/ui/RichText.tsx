import { cn } from '@/shared/lib/cn'
import { looksLikeHtml, sanitizeRichText } from '@/shared/lib/richText'

/**
 * Menggambar deskripsi dataset.
 *
 * <h2>Dibersihkan lagi di sini, meski server sudah membersihkannya</h2>
 *
 * Bukan karena server tidak dipercaya, melainkan karena TIDAK SEMUA baris
 * melewatinya. Deskripsi yang tersimpan sebelum pembersih di back-end ada tidak
 * pernah disentuhnya, dan baris seperti itu tetap akan digambar di halaman ini.
 * Membersihkan ulang saat menggambar membuat halaman tidak bergantung pada
 * kapan sebuah baris ditulis.
 *
 * Biayanya kecil dan hasilnya bisa dijelaskan dalam satu kalimat: tidak ada
 * jalan dari database ke layar yang tidak melewati pembersih.
 *
 * <h2>Teks polos digambar sebagai teks polos</h2>
 *
 * Deskripsi lama ditulis sebelum editor teks kaya ada, dan baris barunya
 * diketik langsung. HTML tidak menganggap baris baru sebagai apa pun, jadi
 * menggambarnya sebagai HTML akan meleburkan paragraf yang dulu tersusun rapi
 * menjadi satu gumpalan. `whitespace-pre-wrap` mempertahankannya.
 */
export function RichText({ html, className }: { html: string; className?: string }) {
  if (!looksLikeHtml(html)) {
    return <p className={cn('whitespace-pre-wrap', className)}>{html}</p>
  }

  return (
    <div
      className={cn('satudata-prose', className)}
      // Isinya baru saja melewati pembersih dengan daftar putih yang sama
      // dengan milik back-end. Tanpa itu, baris ini memang persis bentuk
      // masalah yang membuat XSS ada.
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
    />
  )
}
