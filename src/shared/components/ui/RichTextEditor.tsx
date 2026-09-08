import Quill from 'quill'
import { useEffect, useRef } from 'react'

import { sanitizeRichText } from '@/shared/lib/richText'

import 'quill/dist/quill.snow.css'

/**
 * Editor teks kaya untuk deskripsi dataset.
 *
 * <h2>Yang sengaja TIDAK ada di bilah alatnya</h2>
 *
 * Tidak ada unggah gambar, video, maupun berkas. Bukan karena sulit, melainkan
 * karena editor semacam ini menyimpan gambar sebagai data URL — satu tangkapan
 * layar bisa membengkakkan satu baris database sampai puluhan megabita, dan
 * baris itu ikut terbawa setiap kali daftar dataset dimuat. Berkas dataset
 * punya jalurnya sendiri yang mengurus ukuran, jenis, dan hak akses.
 *
 * Tidak ada pula pewarnaan huruf dan latar. Rupa tulisan datang dari lembar
 * gaya aplikasi supaya seluruh katalog terbaca seragam; warna yang dipilih
 * tangan hanya menghasilkan deskripsi yang tampak berbeda-beda tanpa alasan,
 * dan sebagian di antaranya tidak cukup kontras untuk dibaca.
 *
 * <h2>Tiga lapis, dan yang menahan bukan editornya</h2>
 *
 * <ol>
 *   <li>{@code formats} di bawah membatasi apa yang editor mau simpan, termasuk
 *       saat orang MENEMPEL dari Word atau dari halaman lain. Tanpa itu,
 *       tempelan membawa serta warna, ukuran huruf, dan tabel.</li>
 *   <li>{@code sanitizeRichText} membersihkan isinya sebelum berangkat. Quill
 *       2.0.3 punya cacat XSS yang belum ditambal pada ekspor HTML-nya
 *       (CVE-2025-15056); lapisan ini yang membuat cacat itu tidak menentukan
 *       apa-apa bagi kita.</li>
 *   <li>Back-end membersihkannya lagi saat menyimpan, dan ITU penjagaan yang
 *       sesungguhnya — dua lapisan pertama ada di peramban, dan peramban bisa
 *       dilewati siapa pun yang memanggil API-nya langsung.</li>
 * </ol>
 */

/*
  Format yang boleh hidup di dalam editor.

  Daftarnya cocok dengan tombol di bilah alat DAN dengan daftar putih di
  back-end. Yang di luar daftar ini dibuang Quill saat ditempel, jadi tulisan
  yang disalin dari Word masuk sebagai teks berformat seadanya alih-alih
  membawa serta seluruh gaya dokumen asalnya.
*/
const FORMATS = [
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'blockquote',
  'header',
  'link',
]

/*
  Nama tiap tombol, dalam bahasa Indonesia.

  Quill tidak memberi nama apa pun pada tombolnya: yang tergambar cuma ikon,
  dan dua di antaranya -- Tautan dan Hapus format -- TIDAK melakukan apa-apa
  sampai ada teks yang diseleksi. Tanpa keterangan, tombol yang ditekan lalu
  diam terbaca sebagai tombol rusak, dan orang berhenti mencobanya.

  Karena itu keduanya menyebutkan syaratnya sekalian. Judulnya juga jadi nama
  bagi pembaca layar, yang tanpa ini hanya mendengar "tombol".
*/
const BUTTON_LABELS: Record<string, string> = {
  'button.ql-bold': 'Tebal',
  'button.ql-italic': 'Miring',
  'button.ql-underline': 'Garis bawah',
  'button.ql-strike': 'Coret',
  'button.ql-header[value="2"]': 'Judul bagian',
  'button.ql-list[value="ordered"]': 'Daftar bernomor',
  'button.ql-list[value="bullet"]': 'Daftar butir',
  'button.ql-blockquote': 'Kutipan',
  'button.ql-link': 'Tautan — pilih dulu teks yang ingin ditautkan',
  'button.ql-clean': 'Hapus format — pilih dulu teks yang ingin dipolos-kan',
}

const TOOLBAR = [
  ['bold', 'italic', 'underline', 'strike'],
  /*
    SATU tingkat judul, bukan dua.

    Deskripsi dataset duduk di dalam kartu yang judulnya sendiri 16px,
    sementara isinya 14,5px. Celah di antara keduanya cuma cukup untuk satu
    tingkat judul yang benar-benar terbaca sebagai judul; memaksakan dua
    membuat yang kedua nyaris tidak bisa dibedakan dari tulisan biasa.

    Pilihan yang lebih sedikit juga membuat deskripsi di seluruh katalog
    terbaca lebih seragam, dan itu justru guna katalog bersama.
  */
  [{ header: 2 }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['blockquote', 'link'],
  ['clean'],
]

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  const wrapper = useRef<HTMLDivElement>(null)
  const quill = useRef<Quill | null>(null)

  /*
    `onChange` dipegang lewat ref, bukan jadi kebergantungan efek.

    Pemanggilnya membuat fungsi baru tiap render. Kalau efek pemasangan editor
    bergantung padanya, editor dibongkar-pasang setiap ketikan — kursor lompat
    ke awal dan seluruh riwayat urung-batal hilang.
  */
  const emit = useRef(onChange)
  emit.current = onChange

  useEffect(() => {
    const parent = wrapper.current
    if (!parent) {
      return
    }

    /*
      Wadah editornya dibuat di sini, bukan ditulis di JSX.

      Quill menyisipkan bilah alatnya sebagai SAUDARA wadah yang diberikan,
      bukan sebagai anaknya. Kalau wadah itu elemen tetap milik JSX, satu-
      satunya yang bisa dibersihkan saat efek ini berakhir adalah isi wadahnya
      — sementara bilah alatnya tertinggal di luar.

      Akibatnya terlihat langsung di development: React StrictMode sengaja
      menjalankan efek dua kali untuk menemukan pembersihan yang bocor, dan
      yang muncul di layar adalah DUA bilah alat bertumpuk. Dengan wadah yang
      dibuat di dalam sini, keduanya menjadi anak `wrapper`, dan satu baris
      pembersihan membuang dua-duanya.
    */
    const container = document.createElement('div')
    parent.appendChild(container)

    const editor = new Quill(container, {
      theme: 'snow',
      placeholder,
      formats: FORMATS,
      modules: { toolbar: TOOLBAR },
    })
    quill.current = editor

    // Dipasang pada elemen yang benar-benar bisa disunting, bukan pada
    // pembungkusnya. Pembaca layar mengumumkan nama dari elemen yang menerima
    // fokus, dan yang menerima fokus adalah `editor.root`.
    if (ariaLabel) {
      editor.root.setAttribute('aria-label', ariaLabel)
    }

    for (const [pemilih, nama] of Object.entries(BUTTON_LABELS)) {
      const tombol = parent.querySelector(pemilih)
      if (tombol) {
        tombol.setAttribute('title', nama)
        tombol.setAttribute('aria-label', nama)
      }
    }

    if (value) {
      /*
        Isi awal dimasukkan lewat `dangerouslyPasteHTML`, dan namanya memang
        menakutkan — tetapi yang dimasukkan sudah dibersihkan lebih dulu, dan
        Quill sendiri masih menyaringnya sekali lagi lewat `formats` di atas.

        Yang penting: ini TIDAK memakai `innerHTML`. Menulis langsung ke DOM
        editor melewati model internal Quill, sehingga isinya tampil di layar
        tetapi tidak dianggap ada oleh editornya — perubahan pertama akan
        menghapus semuanya.
      */
      editor.clipboard.dangerouslyPasteHTML(sanitizeRichText(value), 'silent')
    }

    editor.on('text-change', () => {
      const html = editor.getSemanticHTML()
      // Editor yang dikosongkan menyisakan paragraf kosong. Dikirim apa adanya,
      // deskripsi yang sudah dihapus tetap terhitung ada.
      const clean = sanitizeRichText(html)
      emit.current(editor.getText().trim() === '' ? '' : clean)
    })

    return () => {
      quill.current = null
      // Membuang wadah editor DAN bilah alat yang disisipkan Quill di
      // sebelahnya. Keduanya anak `parent`, jadi cukup satu baris.
      parent.innerHTML = ''
    }
    // Sengaja hanya sekali. `value` yang berubah ditangani efek di bawah,
    // karena memasang ulang editor tiap kali nilainya berubah berarti
    // memasangnya ulang tiap ketikan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
    Menyusul perubahan `value` yang datang dari LUAR.

    Terjadi setelah penyimpanan berhasil: formulir memuat ulang dirinya dari
    respons server. Perbandingannya wajib — tanpa itu, setiap ketikan memicu
    penulisan ulang isi editor dan kursor melompat ke awal baris.
  */
  useEffect(() => {
    const editor = quill.current
    if (!editor) {
      return
    }
    const current = editor.getText().trim() === '' ? '' : sanitizeRichText(editor.getSemanticHTML())
    if (current === value) {
      return
    }
    editor.clipboard.dangerouslyPasteHTML(sanitizeRichText(value), 'silent')
  }, [value])

  return <div ref={wrapper} className="satudata-editor" />
}
