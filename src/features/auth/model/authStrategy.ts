import { env } from '@/shared/config/env'

import { createCognitoStrategy } from './cognitoStrategy'
import { createDummyStrategy } from './dummyStrategy'
import type { AuthStrategy } from './types'

/**
 * Satu-satunya tempat yang memilih implementasi autentikasi.
 *
 * Padanan `@Profile("auth-dummy")` di back-end: pilihan dibuat sekali di batas
 * aplikasi, lalu seluruh kode di dalamnya bekerja lewat antarmuka yang sama.
 */
export const authStrategy: AuthStrategy =
  env.authMode === 'cognito' ? createCognitoStrategy() : createDummyStrategy()
