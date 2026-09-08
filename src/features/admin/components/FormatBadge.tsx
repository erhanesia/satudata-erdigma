/**
 * Lencana jenis berkas — warnanya disalin dari `extBadge` pada berkas desain.
 *
 * Empat jenis inilah yang dipakai portal: CSV, XLSX, PDF, DOCX. GEOJSON, KML,
 * dan API dikeluarkan dari data acuan pada changeset 00026; kalau ada nilai
 * lain menyusup, ia jatuh ke warna netral alih-alih hilang dari layar.
 */
const COLORS: Record<string, [string, string]> = {
  CSV: ['#1B54C4', '#EDF2FF'],
  XLSX: ['#137A46', '#E7F8EF'],
  PDF: ['#B4231B', '#FEF3F2'],
  DOCX: ['#1D4ED8', '#EFF4FF'],
}

export function FormatBadge({ ext }: { ext: string }) {
  const [color, background] = COLORS[ext] ?? ['#4B5563', '#F1F3F7']
  return (
    <span
      className="shrink-0 rounded-md px-2.5 py-1 text-[11.5px] font-extrabold tracking-[0.4px]"
      style={{ color, background }}
    >
      {ext || '—'}
    </span>
  )
}
