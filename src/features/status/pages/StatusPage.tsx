import { AlertCircle, CheckCircle2, CircleDashed } from 'lucide-react'

import { EmptyState } from '@/shared/components/feedback/StateViews'
import { QueryBoundary } from '@/shared/components/feedback/QueryBoundary'
import { Badge } from '@/shared/components/ui/Badge'
import { Card, CardBody, CardHeader, CardTitle } from '@/shared/components/ui/Card'
import { PageContainer, PageHeading } from '@/shared/components/ui/PageContainer'
import { Skeleton } from '@/shared/components/ui/Skeleton'

import { useStatus } from '../hooks/useStatus'

/**
 * Memetakan teks status dari server ke tampilan.
 *
 * Sengaja mengenali nilai yang tidak dikenal sebagai "tak diketahui" alih-alih
 * mengasumsikan sehat. Menampilkan centang hijau untuk keadaan yang tidak
 * dipahami adalah kebohongan yang persis terjadi saat orang paling butuh
 * halaman ini.
 */
function statusView(state: string | undefined) {
  const value = (state ?? '').toLowerCase()
  if (value.includes('operasional') || value.includes('up')) {
    return { Icon: CheckCircle2, color: 'text-success', tone: 'success' as const }
  }
  if (value.includes('gangguan') || value.includes('down') || value.includes('error')) {
    return { Icon: AlertCircle, color: 'text-danger', tone: 'danger' as const }
  }
  return { Icon: CircleDashed, color: 'text-ink-400', tone: 'neutral' as const }
}

export default function StatusPage() {
  const query = useStatus()

  return (
    <PageContainer className="py-7 sm:py-10">
      <PageHeading
        title="Status Layanan"
        description="Kondisi komponen portal, diperbarui otomatis setiap menit."
      />

      <QueryBoundary
        query={query}
        loading={
          <div className="flex flex-col gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
          </div>
        }
      >
        {(status) => {
          const overall = statusView(status.overall)
          return (
            <div className="flex flex-col gap-5">
              <Card>
                <CardBody className="flex items-center gap-4 pt-5">
                  <overall.Icon className={`size-9 shrink-0 ${overall.color}`} />
                  <div>
                    <div className="text-ink-900 text-lg font-extrabold">
                      {status.overallLabel || 'Status tidak diketahui'}
                    </div>
                    <div className="text-ink-500 text-[13px]">
                      Seluruh komponen portal Satu Data Erdigma
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Komponen</CardTitle>
                </CardHeader>
                <CardBody>
                  <ul className="flex flex-col">
                    {status.components?.map((komponen) => {
                      const visible = statusView(komponen.state)
                      return (
                        <li
                          key={komponen.name}
                          className="border-line-50 flex items-center justify-between gap-3 border-b py-3 last:border-b-0"
                        >
                          <span className="text-ink-700 text-sm font-semibold">
                            {komponen.name}
                          </span>
                          <span className="inline-flex items-center gap-2">
                            <visible.Icon className={`size-4 ${visible.color}`} />
                            <Badge tone={visible.tone}>{komponen.state}</Badge>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Riwayat insiden</CardTitle>
                </CardHeader>
                <CardBody>
                  {status.incidents && status.incidents.length > 0 ? (
                    <ul className="flex flex-col gap-4">
                      {status.incidents.map((insiden) => (
                        <li key={insiden.id} className="border-line-100 border-l-2 pl-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge tone="warning">{insiden.tag}</Badge>
                            <span className="text-ink-900 text-sm font-bold">{insiden.title}</span>
                          </div>
                          <div className="text-ink-400 mt-1 text-[12.5px]">
                            {insiden.occurredLabel}
                          </div>
                          <p className="text-ink-600 mt-1.5 text-[13.5px] leading-relaxed">
                            {insiden.detail}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState title="Tidak ada insiden tercatat" className="border-0 py-6" />
                  )}
                </CardBody>
              </Card>
            </div>
          )
        }}
      </QueryBoundary>
    </PageContainer>
  )
}
