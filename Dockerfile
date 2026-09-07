# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Tahap build
#
# `--platform=$BUILDPLATFORM` menahan tahap ini di arsitektur runner (amd64),
# bukan arsitektur target (arm64, box t4g). Keluarannya berkas statis yang
# tidak bergantung arsitektur, jadi tidak ada alasan menjalankan npm dan Vite
# di bawah emulasi QEMU — yang membuat build berlipat lamanya.
# ---------------------------------------------------------------------------
FROM --platform=$BUILDPLATFORM node:22-alpine AS build
WORKDIR /build

# Manifest disalin lebih dulu supaya lapisan `npm ci` tetap kena cache selama
# dependensinya tidak berubah.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Nilai VITE_* dibaca saat BUILD dan ikut terpanggang ke berkas JavaScript.
# Menaruhnya di `environment:` docker compose tidak berpengaruh sama sekali:
# mengubahnya berarti build ulang, bukan restart container.
ARG VITE_API_BASE_URL=""
ARG VITE_COGNITO_DOMAIN=""
ARG VITE_COGNITO_CLIENT_ID=""
ARG VITE_COGNITO_REDIRECT_URI=""

# Dua nilai ini wajib: src/shared/config/env.ts memvalidasinya dan melempar
# galat SAAT HALAMAN DIBUKA, bukan saat build. Tanpa penjagaan di sini, build
# arg yang lupa di-pass menghasilkan image yang lolos CI, ter-deploy, lalu
# menampilkan layar galat ke pengguna. Lebih baik gagal keras di sini.
RUN : "${VITE_COGNITO_DOMAIN:?build-arg VITE_COGNITO_DOMAIN wajib diisi}" \
 && : "${VITE_COGNITO_CLIENT_ID:?build-arg VITE_COGNITO_CLIENT_ID wajib diisi}"

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_COGNITO_DOMAIN=$VITE_COGNITO_DOMAIN \
    VITE_COGNITO_CLIENT_ID=$VITE_COGNITO_CLIENT_ID \
    VITE_COGNITO_REDIRECT_URI=$VITE_COGNITO_REDIRECT_URI

RUN npm run build

# ---------------------------------------------------------------------------
# Tahap runtime — nginx statis, multi-arch, ikut arsitektur target.
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine
COPY --from=build /build/dist /usr/share/nginx/html
COPY deploy/nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
