/**
 * Tiga bentuk grafik mini untuk kartu Data Insight.
 *
 * Rumusnya disalin apa adanya dari `miniBars`, `miniLine`, dan `miniDonut` di
 * berkas desain — termasuk kanvas 280×120, padding, jari-jari donat 44, dan
 * tebal garis 14. Ditulis ulang sebagai komponen React, bukan `React.createElement`
 * berantai seperti di prototipe, tapi angka-angkanya tidak diubah satu pun.
 *
 * Semuanya `aria-hidden`: bentuknya dekoratif, dan judul kartu sudah
 * menyebutkan isi grafiknya untuk pembaca layar.
 */

const W = 280
const H = 120

export function MiniBars({ values, colors }: { values: number[]; colors: string[] }) {
  const pad = 8
  const slot = (W - pad * 2) / values.length
  const lebarBatang = slot * 0.6
  const jarak = slot * 0.4
  const max = Math.max(...values)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full" aria-hidden>
      {values.map((v, i) => {
        const tinggi = (v / max) * (H - 24)
        return (
          <rect
            key={i}
            x={pad + i * (lebarBatang + jarak)}
            y={H - 8 - tinggi}
            width={lebarBatang}
            height={tinggi}
            rx={2}
            fill={colors[i % colors.length]}
          />
        )
      })}
      <line x1={pad} x2={W - pad} y1={H - 8} y2={H - 8} stroke="#E3E7ED" strokeWidth={1} />
    </svg>
  )
}

export function MiniLine({ values, color }: { values: number[]; color: string }) {
  const pad = 10
  const max = Math.max(...values)
  const min = Math.min(...values)
  // Deretan nilai yang rata — mis. uptime yang selalu 99 — akan membuat
  // pembagian jadi nol. Desain memakai 1 sebagai pengganti; hasilnya garis lurus.
  const rentang = max - min || 1

  const titik = values.map(
    (v, i) =>
      [
        pad + i * ((W - pad * 2) / (values.length - 1)),
        H - 10 - ((v - min) / rentang) * (H - 28),
      ] as const,
  )

  const garis = 'M' + titik.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L')
  const akhir = titik[titik.length - 1]!
  const area = `${garis} L${akhir[0].toFixed(1)} ${H - 10} L${pad} ${H - 10} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full" aria-hidden>
      <path d={area} fill={color} opacity={0.12} />
      <path d={garis} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" />
      {titik.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.6} fill={color} />
      ))}
    </svg>
  )
}

export interface DonutSegment {
  value: number
  color: string
}

export function MiniDonut({ segments }: { segments: readonly DonutSegment[] }) {
  const R = 44
  const C = 60
  const tebal = 14
  const total = segments.reduce((jumlah, s) => jumlah + s.value, 0)
  const keliling = 2 * Math.PI * R

  // Panjang tiap potongan diakumulasi jadi `strokeDashoffset` negatif —
  // cara desain menyusun cincin tanpa menghitung sudut busur sendiri.
  let terpakai = 0

  return (
    <svg viewBox="0 0 120 120" width={120} height={120} className="mx-auto block" aria-hidden>
      <circle cx={C} cy={C} r={R} fill="none" stroke="#EEF1F5" strokeWidth={tebal} />
      {segments.map((s, i) => {
        const panjang = (s.value / total) * keliling
        const potongan = (
          <circle
            key={i}
            cx={C}
            cy={C}
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth={tebal}
            strokeDasharray={`${panjang} ${keliling - panjang}`}
            strokeDashoffset={-terpakai}
            transform="rotate(-90 60 60)"
          />
        )
        terpakai += panjang
        return potongan
      })}
    </svg>
  )
}
