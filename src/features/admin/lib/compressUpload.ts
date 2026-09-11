import type { WorkerRequest, WorkerResponse } from './compressUpload.worker'

/**
 * Mengecilkan berkas sebelum diunggah.
 *
 * <h2>Kenapa di peramban, bukan di server</h2>
 *
 * Rancangan awalnya di server, dan itu menuntut `client_max_body_size` di nginx
 * dinaikkan supaya berkas besar sempat sampai untuk dikecilkan. Infrastruktur
 * tidak boleh diubah, jadi kompresinya dipindahkan ke sini.
 *
 * Tiga hal ikut selesai karenanya, dan bukan sekadar mengecil:
 *
 * <ol>
 *   <li>nginx tidak perlu disentuh, karena yang lewat kabel memang sudah kecil</li>
 *   <li>Server tidak menanggung apa pun: tidak ada CPU terpakai, tidak ada
 *       puluhan MB piksel di heap, tidak ada risiko container mati</li>
 *   <li>Pemeriksaan batas kembali pasti. Karena pengecilan terjadi SEBELUM
 *       tombol Terbitkan ditekan, formulir sudah tahu ukuran akhirnya dan bisa
 *       langsung memutuskan, alih-alih menunggu unggahan selesai untuk tahu
 *       ditolak</li>
 * </ol>
 *
 * <h2>Urutannya menentukan</h2>
 *
 * <pre>berkas dipilih -&gt; dikecilkan -&gt; BARU diperiksa batasnya</pre>
 *
 * Kalau dibalik, berkas 40 MB ditolak sebelum sempat dikecilkan, dan seluruh
 * gunanya hilang.
 */

/**
 * Berkas di bawah ini dibiarkan.
 *
 * Bukan karena tidak bisa dikecilkan, melainkan karena tidak sepadan. Berkas
 * 3 MB sudah terunduh dalam sekitar dua detik, dan memangkasnya menjadi
 * setengah detik tidak ada yang merasakan, sementara penerbitnya tetap harus
 * menunggu prosesnya.
 */
export const COMPRESS_ABOVE_BYTES = 5 * 1024 * 1024

/**
 * Format yang dikecilkan di peramban.
 *
 * DOCX dan XLSX sengaja TIDAK ada di sini, dan itu bukan karena belum
 * sempat. Keduanya sudah berupa ZIP, jadi isinya sudah terkompresi, dan
 * satu-satunya yang bisa dikecilkan cuma gambar di dalamnya. Diukur pada dua
 * berkas nyata dari katalog: DOCX 10,4 MB tinggal 94,9% setelah gambarnya
 * dikecilkan, dan XLSX 4,9 MB tinggal 92,7%. Yang membuat keduanya berat
 * bukan gambar, melainkan font terbenam pada yang pertama dan datanya
 * sendiri pada yang kedua.
 */
const SUPPORTED = new Set(['PDF', 'CSV'])

export interface CompressionOutcome {
  /** Berkas yang harus dikirim: hasil pengecilan, atau berkas asli. */
  file: File
  /** Ukuran sebelum dikecilkan, atau undefined bila tidak ada yang berubah. */
  originalSize?: number
}

/**
 * Apakah berkas ini akan melewati jalur pengecilan.
 *
 * Dipakai tampilan untuk memutuskan menampilkan penanda sedang bekerja atau
 * tidak. Berkas yang tidak akan disentuh sebaiknya tidak memunculkan spinner
 * yang berkelebat sepersekian detik lalu hilang.
 */
export function willCompress(file: File, kind: string): boolean {
  return SUPPORTED.has(kind) && file.size > COMPRESS_ABOVE_BYTES
}

let berikutnya = 0

/**
 * Mengecilkan bila memungkinkan, atau mengembalikan berkas aslinya.
 *
 * <h2>Tidak pernah melempar</h2>
 *
 * Apa pun yang gagal, yang dikembalikan berkas asli. Kegagalan mengecilkan
 * bukan alasan untuk menggagalkan penerbitan: yang terburuk hanya berkas yang
 * tetap besar, dan itu ditolak oleh pemeriksaan batas dengan pesan yang jelas.
 * Gagal ke arah mengirim yang asli.
 */
export async function compressUpload(file: File, kind: string): Promise<CompressionOutcome> {
  if (!willCompress(file, kind)) return { file }

  /*
    Worker dibuat per pemanggilan lalu ditutup.

    Worker yang dipakai bersama memang menghemat waktu muat pustakanya, tetapi
    menuntut pembukuan agar jawaban satu berkas tidak tertukar dengan berkas
    lain saat penerbit mengganti pilihannya di tengah jalan. Pengecilan jarang
    terjadi, jadi kerumitan itu tidak sepadan dengan yang dihematnya.
  */
  let worker: Worker | null = null

  try {
    worker = new Worker(new URL('./compressUpload.worker.ts', import.meta.url), {
      type: 'module',
    })

    const id = (berikutnya += 1)
    const bytes = await file.arrayBuffer()

    const hasil = await new Promise<ArrayBuffer | null>((resolve, reject) => {
      worker!.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id !== id) return
        resolve(event.data.bytes)
      }
      worker!.onerror = () => reject(new Error('worker gagal'))
      worker!.postMessage({ id, kind, bytes } satisfies WorkerRequest, [bytes])
    })

    if (!hasil) return { file }

    const kecil = new File([hasil], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    })

    // Penjagaan terakhir. compressPdfBytes sudah menolak hasil yang membengkak,
    // tetapi memeriksanya sekali lagi di sini membuat jaminan "tidak pernah
    // memperbesar" berlaku untuk jalur mana pun yang kelak ditambahkan.
    if (kecil.size >= file.size) return { file }

    return { file: kecil, originalSize: file.size }
  } catch {
    return { file }
  } finally {
    worker?.terminate()
  }
}
