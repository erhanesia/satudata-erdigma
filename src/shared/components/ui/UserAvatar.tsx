import { useState } from 'react'

import { cn } from '@/shared/lib/cn'

/**
 * Foto profil karyawan, dengan inisial namanya sebagai cadangan.
 *
 * <h2>Kenapa inisialnya tetap ada</h2>
 *
 * Bukan sekadar penampung sementara. Tidak semua karyawan pernah mengunggah
 * foto di HRIS, dan yang belum tetap harus punya penanda yang terbaca — bukan
 * kotak abu-abu kosong yang membuat barisnya seperti gagal memuat.
 *
 * <h2>Kenapa kegagalan memuat ikut ditangani</h2>
 *
 * Berkasnya ada di bucket S3 milik HRIS, bukan milik portal ini. Fotonya bisa
 * dihapus di sana tanpa kolom `users.profile_image` ikut dikosongkan, dan sampai
 * karyawannya login lagi, portal ini masih menunjuk berkas yang sudah tidak ada.
 * Tanpa penanganan `onError`, yang muncul ikon gambar rusak bawaan browser —
 * lebih buruk daripada inisial yang memang sudah disiapkan.
 *
 * Keadaan gagal disimpan per URL. Kalau HRIS menyegarkan fotonya, `src` berubah
 * dan komponen ini mencoba lagi alih-alih menyerah selamanya.
 */
export function UserAvatar({
  src,
  initials,
  name,
  className,
}: {
  /** URL utuh dari `profileImageUrl`; kosong berarti belum ada foto. */
  src?: string | null
  initials: string
  name?: string | null
  className?: string
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  const usable = src && src !== failedSrc ? src : null

  return (
    <span
      title={name ?? undefined}
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        // Warna dasar tetap dipasang meski ada foto: ia yang terlihat selama
        // gambarnya masih dimuat, jadi tidak ada lubang putih yang berkedip.
        'bg-brand text-white',
        className,
      )}
    >
      {usable ? (
        <img
          src={usable}
          alt={name ? `Foto ${name}` : 'Foto profil'}
          onError={() => setFailedSrc(usable)}
          className="size-full object-cover"
          // Avatar tidak pernah jadi alasan menunda isi halaman yang sebenarnya.
          loading="lazy"
          decoding="async"
        />
      ) : (
        initials
      )}
    </span>
  )
}
