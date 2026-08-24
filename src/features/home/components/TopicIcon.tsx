import {
  BarChart3,
  Clock,
  Code,
  DollarSign,
  LayoutList,
  MapPin,
  Package,
  Send,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react'

/**
 * Ikon topik, diambil dari lucide-react.
 *
 * Sebelumnya jalur SVG-nya disalin apa adanya dari berkas ekspor desain dengan
 * alasan kesetiaan bentuk. Itu ditukar dengan alasan yang lebih berat:
 * belasan jalur mentah tersebar di kode membuatnya sulit dibaca dan sulit
 * ditambah, sedangkan bedanya dengan ikon pustaka hanya soal ketebalan garis
 * dan lengkung sudut — hal yang tidak akan ditanyakan siapa pun.
 *
 * Warnanya TETAP dari desain, karena warna itulah yang membedakan chip satu
 * dengan lainnya sekilas pandang.
 */
interface Topic {
  Icon: LucideIcon
  color: string
}

const TOPIC_ICONS: Record<string, Topic> = {
  Penjualan: { Icon: BarChart3, color: '#1D4ED8' },
  Pemasaran: { Icon: Send, color: '#A21CAF' },
  Keuangan: { Icon: DollarSign, color: '#BE123C' },
  Operasional: { Icon: Settings, color: '#0EA5A0' },
  SDM: { Icon: Users, color: '#B45309' },
  Produk: { Icon: Package, color: '#0F766E' },
  Teknologi: { Icon: Code, color: '#7C3AED' },
  Geospasial: { Icon: MapPin, color: '#0369A1' },
  /** Bukan topik dari database — pintasan ke dokumentasi API, seperti di desain. */
  'Real-time APIs': { Icon: Clock, color: '#0EA5A0' },
}

/** Dipakai untuk topik baru yang belum punya ikon khusus. */
const FALLBACK: Topic = { Icon: LayoutList, color: '#1B54C4' }

export function TopicIcon({ name, size = 18 }: { name: string; size?: number }) {
  const { Icon, color } = TOPIC_ICONS[name] ?? FALLBACK

  return (
    <Icon
      size={size}
      color={color}
      strokeWidth={1.9}
      aria-hidden
      className="shrink-0"
    />
  )
}
