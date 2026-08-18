# Aset statis

Tempat menyimpan logo, ikon khusus, dan gambar yang dipakai antarmuka.

## Di mana aset diletakkan

Aturannya satu kalimat: **dipakai lebih dari satu fitur → di sini; dipakai satu
fitur saja → di dalam fitur itu.**

```
src/
├─ shared/assets/              ← lintas halaman: logo, ilustrasi bersama
│   ├─ logo-erdigma.png        ← logo penuh (lambang + tulisan ERDIGMA)
│   └─ logo-erdigma-mark.png   ← lambang saja, dipakai di navbar
│
└─ features/
    ├─ dataset/
    │   ├─ assets/             ← hanya dipakai fitur dataset
    │   ├─ components/
    │   └─ pages/
    └─ status/
        └─ assets/
```

Kenapa aset per-fitur menempel di dalam foldernya, bukan dikumpulkan jadi
`shared/assets/dataset/`: proyek ini sudah menganut "satu fitur, satu folder".
Kalau aset dipisah ke pohon lain yang cabangnya sama persis, setiap fitur jadi
punya barang di dua tempat — dan saat sebuah fitur dihapus, folder asetnya
gampang tertinggal jadi sampah yang tidak ada yang berani buang.

Folder `assets/` di dalam fitur **dibuat saat dibutuhkan saja**, tidak perlu
disiapkan kosong di semua fitur.

## Cara memakainya

Selalu lewat `import`, jangan pernah menulis path sebagai teks:

```tsx
import logoErdigma from '@/shared/assets/logo-erdigma-mark.png'

<img src={logoErdigma} alt="Erdigma" width={120} height={28} />
```

Tiga hal yang didapat dengan cara ini, dan hilang kalau path ditulis manual:

- **Salah ketik ketahuan saat build**, bukan jadi gambar rusak di layar pengguna.
- **Nama berkas diberi hash** (`logo-erdigma-a3f9c1.svg`), jadi peramban tidak
  pernah menyajikan versi lama setelah logonya diganti.
- **Berkas di bawah 4 KB otomatis di-*inline*** jadi data URI — hemat satu
  permintaan jaringan.

Impor `.svg`, `.png`, dan kawan-kawannya sudah bertipe lewat `vite/client` di
`src/vite-env.d.ts`, jadi tidak perlu deklarasi tambahan.

## Kapan memakai `public/` (hampir tidak pernah)

Folder `public/` di akar proyek hanya untuk berkas yang **namanya wajib tetap**
di akar situs, karena dirujuk dari luar aplikasi:

| Berkas | Kenapa harus di `public/` |
| --- | --- |
| `favicon.ico` | Dicari peramban di alamat tetap |
| `robots.txt` | Dicari mesin pencari di alamat tetap |
| Gambar preview tautan | URL-nya dipasang di meta tag, harus stabil |

Selain itu, taruh di `assets/`. Berkas di `public/` disalin apa adanya: tidak
di-hash, tidak diperiksa, dan kalau tidak terpakai tetap ikut terbawa ke build
selamanya.

## Penamaan

- Huruf kecil, dipisah tanda hubung: `logo-erdigma-putih.svg`
- Sebutkan variannya di belakang: `-putih`, `-gelap`, `-mono`
- Jangan menaruh ukuran di nama (`logo-200px.png`) — ukuran ditentukan CSS

## SVG atau PNG

**SVG** untuk logo, ikon, dan ilustrasi datar — tajam di semua ukuran dan
biasanya jauh lebih kecil. **PNG** hanya untuk gambar yang memang bukan vektor,
misalnya foto atau tangkapan layar. **JPG** untuk foto berwarna kaya.

## Ikon

Sebagian besar ikon di aplikasi ini **bukan berkas** — semuanya dari pustaka
[`lucide-react`](https://lucide.dev), dipakai di 18 berkas:

```tsx
import { Download, ShieldX } from 'lucide-react'
```

Cari dulu di sana sebelum menambahkan berkas ikon baru. Ikon dari pustaka ikut
mewarisi warna teks (`currentColor`) dan tidak menambah permintaan jaringan.
Simpan `.svg` sendiri hanya untuk ikon yang memang khas perusahaan dan tidak ada
padanannya di lucide.

## Logo yang perlu berubah warna

Logo yang diimpor sebagai berkas **tidak bisa diwarnai lewat CSS** — warnanya
terkunci seperti di berkasnya. Kalau logo perlu tampil putih di header gelap
sekaligus berwarna di tempat lain, ada dua jalan:

1. **Sediakan dua berkas** — `logo-erdigma.svg` dan `logo-erdigma-putih.svg`.
   Paling sederhana, tanpa dependensi tambahan.
2. **Pasang `vite-plugin-svgr`** supaya SVG bisa diimpor sebagai komponen React
   dan diwarnai dengan `className`. Lebih luwes, tapi menambah satu dependensi.

**Kasus nyata di proyek ini.** Logo Erdigma berupa satu bujur sangkar berisi
lambang heksagon berwarna di atas dan tulisan "ERDIGMA" hitam di bawah. Slot
logo di navbar hanya 34 px — pada ukuran itu tulisannya jadi setinggi 3,9 px,
tidak terbaca. Karena itu disediakan `logo-erdigma-mark.png`: lambangnya saja,
dirapatkan ke isi lalu diperkecil ke 144 px (11 KB, dari 114 KB berkas penuh).
Tulisannya memang tidak diperlukan di navbar, sebab di sebelahnya sudah tertulis
"Satu Data Erdigma".

Pakai `logo-erdigma.png` yang penuh untuk tempat yang lapang — halaman login,
footer, atau dokumen cetak.
