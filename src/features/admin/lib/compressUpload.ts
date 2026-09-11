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
  /**
   * Pengecilannya berhenti karena galat.
   *
   * Harus dibedakan dari berhasil tetapi tidak ada yang bisa dikurangi, walau
   * keduanya sama-sama mengembalikan berkas asli tanpa `originalSize`. Tanpa
   * pembedaan ini, layar mengucapkan "sudah sekecil yang bisa" untuk berkas
   * yang bahkan tidak pernah selesai diperiksa, dan kalimat itu menghentikan
   * orang dari mencoba lagi.
   */
  failed?: boolean
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
 * Rantai giliran. Pekerjaan berikutnya menempel pada ujungnya.
 *
 * Sengaja berupa janji yang disambung, bukan kolam worker. Yang dibutuhkan
 * cuma jaminan "satu pada satu waktu", dan itu dua baris; kolam menuntut
 * pembukuan yang harus dijaga benar padahal tidak ada yang meminta
 * kecepatannya.
 */
let antrean: Promise<unknown> = Promise.resolve()

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
export function compressUpload(file: File, kind: string): Promise<CompressionOutcome> {
  if (!willCompress(file, kind)) return Promise.resolve({ file })

  /*
    Hanya satu berkas dikecilkan pada satu waktu.

    Tiap baris berkas punya kotak pilihnya sendiri, jadi memilih berkas kedua
    sementara yang pertama masih dikerjakan bukan hal aneh sama sekali: dialog
    berkasnya terbuka sementara worker sebelumnya masih bekerja, dan PDF 12 MB
    memakan belasan detik.

    Tanpa antrean, setiap pilihan melahirkan worker-nya sendiri. Masing-masing
    bisa memegang gambar sebesar MAX_PIXELS, sekitar 160 juta byte sebagai
    RGBA, di luar salinan berkasnya sendiri. Tiga yang berjalan bersamaan sudah
    setengah gigabyte hanya untuk piksel, dan yang terjadi bukan terasa lambat
    melainkan tab yang tertutup sendiri.

    Menunggu giliran tidak membuat jawaban tertukar: hasil milik baris yang
    sudah diganti penerbit tetap dibuang di pemanggilnya.
  */
  const giliran = antrean.then(() => jalankan(file, kind))
  // Rantainya tidak boleh putus karena satu kegagalan. `jalankan` sendiri tidak
  // pernah melempar, ini penjagaan untuk jalur yang kelak ditambahkan.
  antrean = giliran.catch(() => undefined)
  return giliran
}

/** Satu pekerjaan pengecilan yang sudah mendapat gilirannya. */
async function jalankan(file: File, kind: string): Promise<CompressionOutcome> {
  /*
    Worker dibuat per pekerjaan lalu ditutup.

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

    const jawaban = await new Promise<WorkerResponse>((resolve, reject) => {
      worker!.onmessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id !== id) return
        resolve(event.data)
      }
      worker!.onerror = () => reject(new Error('worker gagal'))
      worker!.postMessage({ id, kind, bytes } satisfies WorkerRequest, [bytes])
    })

    // Seluruh jawabannya dibawa, bukan byte-nya saja, supaya sebab "tidak ada
    // hasil" tidak hilang di perjalanan.
    if (jawaban.failed) return { file, failed: true }
    if (!jawaban.bytes) return { file }

    const kecil = new File([jawaban.bytes], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    })

    // Penjagaan terakhir. compressPdfBytes sudah menolak hasil yang membengkak,
    // tetapi memeriksanya sekali lagi di sini membuat jaminan "tidak pernah
    // memperbesar" berlaku untuk jalur mana pun yang kelak ditambahkan.
    if (kecil.size >= file.size) return { file }

    return { file: kecil, originalSize: file.size }
  } catch {
    // Worker yang tidak bisa dibuat sama sekali, atau yang mati di tengah
    // jalan. Berkas aslinya tetap dikirim, tetapi ini kegagalan dan bukan
    // hasil pemeriksaan.
    return { file, failed: true }
  } finally {
    worker?.terminate()
  }
}
