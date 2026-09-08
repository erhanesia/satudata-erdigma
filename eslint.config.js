import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'src/shared/types/api.generated.ts'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Keamanan: menyisipkan HTML mentah dari API membuka pintu XSS.
      // Seluruh teks dari back-end dirender sebagai teks biasa.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'JSXAttribute[name.name="dangerouslySetInnerHTML"]',
          message:
            'dangerouslySetInnerHTML dilarang — data dari API dirender sebagai teks, bukan HTML.',
        },
        {
          selector: "CallExpression[callee.name='eval']",
          message: 'eval() dilarang.',
        },
      ],

      // localStorage tidak boleh dipakai menyimpan kredensial. Dilarang total
      // supaya tidak ada yang tergoda; sessionStorage khusus pemilihan user
      // dummy sudah dibungkus di features/auth.
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: 'Jangan simpan apa pun di localStorage — rawan XSS.' },
      ],
    },
  },

  /*
    Satu-satunya berkas yang boleh menyisipkan HTML, dan daftarnya sengaja
    sepanjang satu baris.

    Larangan di atas tetap berlaku di seluruh berkas lain, dan memang harus:
    menyisipkan teks dari API apa adanya persis bentuk masalah yang membuat XSS
    ada. Deskripsi dataset kini ditulis lewat editor teks kaya, jadi ia HARUS
    digambar sebagai HTML -- tidak ada cara lain menampilkan tebal, daftar, dan
    tautan.

    Yang membuat pengecualian ini bisa dipertanggungjawabkan bukan pengecualian
    itu sendiri, melainkan tiga hal di sekelilingnya:

      1. RichText membersihkan isinya lewat DOMPurify dengan daftar putih,
         tepat sebelum menggambar. Tidak ada jalan masuk lain ke elemen itu.
      2. Back-end membersihkannya lagi saat MENYIMPAN, dengan daftar putih yang
         sama. Itu penjagaan yang sesungguhnya, karena peramban bisa dilewati
         siapa pun yang memanggil API-nya langsung.
      3. Editornya membatasi format yang bisa masuk, termasuk saat menempel.

    Mempersempitnya ke satu berkas -- bukan ke satu folder, apalagi mematikan
    aturannya -- membuat setiap penambahan penyisipan HTML baru harus melewati
    penyuntingan berkas ini, dan karena itu terlihat di review.
  */
  {
    files: ['src/shared/components/ui/RichText.tsx'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
)
