import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  decodePDFRawStream,
} from 'pdf-lib'

/**
 * Mengecilkan PDF dengan menyandikan ulang foto di dalamnya, tanpa menyentuh
 * teksnya.
 *
 * <h2>Kenapa gambarnya, bukan berkasnya</h2>
 *
 * PDF sudah mengompresi dirinya sendiri. Diukur pada berkas nyata di proyek
 * ini, 91% isinya berupa stream yang sudah ter-Flate dengan rasio 1,9x,
 * sehingga membungkusnya lagi dengan gzip cuma menghemat 7,6%. Yang benar-benar
 * bisa dikecilkan adalah gambar di dalamnya.
 *
 * Ekspor Canva dan PowerPoint menyimpan gambar pada resolusi ASLINYA, bukan
 * pada resolusi yang tampil. Foto 4000 piksel yang dikecilkan menjadi kotak
 * 10 cm di slide tetap tersimpan 4000 piksel. Jadi sebagian besar yang dibuang
 * di sini memang tidak pernah terlihat sekali pun.
 *
 * <h2>Kenapa TIDAK meratakan halaman menjadi gambar</h2>
 *
 * Ada jalan yang jauh lebih mudah: gambar tiap halaman ke canvas lalu susun
 * ulang jadi PDF baru. Semua kasus pinggir hilang sendirinya, dan kerjanya
 * sekitar setengah hari.
 *
 * Ditolak karena teks berhenti menjadi teks: tidak bisa dicari, tidak bisa
 * disalin. Pengguna di sini sudah terbiasa dengan hasil iLovePDF, yang teksnya
 * tetap bisa disalin, jadi hasil seperti itu akan terasa seperti kemunduran.
 *
 * <h2>Ini LOSSY, dan itu disengaja</h2>
 *
 * Detail foto yang hilang tidak bisa dikembalikan. Yang tidak tersentuh: teks,
 * vektor, font, tabel, dan seluruh struktur dokumennya.
 */

/** Sisi terpanjang yang dituju, dalam piksel. */
export const MAX_DIMENSION = 1600

/** Mutu JPEG hasil penyandian ulang. */
export const JPEG_QUALITY = 0.75

/**
 * Gambar yang lebih kecil dari ini dibiarkan.
 *
 * <h2>Kenapa byte, bukan piksel</h2>
 *
 * Versi pertama memakai ukuran piksel, dan itu keliru. Pada berkas Canva
 * nyata berukuran 12,5 MB, 120 dari 129 gambarnya sudah di bawah 1600
 * piksel sehingga tidak pernah tersentuh, padahal seluruhnya memakan 91,9%
 * ukuran berkas: rata-rata 90 KB per gambar. Mereka tidak kebesaran
 * dimensinya, melainkan boros penyandiannya.
 *
 * Ukuran piksel semestinya hanya menentukan PERLU DIPERKECIL atau tidak,
 * bukan menentukan boleh disentuh atau tidak. Yang menentukan sepadan atau
 * tidaknya adalah berapa byte yang ia makan.
 */
const MIN_BYTES = 20 * 1024

/**
 * Gambar mungil dilewati. Ikon dan logo tidak menyumbang apa pun pada ukuran
 * berkas, sementara menyandikannya ulang tetap memakan waktu dan menurunkan
 * mutunya.
 */
const MIN_PIXELS = 64 * 64

/**
 * Penghematan sekecil ini tidak sepadan dengan mutu yang ditukar.
 *
 * Tanpa ambang ini, gambar yang sudah tersimpan sebagai JPEG bermutu wajar
 * akan disandikan ulang demi hemat dua persen, dan yang benar-benar terjadi
 * adalah mutunya turun satu tingkat setiap kali berkas itu diunggah ulang.
 */
const MIN_SAVING = 0.15

/**
 * Gambar raksasa dilewati, apa pun penyaringnya.
 *
 * Satu gambar 40 megapiksel menempati sekitar 160 juta byte sebagai RGBA, dan
 * itu sudah cukup untuk menjatuhkan tab pada laptop yang sedang sibuk.
 *
 * <h2>Kenapa JPEG ikut dibatasi</h2>
 *
 * Semula batas ini hanya dipasang pada jalur Flate, dengan alasan JPEG bisa
 * diminta dibaca lebih jarang. Alasan itu keliru: `createImageBitmap` tidak
 * menjanjikan pembacaan bertingkat, dan opsi `resizeWidth` menyusutkan
 * SETELAH gambarnya dibentangkan utuh.
 *
 * Justru JPEG yang lebih berbahaya, karena rasio kompresinya menyembunyikan
 * ukuran sesungguhnya. Bidang warna rata 20000x20000 piksel muat dalam
 * beberapa ratus kilobyte, sehingga ia lolos MIN_BYTES dengan mudah, lalu
 * menuntut 1,6 gigabyte begitu dibentangkan. Gambar Flate setidaknya
 * mengumumkan ukurannya dengan menjadi besar di dalam berkas.
 *
 * Karena itu batasnya dipasang di perulangan utama dan dibaca dari /Width
 * dan /Height pada kamusnya, sehingga tidak ada satu byte gambar pun yang
 * dibongkar sebelum ukurannya diketahui.
 */
const MAX_PIXELS = 40_000_000

/** Gambar yang siap disandikan ulang, dalam bentuk apa pun ia tersimpan. */
export type ImageSource =
  | { kind: 'jpeg'; bytes: Uint8Array }
  | {
      kind: 'raw'
      samples: Uint8Array
      width: number
      height: number
      /** 1 untuk abu-abu, 3 untuk RGB. */
      components: 1 | 3
    }

/**
 * Penyandi ulang satu gambar.
 *
 * <h2>Kenapa disuntikkan, bukan dipanggil langsung</h2>
 *
 * Di peramban ini memakai `createImageBitmap` dan `OffscreenCanvas`, yang tidak
 * ada di luar peramban. Memisahkannya membuat bagian yang paling berisiko di
 * berkas ini, yaitu pembedahan graf objek PDF, bisa diuji tanpa peramban sama
 * sekali.
 *
 * Mengembalikan `null` berarti gambarnya tidak bisa atau tidak perlu disentuh,
 * dan gambar aslinya harus dibiarkan apa adanya.
 */
export type ImageResizer = (
  source: ImageSource,
  maxDimension: number,
  quality: number,
) => Promise<{ bytes: Uint8Array; width: number; height: number } | null>

export interface PdfCompressionResult {
  bytes: Uint8Array
  /** Berapa gambar yang benar-benar diganti. */
  replaced: number
}

/**
 * Apa yang ditemukan di dalam PDF, dan kenapa gambar-gambarnya dilewati.
 *
 * <h2>Kenapa ini ada</h2>
 *
 * "Tidak ada yang bisa dikecilkan" punya banyak sebab yang berbeda, dan dari
 * layar semuanya terlihat sama persis: ukuran tidak berubah. Angka-angka ini
 * yang membedakannya, tanpa perlu mengirimkan berkasnya ke mana pun.
 *
 * Ini bukan hiasan. Dukungan Flate di bawah ada justru karena angka-angka ini
 * menunjukkan 122 dari 129 gambar pada sebuah berkas nyata tersimpan Flate,
 * bukan JPEG, dan di situlah 91,9% ukurannya berada.
 */
export interface PdfScanStats {
  images: number
  jpeg: number
  flate: number
  /** Bukan JPEG maupun Flate yang bisa ditafsirkan. */
  unsupported: number
  /** Terlalu sedikit byte-nya untuk sepadan disentuh. */
  small: number
  tiny: number
  huge: number
  /** Hasilnya tidak cukup lebih kecil, jadi yang asli dipertahankan. */
  noGain: number
  imageBytes: number
}

/**
 * Mengembalikan versi yang lebih kecil, atau `null` bila tidak ada yang bisa
 * dikerjakan.
 *
 * `null` juga dikembalikan bila hasilnya ternyata TIDAK lebih kecil. Itu bukan
 * kemungkinan teoretis: menyandikan ulang bisa membengkakkan berkas, terutama
 * bila gambar aslinya sudah pas-pasan. Aturannya sederhana, yang dipakai selalu
 * yang lebih kecil.
 */
export async function compressPdfBytes(
  input: Uint8Array,
  resize: ImageResizer,
  stats?: PdfScanStats,
): Promise<PdfCompressionResult | null> {
  const doc = await PDFDocument.load(input, {
    // Metadata tidak disentuh. Memperbaruinya mengubah tanggal ubah dokumen
    // menjadi hari ini, dan bagi katalog data itu keterangan yang keliru:
    // yang berubah ukurannya, bukan isinya.
    updateMetadata: false,
  })

  let replaced = 0

  /*
    Seluruh objek ditelusuri langsung, bukan lewat halaman demi halaman.

    Gambar di ekspor Canva dan PowerPoint kerap bersarang di dalam Form XObject,
    kadang beberapa lapis. Menelusuri lewat halaman berarti harus turun sendiri
    ke tiap lapisnya sambil menjaga jangan sampai berputar. Daftar objek tak
    langsung sudah rata, jadi gambar yang sama ditemukan sekali di mana pun ia
    dipakai, dan mengganti isinya otomatis berlaku untuk seluruh rujukannya.
  */
  for (const [ref, obj] of doc.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue

    const dict = obj.dict
    if (nameOf(dict, 'Subtype') !== '/Image') continue

    if (stats) {
      stats.images++
      stats.imageBytes += obj.contents.length
    }

    const width = numberOf(dict, 'Width')
    const height = numberOf(dict, 'Height')
    if (width === null || height === null) continue

    if (width * height < MIN_PIXELS) {
      if (stats) stats.tiny++
      continue
    }

    /*
      Batas atas dipasang di sini, bukan di dalam sourceOf, supaya ia berlaku
      untuk jalur JPEG maupun Flate.

      Yang dibaca keterangan /Width dan /Height, jadi keputusannya diambil
      tanpa menyentuh satu byte pun isi gambarnya. Lihat MAX_PIXELS.
    */
    if (width * height > MAX_PIXELS) {
      if (stats) stats.huge++
      continue
    }

    /*
      Gerbangnya byte, bukan piksel.

      Gambar yang dimensinya sudah kecil TETAP diproses, karena penghematan
      terbesarnya sering datang dari mengganti penyandiannya, bukan dari
      menyusutkannya. Yang menjaga supaya ini tidak merugikan adalah
      pemeriksaan MIN_SAVING di bawah: hasil yang tidak cukup lebih kecil
      dibuang, dan yang asli dipertahankan.
    */
    if (obj.contents.length < MIN_BYTES) {
      if (stats) stats.small++
      continue
    }

    const sumber = sourceOf(obj, dict, width, height, stats)
    if (!sumber) continue

    const hasil = await resize(sumber, MAX_DIMENSION, JPEG_QUALITY)
    if (!hasil) continue

    // Hasil yang tidak cukup lebih kecil dibuang, termasuk yang membengkak.
    if (hasil.bytes.length > obj.contents.length * (1 - MIN_SAVING)) {
      if (stats) stats.noGain++
      continue
    }

    doc.context.assign(ref, PDFRawStream.of(jpegDict(doc, dict, hasil), hasil.bytes))
    replaced++
  }

  if (replaced === 0) return null

  /*
    useObjectStreams mengumpulkan objek-objek kecil ke dalam stream terkompresi.
    Bukan penghematan utama di sini, tetapi gratis dan searah dengan tujuannya.
  */
  const bytes = await doc.save({ useObjectStreams: true })

  if (bytes.length >= input.length) return null

  return { bytes, replaced }
}

/**
 * Menyiapkan isi gambar dalam bentuk yang bisa dibaca peramban.
 *
 * <h2>Dua jalur, dan kenapa keduanya perlu</h2>
 *
 * Semula hanya `/DCTDecode` yang ditangani, karena byte stream-nya ADALAH
 * berkas JPEG yang utuh sehingga peramban bisa membacanya langsung.
 *
 * Ternyata itu jauh dari cukup. Pada berkas Canva nyata berukuran 12,5 MB,
 * 122 dari 129 gambarnya tersimpan `/FlateDecode`, dan gambar-gambar itu
 * memuat 91,9% ukuran berkasnya. Menangani JPEG saja berarti berkas seperti
 * itu sama sekali tidak mengecil.
 *
 * Jalur Flate lebih berat: isinya sampel mentah, jadi lebar, tinggi, jumlah
 * kanal warna, dan kedalaman bit harus ditafsirkan sendiri. Yang tidak
 * dikenali dilewati, dan itu disengaja: salah menafsirkan menghasilkan gambar
 * yang warnanya melenceng tanpa satu pun galat.
 */
function sourceOf(
  stream: PDFRawStream,
  dict: PDFDict,
  width: number,
  height: number,
  stats?: PdfScanStats,
): ImageSource | null {
  /*
    Filter boleh berupa satu nama atau larik nama yang diterapkan berurutan.
    Yang diterima hanya yang berdiri sendiri: rantai seperti
    [/FlateDecode /DCTDecode] berarti byte-nya terbungkus lapisan lain.
  */
  const filter = nameOf(dict, 'Filter')

  if (filter === '/DCTDecode') {
    if (stats) stats.jpeg++
    return { kind: 'jpeg', bytes: stream.contents }
  }

  if (filter !== '/FlateDecode') {
    if (stats) stats.unsupported++
    return null
  }

  /*
    Gambar berprediktor dilewati, dan ini WAJIB diperiksa sendiri.

    `decodePDFRawStream` cuma membuka Flate-nya. Isi pdf-lib bisa dibaca
    langsung di core/streams/decode.js: untuk FlateDecode ia mengembalikan
    `new FlateStream(stream)` dan parameter /DecodeParms tidak pernah dipakai
    sama sekali. Tidak ada PredictorStream di dalam pustakanya.

    Akibatnya senyap, dan itu yang membuatnya berbahaya. Prediktor PNG
    menambahkan satu byte penanda di depan SETIAP baris, jadi hasilnya justru
    LEBIH panjang daripada width * height * components. Pemeriksaan panjang di
    bawah ikut lolos, penanda barisnya terbaca sebagai piksel, dan setiap baris
    bergeser satu byte terhadap baris sebelumnya. Yang tersimpan gambar yang
    warnanya berantakan, tanpa satu pun galat.

    Prediktornya tidak diterapkan sendiri di sini, dan itu pilihan sadar:
    menuliskannya berarti menambah penyandi yang salahnya juga senyap, demi
    gambar yang belum tentu ada. Melewatinya cuma kehilangan penghematan, dan
    itu jauh lebih murah daripada berkas yang rusak.
  */
  if (usesPredictor(dict)) {
    if (stats) stats.unsupported++
    return null
  }

  const components = componentsOf(dict)
  if (components === null || numberOf(dict, 'BitsPerComponent') !== 8) {
    if (stats) stats.unsupported++
    return null
  }

  /*
    /ImageMask dan /Decode dilewati.

    Keduanya menandakan sampelnya tidak berarti apa adanya: ImageMask adalah
    cetakan satu bit, dan Decode memetakan ulang rentang nilainya, misalnya
    membalik hitam dengan putih. Menyandikannya ulang tanpa ikut menerapkan
    pemetaannya menghasilkan gambar yang terbalik atau salah warna.
  */
  if (dict.get(PDFName.of('ImageMask')) || dict.get(PDFName.of('Decode'))) {
    if (stats) stats.unsupported++
    return null
  }

  let samples: Uint8Array
  try {
    samples = decodePDFRawStream(stream).decode()
  } catch {
    if (stats) stats.unsupported++
    return null
  }

  // Sampel yang jumlahnya tidak sesuai berarti tafsiran kita meleset. Lebih
  // baik dilewati daripada menghasilkan gambar yang tergeser warnanya.
  if (samples.length < width * height * components) {
    if (stats) stats.unsupported++
    return null
  }

  if (stats) stats.flate++
  return { kind: 'raw', samples, width, height, components }
}

/**
 * Apakah stream ini memakai prediktor.
 *
 * Tidak adanya /Predictor berarti 1, yaitu tanpa prediktor, dan itu bentuk
 * yang paling umum. Nilai apa pun selain angka 1 dianggap memakai prediktor,
 * termasuk nilai yang bentuknya tidak terduga: kamus yang aneh lebih baik
 * dilewati daripada ditebak.
 *
 * /DecodeParms boleh berupa kamus tunggal atau larik yang sejajar dengan larik
 * /Filter. Keduanya ditangani, walau yang sampai ke sini seharusnya hanya
 * bentuk pertama karena penyaring berlarik sudah ditolak di atas.
 */
function usesPredictor(dict: PDFDict): boolean {
  const parms = dict.lookup(PDFName.of('DecodeParms'))
  const daftar: unknown[] =
    parms instanceof PDFArray
      ? Array.from({ length: parms.size() }, (_, i) => parms.lookup(i))
      : [parms]

  return daftar.some((p) => {
    if (!(p instanceof PDFDict)) return false
    const nilai = p.lookup(PDFName.of('Predictor'))
    if (nilai === undefined || nilai === null) return false
    return !(nilai instanceof PDFNumber) || nilai.asNumber() !== 1
  })
}

/**
 * Jumlah kanal warna, atau null bila ruang warnanya tidak ditangani.
 *
 * CMYK sengaja tidak didukung: canvas peramban tidak menanganinya dengan
 * benar, dan hasilnya gambar yang warnanya jauh melenceng. Indexed juga tidak,
 * karena menuntut membaca tabel paletnya lebih dulu.
 */
function componentsOf(dict: PDFDict): 1 | 3 | null {
  const cs = dict.get(PDFName.of('ColorSpace'))
  const nama = cs?.toString() ?? ''

  if (nama === '/DeviceRGB') return 3
  if (nama === '/DeviceGray') return 1

  /*
    ICCBased menyimpan jumlah kanalnya pada /N di stream profilnya, dan itulah
    bentuk yang paling sering dipakai Canva maupun PowerPoint. Tanpa menangani
    ini, sebagian besar gambar Flate akan terlewat percuma.
  */
  const rujukan = dict.lookup(PDFName.of('ColorSpace'))
  const larik = rujukan as { size?: () => number; lookup?: (i: number) => unknown } | undefined
  if (typeof larik?.size === 'function' && larik.size() === 2) {
    const jenis = larik.lookup?.(0)?.toString()
    if (jenis === '/ICCBased') {
      const profil = larik.lookup?.(1) as PDFRawStream | undefined
      const n = profil?.dict ? numberOf(profil.dict, 'N') : null
      if (n === 1) return 1
      if (n === 3) return 3
    }
  }

  return null
}

/**
 * Kamus untuk gambar hasil penyandian ulang.
 *
 * Selalu menjadi JPEG RGB, apa pun bentuk aslinya. Karena itu penyaringnya,
 * ruang warnanya, dan kedalaman bitnya ikut ditulis ulang; membiarkan
 * keterangan lama berarti penampil PDF membaca byte JPEG memakai aturan Flate,
 * dan yang muncul bukan galat melainkan gambar berupa bercak berwarna.
 *
 * `/SMask` sengaja dibiarkan apa adanya. Soft mask adalah gambar terpisah
 * berisi tingkat kebeningan tiap piksel, dan menurut spesifikasi PDF ukurannya
 * tidak wajib sama dengan gambar induknya: penampil yang menskalakannya. Ini
 * penting untuk ekspor Canva, yang penuh lapisan bertransparansi.
 */
function jpegDict(
  doc: PDFDocument,
  dict: PDFDict,
  hasil: { bytes: Uint8Array; width: number; height: number },
): PDFDict {
  const baru = dict.clone(doc.context)
  baru.set(PDFName.of('Width'), PDFNumber.of(hasil.width))
  baru.set(PDFName.of('Height'), PDFNumber.of(hasil.height))
  baru.set(PDFName.of('Length'), PDFNumber.of(hasil.bytes.length))
  baru.set(PDFName.of('Filter'), PDFName.of('DCTDecode'))
  baru.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'))
  baru.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8))
  baru.delete(PDFName.of('DecodeParms'))
  return baru
}

function nameOf(dict: PDFDict, key: string): string | null {
  return dict.get(PDFName.of(key))?.toString() ?? null
}

function numberOf(dict: PDFDict, key: string): number | null {
  const nilai = dict.get(PDFName.of(key))
  if (nilai instanceof PDFNumber) return nilai.asNumber()
  const angka = Number(nilai?.toString())
  return Number.isFinite(angka) ? angka : null
}
