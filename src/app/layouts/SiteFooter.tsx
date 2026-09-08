import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { paths } from '@/app/router/paths'
import logoErdigma from '@/shared/assets/logo-erdigma-mark.png'
import { useToast } from '@/shared/components/ui/toastStore'

/**
 * Footer mengikuti desain persis: dua kolom — Jelajahi dan Legal.
 *
 * Butir Legal belum punya halaman; di desain pun ketiganya hanya memunculkan
 * pesan singkat. Perilaku itu dipertahankan supaya tidak ada tautan yang
 * menjanjikan halaman yang tidak ada.
 */
export function SiteFooter() {
  const toast = useToast()
  const notify = () => toast.show('Fitur ini tersedia pada versi lengkap.')

  return (
    <footer className="mt-auto bg-[#14213D] text-[#9FB0CC]">
      <div className="mx-auto max-w-[1200px] px-5 pt-11 pb-[30px]">
        <div className="flex flex-wrap justify-between gap-[30px]">
          <div className="max-w-[300px]">
            <div className="mb-3 flex items-center gap-2.5">
              {/* Logo yang sama dengan header, dari berkas — bukan digambar
                  ulang dengan <path>. Dua versi logo yang dipelihara terpisah
                  pasti menyimpang cepat atau lambat. */}
              <img src={logoErdigma} alt="" width={32} height={32} className="size-8 shrink-0" />
              <span className="text-[17px] font-extrabold text-white">Satu Data Erdigma</span>
            </div>
            <p className="text-[13.5px] leading-relaxed">
              Portal data internal PT Erdigma — satu pintu untuk mencari, mengeksplorasi, dan
              mengintegrasikan data antar-divisi.
            </p>
          </div>

          <div className="flex flex-wrap gap-14">
            <FooterColumn title="Jelajahi">
              <FooterLink to={paths.datasets}>Datasets</FooterLink>
              <FooterLink to={paths.divisions}>Divisi</FooterLink>
            </FooterColumn>

            <FooterColumn title="Legal">
              <FooterAction onClick={notify}>Kebijakan Data Internal</FooterAction>
              <FooterAction onClick={notify}>Privasi &amp; Keamanan</FooterAction>
              <FooterAction onClick={notify}>Umpan Balik</FooterAction>
            </FooterColumn>
          </div>
        </div>

        <div className="mt-8 border-t border-[#2A3A5C] pt-5 text-[12.5px] text-[#7C8DAB]">
          © 2026 PT Erdigma. Untuk penggunaan internal. Dilarang mendistribusikan data ke pihak
          eksternal tanpa izin.
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-3 text-[13px] font-bold text-[#EAF0FA]">{title}</div>
      <div className="flex flex-col gap-[9px] text-[13.5px]">{children}</div>
    </div>
  )
}

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="text-left transition-colors hover:text-white">
      {children}
    </Link>
  )
}

function FooterAction({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-left transition-colors hover:text-white">
      {children}
    </button>
  )
}
