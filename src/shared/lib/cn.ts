import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Menggabungkan kelas Tailwind sambil menyelesaikan konflik: kelas yang datang
 * belakangan menang. `cn('p-2', 'p-4')` menghasilkan `'p-4'`, bukan keduanya.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
