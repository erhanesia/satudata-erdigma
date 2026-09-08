import * as RadixSelect from '@radix-ui/react-select'
import { Check, ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/cn'

/**
 * Pemilih bergaya Satu Data, dipakai untuk penyaring.
 *
 * <h2>Kenapa tidak `<select>` bawaan</h2>
 *
 * `Select` di `Input.tsx` sengaja memakai elemen asli, dan alasannya masih
 * berlaku: navigasi papan ketik, pembacaan screen reader, dan picker asli di
 * perangkat sentuh datang gratis di sana. Yang TIDAK datang adalah tampilannya.
 * Daftar pilihan `<select>` digambar sistem operasi, bukan halaman: latar biru
 * tebal bawaan Windows, huruf bawaan sistem, sudut siku — tidak ada satu pun
 * yang bisa disentuh CSS, dan hasilnya menyimpang jauh dari sisa antarmuka.
 *
 * <h2>Kenapa lewat pustaka, bukan tiruan dari div</h2>
 *
 * Tiruan buatan tangan berarti menulis ulang sendiri seluruh yang tadi gratis:
 * fokus yang terkurung, panah atas-bawah, Home/End, ketik-untuk-melompat,
 * Escape, penutupan saat klik di luar, `aria-activedescendant`, dan pengumuman
 * pilihan. Yang biasanya terjadi bukan salah satunya salah, melainkan tidak
 * satu pun dikerjakan — dan tidak ada yang menyadarinya karena semuanya masih
 * bisa diklik dengan tetikus.
 *
 * Radix mengerjakan semua itu, dan proyek ini sudah memakai keluarga yang sama
 * untuk Dialog, Tabs, dan Checkbox.
 *
 * <h2>Yang ditukar</h2>
 *
 * Di perangkat sentuh yang tampil daftar buatan halaman, bukan picker gulung
 * bawaan sistem. Untuk penyaring berisi belasan pilihan pendek, daftar yang
 * konsisten dengan seluruh antarmuka lebih berharga daripada picker asli. Untuk
 * kontrol yang MENGUBAH data — misalnya pemilih peran di panel pengguna —
 * pertukaran itu tidak sepadan, dan di sana `<select>` asli tetap dipakai.
 */

export interface SelectOption {
  value: string
  label: string
}

export function SelectMenu({
  value,
  onChange,
  options,
  placeholder,
  includeAll = true,
  ariaLabel,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  /** Teks saat belum ada yang dipilih, mis. "Semua divisi". */
  placeholder: string
  /*
    Apakah daftarnya diawali satu pilihan yang berarti "semua".

    Menyala untuk penyaring, karena di sana melepas penyaringan adalah pilihan
    yang sah dan harus bisa ditunjuk. Dimatikan untuk pemilih yang SELALU punya
    nilai -- urutan hasil, misalnya: menawarkan "tidak diurutkan" di sana berarti
    menjanjikan keadaan yang tidak ada padanannya di server.
  */
  includeAll?: boolean
  ariaLabel?: string
  className?: string
}) {
  /*
    Radix memakai string kosong sebagai "belum ada nilai", dan MENOLAK item
    ber-value kosong. Padahal penyaring ini justru butuh satu pilihan yang
    berarti "semua". Jalan keluarnya satu nilai penanda yang tidak mungkin
    bertabrakan dengan nilai sungguhan, diterjemahkan bolak-balik di sini saja —
    supaya pemanggilnya tetap bekerja dengan string kosong seperti sebelumnya.
  */
  const ALL = '__all__'

  return (
    <RadixSelect.Root
      value={value === '' ? ALL : value}
      onValueChange={(next) => onChange(next === ALL ? '' : next)}
    >
      <RadixSelect.Trigger
        aria-label={ariaLabel ?? placeholder}
        className={cn(
          'flex h-[52px] items-center justify-between gap-2 rounded-lg border border-[#E9EBF0] bg-white pr-3.5 pl-3.5 text-[16px] text-[#4B5563] outline-none transition-colors',
          'hover:border-[#CBD2DC] focus-visible:border-[#4F6BED] data-[state=open]:border-[#4F6BED]',
          className,
        )}
      >
        {/* `truncate` di sini, bukan di pembungkusnya: nilai panjang harus
            memendek sendiri alih-alih mendorong panahnya keluar kotak. */}
        <span className="truncate">
          <RadixSelect.Value placeholder={placeholder} />
        </span>
        {/*
          Panahnya diberi jarak tetap dari tepi dan ikut berputar saat terbuka.

          Yang dipakai `shrink-0` supaya ia tidak pernah ikut memendek ketika
          teks di sebelahnya panjang — panah yang gepeng terbaca seperti cacat
          gambar, bukan seperti ikon.
        */}
        <RadixSelect.Icon asChild>
          <ChevronDown
            className="size-[18px] shrink-0 text-[#9CA3AF] transition-transform duration-200 data-[state=open]:rotate-180"
            strokeWidth={2.2}
          />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        {/*
          `position="popper"` plus `sideOffset`: panelnya duduk DI BAWAH
          pemicunya, bukan menimpanya. Perilaku bawaan Radix menempatkan item
          terpilih tepat di atas pemicu seperti menu asli macOS, dan di tengah
          bilah penyaring itu menutupi kotak yang baru saja ditekan.

          `--radix-select-trigger-width` membuat panelnya selebar pemicunya, jadi
          tepinya lurus dengan kotak di atasnya alih-alih melebar sendiri.
        */}
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className={cn(
            'z-50 max-h-[320px] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[10px] border border-[#E9EBF0] bg-white shadow-[0_8px_24px_rgba(16,24,40,.12)]',
            'data-[side=bottom]:animate-dropdown-down data-[side=top]:animate-dropdown-up',
          )}
        >
          <RadixSelect.Viewport className="p-1.5">
            {includeAll ? <Item value={ALL}>{placeholder}</Item> : null}
            {options.map((option) => (
              <Item key={option.value} value={option.value}>
                {option.label}
              </Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}

/**
 * Satu baris pilihan.
 *
 * Yang terpilih ditandai centang, bukan hanya diberi warna. Warna sendirian
 * tidak terbaca oleh sebagian orang, dan pada daftar penyaring yang seluruh
 * barisnya bertulisan mirip, penanda itu justru yang paling dicari.
 */
function Item({ value, children }: { value: string; children: ReactNode }) {
  return (
    <RadixSelect.Item
      value={value}
      className={cn(
        'relative flex cursor-pointer items-center justify-between gap-3 rounded-[7px] px-3 py-2.5 text-[15px] text-[#4B5563] outline-none select-none',
        'data-[highlighted]:bg-[#F7F9FF] data-[highlighted]:text-[#2E3646]',
        'data-[state=checked]:font-semibold data-[state=checked]:text-[#4F6BED]',
      )}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator asChild>
        <Check className="size-4 shrink-0" strokeWidth={2.6} />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  )
}
