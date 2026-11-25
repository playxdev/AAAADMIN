import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  CircleCheck,
  Download,
  FileBarChart,
  ListChecks,
  ShieldX,
  type LucideIcon,
} from 'lucide-react'
import { api, apiErrorMessage } from '@/lib/api'
import { useT } from '@/lib/i18n'
import type { AccessLog } from '@/lib/types'
import { fmtUtc } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/data-table'
import { Page } from '@/components/layout/page'
import { formatPlate } from '@/features/houses/access-data'
import { useAccessLogColumns, useReasonText } from './access-log-columns'

// shortcut: one request, newest 1,000 rows; add server paging / export when a range holds more.
const MAX_ROWS = 1000
const ALL = 'all'

const localDate = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10)
// Local day bounds -> UTC ISO (the API stores UTC).
const dayStart = (date: string) => new Date(`${date}T00:00:00`).toISOString()
const dayEnd = (date: string) => new Date(`${date}T23:59:59`).toISOString()

function Stat({
  title,
  icon: Icon,
  value,
  isPending,
  className,
}: {
  title: string
  icon: LucideIcon
  value: number
  isPending: boolean
  className?: string
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        <Icon className={className ?? 'size-4 text-muted-foreground'} />
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className='h-8 w-16' />
        ) : (
          <div className='text-2xl font-bold'>{value}</div>
        )}
      </CardContent>
    </Card>
  )
}

/** Gate access report: date range + filters, summary, table and CSV export. */
export function Reports() {
  const t = useT()
  const reason = useReasonText()
  const columns = useAccessLogColumns()
  // Default range: the last 7 days (lazy init keeps Date.now() out of render).
  const [today] = useState(() => localDate(new Date()))
  const [from, setFrom] = useState(() =>
    localDate(new Date(Date.now() - 6 * 86_400_000))
  )
  const [to, setTo] = useState(today)
  const [decision, setDecision] = useState(ALL)
  const [method, setMethod] = useState(ALL)

  const logs = useQuery({
    queryKey: ['access-logs', 'report', from, to, decision, method],
    queryFn: () =>
      api
        .get<{ logs: AccessLog[] }>('/access-logs', {
          params: {
            limit: MAX_ROWS,
            from: dayStart(from),
            to: dayEnd(to),
            decision: decision === ALL ? undefined : decision,
            method: method === ALL ? undefined : method,
          },
        })
        .then((r) => r.data.logs),
    enabled: !!from && !!to && from <= to,
  })
  const rows = useMemo(() => logs.data ?? [], [logs.data])
  const allowed = rows.filter((l) => l.decision === 'YES').length

  const exportCsv = () => {
    const header = [
      t('log.time'),
      t('log.direction'),
      t('log.method'),
      t('col.license_plate'),
      t('acc.label'),
      t('col.house'),
      t('log.gate'),
      t('log.result'),
      t('log.reason'),
    ]
    const body = rows.map((l) => [
      fmtUtc(l.timestamp),
      t(l.access_type === 'EXIT' ? 'log.exit' : 'log.entry'),
      l.method ?? '',
      l.license_plate ? formatPlate(l.license_plate) : '',
      l.credential_label ?? '',
      l.house_number ?? '',
      l.gate_name ?? '',
      l.decision ?? '',
      reason(l.reason_code),
    ])
    const csv = [header, ...body]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n')
    // BOM so Excel opens Thai text as UTF-8.
    const url = URL.createObjectURL(
      new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `access-report_${from}_${to}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const filter = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    items: { value: string; label: string }[]
  ) => (
    <div className='space-y-1.5'>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className='w-40'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <Page
      title={t('nav.reports')}
      icon={FileBarChart}
      description={t('rep.desc')}
      actions={
        <Button variant='outline' onClick={exportCsv} disabled={!rows.length}>
          <Download /> {t('rep.export')}
        </Button>
      }
    >
      <div className='flex flex-wrap items-end gap-3'>
        <div className='space-y-1.5'>
          <Label htmlFor='rep-from'>{t('rep.from')}</Label>
          <Input
            id='rep-from'
            type='date'
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className='w-40'
          />
        </div>
        <div className='space-y-1.5'>
          <Label htmlFor='rep-to'>{t('rep.to')}</Label>
          <Input
            id='rep-to'
            type='date'
            value={to}
            min={from}
            max={today}
            onChange={(e) => setTo(e.target.value)}
            className='w-40'
          />
        </div>
        {filter('rep-decision', t('log.result'), decision, setDecision, [
          { value: ALL, label: t('rep.all') },
          { value: 'YES', label: t('log.allowed') },
          { value: 'NO', label: t('log.denied') },
          { value: 'ERROR', label: t('log.error') },
        ])}
        {filter('rep-method', t('log.method'), method, setMethod, [
          { value: ALL, label: t('rep.all') },
          ...['ANPR', 'RFID', 'QRCODE', 'PIN'].map((m) => ({
            value: m,
            label: m,
          })),
        ])}
      </div>
      <div className='grid gap-4 sm:grid-cols-3'>
        <Stat
          title={t('rep.total')}
          icon={ListChecks}
          value={rows.length}
          isPending={logs.isPending}
        />
        <Stat
          title={t('log.allowed')}
          icon={CircleCheck}
          className='size-4 text-success'
          value={allowed}
          isPending={logs.isPending}
        />
        <Stat
          title={t('log.denied')}
          icon={ShieldX}
          className='size-4 text-destructive'
          value={rows.length - allowed}
          isPending={logs.isPending}
        />
      </div>
      {rows.length >= MAX_ROWS && (
        <p className='text-sm text-warning'>
          {t('rep.capped', { n: MAX_ROWS })}
        </p>
      )}
      <DataTable
        columns={columns}
        data={rows}
        isLoading={logs.isPending}
        error={logs.isError ? apiErrorMessage(logs.error, t('err.load')) : null}
        searchPlaceholder={t('rep.search')}
      />
    </Page>
  )
}
