import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History } from 'lucide-react'
import { api, apiErrorMessage } from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { AccessLog } from '@/lib/types'
import { DataTable } from '@/components/data-table'
import { useAccessLogColumns } from '@/features/reports/access-log-columns'
import { EventImageDialog } from '@/features/reports/image-viewer'

const LIMIT = 20
// The gate keeps writing logs; refresh while the dashboard is open.
const REFRESH_MS = 15_000

/** Latest gate decisions (ANPR / RFID / QR / PIN / Guest Code), newest first. */
export function AccessLogCard() {
  const t = useT()
  const logs = useQuery({
    queryKey: ['access-logs', LIMIT],
    queryFn: () =>
      api
        .get<{
          logs: AccessLog[]
        }>('/access-logs', { params: { limit: LIMIT } })
        .then((r) => r.data.logs),
    refetchInterval: REFRESH_MS,
  })

  const [viewing, setViewing] = useState<AccessLog>()
  const columns = useAccessLogColumns(setViewing)

  return (
    <section className='space-y-3'>
      <h3 className='flex items-center gap-2 text-lg font-semibold'>
        <History className='size-5' /> {t('log.title')}
      </h3>
      <DataTable
        compact
        columns={columns}
        data={logs.data ?? []}
        isLoading={logs.isPending}
        error={logs.isError ? apiErrorMessage(logs.error, t('err.load')) : null}
      />
      <EventImageDialog log={viewing} onClose={() => setViewing(undefined)} />
    </section>
  )
}
