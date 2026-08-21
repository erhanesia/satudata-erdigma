import axios from 'axios'

import { env } from '@/shared/config/env'

import { notifySessionChanged } from './sessionSignal'
import type { AuthStrategy } from './types'

/**
 * Token akses disimpan di **memori modul**, bukan localStorage maupun
 * sessionStorage.
 *
 * Alasannya: apa pun yang ada di Web Storage bisa dibaca skrip mana pun yang
 * berhasil berjalan di halaman ini. Satu celah XSS — dari dependensi pihak
 * ketiga sekalipun — langsung berubah menjadi pencurian token.
 *
 * Konsekuensinya, sesi ikut hilang setiap kali tab dimuat ulang. Itu ditebus
 * oleh re-auth senyap: Cognito masih memegang cookie sesinya sendiri, jadi
 * kunjungan ulang ke /oauth2/authorize memantul balik tanpa pengguna melihat
 * formulir apa pun.
 */
let accessToken: string | null = null
let refreshToken: string | null = null
let expiresAt: number | null = null

/** Satu penyegaran yang sedang berjalan, dibagi ke semua pemanggil. */
let refreshInFlight: Promise<boolean> | null = null

/**
 * Kunci sessionStorage. Tidak satu pun berisi kredensial:
 *  - verifier dan state hidup hanya selama satu perjalanan ke Hosted UI,
 *  - tujuan sekadar alamat halaman,
 *  - penanda pernah-masuk sekadar boolean.
 */
const KUNCI_VERIFIER = 'satudata.pkce-verifier'
const KUNCI_STATE = 'satudata.oauth-state'
const KUNCI_TUJUAN = 'satudata.tujuan-setelah-masuk'
const KUNCI_PERNAH_MASUK = 'satudata.pernah-masuk'

/** Disamakan persis dengan hris-web supaya bentuk token yang terbit sama. */
const SCOPE = 'email openid phone aws.cognito.signin.user.admin'

interface BalasanToken {
  access_token: string
  refresh_token?: string
  expires_in: number
}

function alamatBalik(): string {
  return env.cognito.redirectUri || window.location.origin
}

/** Halaman yang harus dibuka setelah kembali dari Hosted UI. */
function tujuanSaatIni(): string {
  const sekarang = window.location.pathname + window.location.search
  // Mengembalikan orang ke /login setelah berhasil masuk hanya akan
  // memantulkannya lagi. Beranda jauh lebih masuk akal.
  return sekarang.startsWith('/login') ? '/' : sekarang
}

function base64url(bytes: Uint8Array): string {
  let biner = ''
  for (const b of bytes) biner += String.fromCharCode(b)
  return btoa(biner).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function acak(panjangByte: number): string {
  const bytes = new Uint8Array(panjangByte)
  crypto.getRandomValues(bytes)
  return base64url(bytes)
}

async function challengeDari(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

/**
 * Memanggil endpoint token Cognito.
 *
 * Memakai axios telanjang, bukan `httpClient`: yang dituju bukan API Satu Data,
 * tidak boleh membawa header autentikasi, dan interceptor 401 di sana justru
 * akan memanggil balik kode di berkas ini.
 */
async function tukar(params: URLSearchParams): Promise<BalasanToken | null> {
  try {
    const balasan = await axios.post<BalasanToken>(
      `${env.cognito.domain}/oauth2/token`,
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    )
    return balasan.data
  } catch {
    // Sengaja tidak di-console.log: badan galat bisa memuat kode otorisasi.
    return null
  }
}

function simpan(data: BalasanToken): void {
  accessToken = data.access_token
  // Cognito merotasi refresh token. Yang lama harus ditimpa — menyimpan yang
  // basi adalah cara paling pasti membuat sesi mati mendadak di tengah kerja.
  if (data.refresh_token) refreshToken = data.refresh_token
  expiresAt = Date.now() + data.expires_in * 1000
  sessionStorage.setItem(KUNCI_PERNAH_MASUK, '1')
  notifySessionChanged()
}

function lupakanToken(): void {
  accessToken = null
  refreshToken = null
  expiresAt = null
  notifySessionChanged()
}

export function pernahMasuk(): boolean {
  return sessionStorage.getItem(KUNCI_PERNAH_MASUK) !== null
}

export function lupakanPernahMasuk(): void {
  sessionStorage.removeItem(KUNCI_PERNAH_MASUK)
}

/**
 * Berangkat ke Hosted UI.
 *
 * Async karena PKCE challenge dihitung dengan `crypto.subtle`, sedangkan
 * `signIn()` pada antarmuka bersifat sinkron. Selisihnya satu tick sebelum
 * peramban berpindah halaman, dan tidak ada yang menunggu hasilnya.
 */
async function berangkat(): Promise<void> {
  const verifier = acak(64)
  const state = acak(16)

  sessionStorage.setItem(KUNCI_VERIFIER, verifier)
  sessionStorage.setItem(KUNCI_STATE, state)
  sessionStorage.setItem(KUNCI_TUJUAN, tujuanSaatIni())

  const challenge = await challengeDari(verifier)

  // /oauth2/authorize, BUKAN /login yang dipakai hris-web. Bedanya menentukan:
  // /oauth2/authorize menghormati cookie sesi Cognito yang sudah ada dan
  // langsung memantulkan pengguna kembali, sedangkan /login selalu memaksa
  // formulir. Seluruh re-auth senyap bergantung pada perbedaan ini.
  const url = new URL(`${env.cognito.domain}/oauth2/authorize`)
  url.searchParams.set('client_id', env.cognito.clientId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('redirect_uri', alamatBalik())
  url.searchParams.set('state', state)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')

  window.location.assign(url.toString())
}

/**
 * Menyelesaikan kepulangan dari Hosted UI.
 *
 * Dipanggil sekali dari `bootstrapAuth()` sebelum React dirender. Tanpa `?code`
 * di alamat, tidak melakukan apa-apa.
 */
export async function completeSignIn(): Promise<void> {
  const alamat = new URL(window.location.href)
  const code = alamat.searchParams.get('code')
  if (!code) return

  const state = alamat.searchParams.get('state')
  const stateTersimpan = sessionStorage.getItem(KUNCI_STATE)
  const verifier = sessionStorage.getItem(KUNCI_VERIFIER)
  const tujuan = sessionStorage.getItem(KUNCI_TUJUAN) ?? '/'

  // Dibuang lebih dulu, apa pun hasilnya di bawah: satu verifier untuk satu
  // perjalanan, dan sisa yang tertinggal hanya akan membingungkan percobaan
  // berikutnya.
  sessionStorage.removeItem(KUNCI_STATE)
  sessionStorage.removeItem(KUNCI_VERIFIER)
  sessionStorage.removeItem(KUNCI_TUJUAN)

  // State yang tidak cocok berarti balasan ini bukan milik permintaan kita.
  // Jangan ditukar. hris-web tidak melakukan pemeriksaan ini.
  const sah = state !== null && stateTersimpan !== null && state === stateTersimpan

  if (sah && verifier) {
    const params = new URLSearchParams()
    params.append('grant_type', 'authorization_code')
    params.append('client_id', env.cognito.clientId)
    params.append('code', code)
    params.append('redirect_uri', alamatBalik())
    params.append('code_verifier', verifier)

    const data = await tukar(params)
    if (data) simpan(data)
  }

  // Kode otorisasi dibuang dari alamat supaya tidak tertinggal di riwayat
  // peramban dan tidak ikut ter-bookmark. Sekalian mengembalikan pengguna ke
  // halaman yang tadi dituju — router baru dibuat setelah ini.
  window.history.replaceState(null, '', accessToken ? tujuan : '/login')
}

function segarkan(): Promise<boolean> {
  // Single-flight. Lima permintaan yang serentak kena 401 hanya boleh
  // menghasilkan satu panggilan /oauth2/token: dengan rotasi refresh token
  // aktif, penyegaran berbarengan memakai token yang sama akan saling
  // menggugurkan dan berakhir jadi logout mendadak.
  if (!refreshInFlight) {
    refreshInFlight = lakukanPenyegaran().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

async function lakukanPenyegaran(): Promise<boolean> {
  if (!refreshToken) return false

  const params = new URLSearchParams()
  params.append('grant_type', 'refresh_token')
  params.append('client_id', env.cognito.clientId)
  params.append('refresh_token', refreshToken)

  const data = await tukar(params)
  if (!data) return false

  simpan(data)
  return true
}

/**
 * Strategi untuk integrasi Cognito.
 *
 * Alur masuk memakai Authorization Code + PKCE ke Hosted UI milik HRIS — user
 * pool yang sama dengan hris-web dan Taskfy. hris-api tidak punya endpoint
 * login sama sekali; login memang terjadi sepenuhnya di sisi klien, dan API
 * hanya pernah melihat JWT yang sudah jadi.
 */
export function createCognitoStrategy(): AuthStrategy {
  return {
    mode: 'cognito',

    getAuthHeaders(): Record<string, string> {
      return accessToken ? { Authorization: `Bearer ${accessToken}` } : {}
    },

    hasSession() {
      return accessToken !== null
    },

    signIn() {
      // Tidak menunggu: pemanggilan ini berakhir dengan berpindah halaman.
      void berangkat()
    },

    clearSession() {
      // Hanya membersihkan memori. Penanda pernah-masuk sengaja dibiarkan:
      // interceptor 401 yang memanggil ini, dan sekali percobaan senyap
      // berikutnya masih pantas dicoba.
      lupakanToken()
    },

    signOut() {
      lupakanToken()
      lupakanPernahMasuk()

      // Sesi Hosted UI ikut dimatikan. Tanpa langkah ini, re-auth senyap
      // langsung memasukkan orang itu kembali dan tombol keluar tampak rusak.
      const url = new URL(`${env.cognito.domain}/logout`)
      url.searchParams.set('client_id', env.cognito.clientId)
      url.searchParams.set('logout_uri', alamatBalik())
      window.location.assign(url.toString())
    },

    refresh: segarkan,
  }
}

/**
 * Kapan token akses kedaluwarsa, dalam epoch milidetik. Belum dipakai:
 * penyegaran saat ini dipicu oleh 401, bukan oleh jam. Disimpan karena
 * nilainya memang datang cuma-cuma bersama balasan token, dan penyegaran
 * proaktif akan membutuhkannya.
 */
export function kedaluwarsaPada(): number | null {
  return expiresAt
}
