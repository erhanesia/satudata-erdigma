import {
  compressPdfBytes,
  type ImageResizer,
  type ImageSource,
  type PdfScanStats,
} from './compressPdf'

/**
 * Mengecilkan berkas unggahan di utas terpisah.
 *
 * <h2>Kenapa harus di worker</h2>
 *
 * Membongkar dan menyandikan ulang belasan gambar memakan detik-detik penuh
 * CPU. Di utas utama, itu berarti tampilan membeku: tombol tidak menanggapi,
 * teks yang sedang diketik tidak muncul, dan spinner pun ikut berhenti
 * berputar. Yang terlihat penerbit bukan "sedang bekerja" melainkan "sudah
 * hang", dan biasanya ia menutup tabnya.
 *
 * Ironisnya, animasi loading yang justru diminta demi pengalaman pengguna tidak
 * akan berjalan sama sekali tanpa pemisahan ini.
 *
 * <h2>Kenapa pdf-lib dimuat di sini, bukan di halaman</h2>
 *
 * pdf-lib sekitar 430 KB. Karena worker dibundel terpisah oleh Vite, berkas
 * sebesar itu baru diunduh saat ada yang benar-benar mengunggah, bukan saat
 * orang membuka panel admin.
 */

/**
 * Membentangkan gambar, menyusutkannya, lalu menyandikannya sebagai JPEG.
 *
 * `resizeQuality: 'high'` bukan pemanis. Menyusutkan 4000 piksel menjadi 1600
 * dalam satu langkah menghasilkan gambar bergerigi, karena yang diambil cuma
 * sebagian piksel dan sisanya dibuang. Opsi ini menyuruh peramban menyusutkan
 * bertahap, dipercepat perangkat keras pula, sehingga tidak perlu pustaka
 * penskalaan tambahan.
 */
const resizeImage: ImageResizer = async (source, maxDimension, quality) => {
  try {
    const asal = await bitmapOf(source)
    if (!asal) return null

    /*
      Gambar yang dimensinya sudah pas TIDAK ditolak, cuma tidak disusutkan.

      Penyandian ulangnya tetap berjalan, dan di situlah penghematan
      terbesarnya sering berada: gambar 1200x800 yang tersimpan sebagai
      sampel mentah bisa menyusut berkali lipat sebagai JPEG tanpa satu
      piksel pun hilang dimensinya.
    */
    const terpanjang = Math.max(asal.width, asal.height)
    const skala = terpanjang > maxDimension ? maxDimension / terpanjang : 1
    const width = Math.max(1, Math.round(asal.width * skala))
    const height = Math.max(1, Math.round(asal.height * skala))

    const kecil =
      skala === 1
        ? asal
        : await createImageBitmap(asal, {
            resizeWidth: width,
            resizeHeight: height,
            resizeQuality: 'high',
          })
    if (kecil !== asal) asal.close()

    const canvas = new OffscreenCanvas(width, height)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      kecil.close()
      return null
    }
    ctx.drawImage(kecil, 0, 0)
    kecil.close()

    const hasil = await canvas.convertToBlob({ type: 'image/jpeg', quality })
    return { bytes: new Uint8Array(await hasil.arrayBuffer()), width, height }
  } catch {
    /*
      Gambar yang tidak bisa dibaca peramban DILEWATI, bukan menggagalkan
      seluruh berkas.

      Membiarkan satu gambar semacam itu membatalkan seluruh pengecilan berarti
      menukar penghematan dengan unggahan yang gagal, dan itu pertukaran yang
      jelas merugikan.
    */
    return null
  }
}

/**
 * Mengubah isi gambar menjadi bitmap, apa pun bentuk simpanannya.
 *
 * Jalur JPEG cukup dibungkus Blob karena byte-nya memang berkas JPEG utuh.
 * Jalur mentah harus disusun sendiri menjadi RGBA, karena PDF menyimpan
 * sampelnya rapat tanpa kanal alpha: tiga byte per piksel untuk RGB, satu byte
 * untuk abu-abu.
 */
async function bitmapOf(source: ImageSource): Promise<ImageBitmap | null> {
  if (source.kind === 'jpeg') {
    return createImageBitmap(new Blob([source.bytes as BlobPart], { type: 'image/jpeg' }))
  }

  const { samples, width, height, components } = source
  const piksel = width * height
  const rgba = new Uint8ClampedArray(piksel * 4)

  /*
    `?? 0` ada karena noUncheckedIndexedAccess, bukan karena sampelnya benar
    bisa kosong: panjangnya sudah diperiksa di sourceOf sebelum sampai ke
    sini. Kalau toh meleset, piksel hitam jauh lebih baik daripada NaN yang
    merambat ke seluruh gambar.
  */
  if (components === 3) {
    for (let i = 0, j = 0; i < piksel; i++, j += 3) {
      const k = i * 4
      rgba[k] = samples[j] ?? 0
      rgba[k + 1] = samples[j + 1] ?? 0
      rgba[k + 2] = samples[j + 2] ?? 0
      rgba[k + 3] = 255
    }
  } else {
    for (let i = 0; i < piksel; i++) {
      const abu = samples[i] ?? 0
      const k = i * 4
      rgba[k] = abu
      rgba[k + 1] = abu
      rgba[k + 2] = abu
      rgba[k + 3] = 255
    }
  }

  return createImageBitmap(new ImageData(rgba, width, height))
}

export interface WorkerRequest {
  id: number
  kind: string
  bytes: ArrayBuffer
}

export interface WorkerResponse {
  id: number
  bytes: ArrayBuffer | null
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const { id, kind, bytes } = event.data

  try {
    if (kind === 'CSV') {
      await kecilkanCsv(id, bytes)
      return
    }

    if (kind !== 'PDF') {
      // Format lain tidak punya jalurnya. Dijawab "tidak ada yang berubah",
      // bukan galat, supaya pemanggilnya cukup mengirim berkas aslinya.
      ;(self as unknown as Worker).postMessage({ id, bytes: null } satisfies WorkerResponse)
      return
    }

    const stats: PdfScanStats = {
      images: 0,
      jpeg: 0,
      flate: 0,
      unsupported: 0,
      small: 0,
      tiny: 0,
      huge: 0,
      mask: 0,
      noGain: 0,
      imageBytes: 0,
    }

    const asal = bytes.byteLength
    const mulai = performance.now()
    const hasil = await compressPdfBytes(new Uint8Array(bytes), resizeImage, stats)
    const keluaran = hasil ? bufferOf(hasil.bytes) : null

    /*
      Dilaporkan ke konsol, bukan disimpan.

      Ketika sebuah berkas tidak mengecil, sebabnya bisa bermacam-macam dan
      semuanya terlihat sama di layar. Angka-angka ini membuat sebabnya bisa
      dibaca tanpa perlu mengirimkan berkasnya ke mana pun, dan dokumen
      internal memang tidak selalu boleh berpindah tangan.

      Dukungan Flate lahir dari laporan semacam ini: 122 dari 129 gambar pada
      sebuah berkas nyata ternyata bukan JPEG, dan gambar-gambar itu memuat
      91,9% ukuran berkasnya.
    */
    const persen = (n: number) => `${((100 * n) / asal).toFixed(1)}%`
    console.info(
      [
        '[kompresi pdf]',
        `asal=${asal}`,
        `hasil=${hasil ? hasil.bytes.length : asal}`,
        `diganti=${hasil ? hasil.replaced : 0}`,
        `ms=${Math.round(performance.now() - mulai)}`,
        '|',
        `gambar=${stats.images}`,
        `byteGambar=${stats.imageBytes} (${persen(stats.imageBytes)})`,
        '|',
        `jpeg=${stats.jpeg}`,
        `flate=${stats.flate}`,
        `takDidukung=${stats.unsupported}`,
        `byteKecil=${stats.small}`,
        `mungil=${stats.tiny}`,
        `raksasa=${stats.huge}`,
        `topeng=${stats.mask}`,
        `takUntung=${stats.noGain}`,
      ].join(' '),
    )

    ;(self as unknown as Worker).postMessage(
      { id, bytes: keluaran } satisfies WorkerResponse,
      keluaran ? [keluaran] : [],
    )
  } catch {
    // Gagal ke arah mengirim berkas ASLI. Berkas setengah jadi jauh lebih
    // buruk daripada berkas yang tidak jadi dikecilkan.
    ;(self as unknown as Worker).postMessage({ id, bytes: null } satisfies WorkerResponse)
  }
}

/**
 * Membungkus CSV dengan gzip.
 *
 * <h2>Kenapa gzip, dan kenapa tanpa pustaka</h2>
 *
 * CSV satu-satunya format kita yang isinya belum terkompresi. PDF, DOCX, dan
 * XLSX sudah mengompresi dirinya sendiri, jadi membungkusnya lagi menambah
 * ukuran alih-alih mengurangi.
 *
 * `CompressionStream` bawaan peramban, jadi tidak ada pustaka yang perlu
 * diunduh dan penyandiannya berjalan di luar utas JavaScript.
 *
 * <h2>Ini LOSSLESS</h2>
 *
 * Berbeda dengan pengecilan gambar pada PDF yang membuang detail untuk
 * selamanya, di sini tidak ada satu byte pun yang hilang. Server membuka
 * kompresinya begitu berkasnya tiba, dan yang tersimpan sama persis dengan
 * yang dipilih penerbit.
 *
 * <h2>Rasionya sangat bergantung isi</h2>
 *
 * Diukur pada dua berkas nyata: ekspor log unduhan tinggal 7,1% karena
 * alamat surel dan kode divisi yang sama muncul ribuan kali, sedangkan data
 * pelanggan berisi nama dan alamat yang berbeda-beda tinggal 47,0%.
 */
async function kecilkanCsv(id: number, bytes: ArrayBuffer) {
  const asal = bytes.byteLength
  const mulai = performance.now()

  try {
    const aliran = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
    const hasil = await new Response(aliran).arrayBuffer()

    /*
      Hasil yang tidak cukup lebih kecil dibuang.

      CSV nyaris selalu menyusut, tetapi "nyaris" bukan "selalu": CSV berisi
      data acak atau yang isinya sudah terkompresi bisa justru bertambah.
      Kalau begitu, tidak ada gunanya menanggung beban membuka kompresi di
      setiap pembacaan selamanya.
    */
    const layak = hasil.byteLength < asal * 0.85

    console.info(
      [
        '[kompresi csv]',
        `asal=${asal}`,
        `hasil=${hasil.byteLength}`,
        `sisa=${((100 * hasil.byteLength) / asal).toFixed(1)}%`,
        `ms=${Math.round(performance.now() - mulai)}`,
        layak ? 'dipakai' : 'dibuang, tidak cukup mengecil',
      ].join(' '),
    )

    ;(self as unknown as Worker).postMessage(
      { id, bytes: layak ? hasil : null } satisfies WorkerResponse,
      layak ? [hasil] : [],
    )
  } catch {
    // Peramban tanpa CompressionStream, atau apa pun yang gagal: kirim
    // berkas aslinya. Gagal ke arah mengirim yang asli.
    ;(self as unknown as Worker).postMessage({ id, bytes: null } satisfies WorkerResponse)
  }
}

/** Menyalin ke ArrayBuffer yang berdiri sendiri supaya bisa dipindahkan. */
function bufferOf(bytes: Uint8Array): ArrayBuffer {
  const salinan = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(salinan).set(bytes)
  return salinan
}
