import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // Selama pengembangan, permintaan /api diteruskan ke Spring Boot lewat proxy
  // Vite. Dengan begitu browser melihat satu origin saja: CORS tidak pernah
  // ikut bermain, dan path-nya identik dengan produksi (di belakang reverse
  // proxy). Ganti target lewat VITE_DEV_PROXY_TARGET bila port back-end beda.
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || "http://localhost:8082";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
    },
    server: {
      port: 5174,
      proxy: {
        // Polanya "/api/", BUKAN "/api". Vite mencocokkan berdasarkan AWALAN,
        // jadi "/api" ikut menangkap "/api-docs", "/api-keys", dan alamat lain
        // yang kebetulan berawalan sama -- lalu meneruskannya ke Spring Boot,
        // yang menjawabnya dengan 401 alih-alih membiarkan router front-end
        // menampilkan halaman "tidak ditemukan".
        //
        // Garis miring di ujung menutup celah itu: hanya yang benar-benar
        // berada DI BAWAH /api yang diteruskan.
        "^/api/": { target: proxyTarget, changeOrigin: true },
      },
    },
    build: {
      // Peta sumber produksi sengaja dimatikan: berkas .map membocorkan seluruh
      // kode sumber, termasuk komentar dan nama variabel internal.
      sourcemap: false,
    },
  };
});
