import { useMemo } from 'react'
import { type ColumnDef } from '@tanstack/react-table'
import { ArrowDownLeft, ArrowUpRight, Camera } from 'lucide-react'
import { type TKey, useT } from '@/lib/i18n'
import type { AccessLog } from '@/lib/types'
import { fmtUtc } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPlate } from '@/features/houses/access-data'

/** Reason code -> translated text; unknown codes show as sent by the API. */
export function useReasonText() {
  const t = useT()
  return (code: string | null) => {
    if (!code) return ''
    const text = t(`reason.${code}` as TKey)
    return text.startsWith('reason.') ? code : text
  }
}

/** Gate log table columns, shared by the Dashboard and the Reports page; onView opens the camera pictures. */
export function useAccessLogColumns(onView: (log: AccessLog) => void) {
  const t = useT()
  const reason = useReasonText()
  return useMemo<ColumnDef<AccessLog>[]>(
    () => [
      {
        id: 'image',
        header: () => <span className='sr-only'>{t('img.title')}</span>,
        enableHiding: false,
        cell: ({ row }) =>
          (!!row.original.has_image || !!row.original.has_plate_image) && (
            <Button
              variant='ghost'
              size='icon'
              aria-label={t('img.title')}
              title={t('img.title')}
              onClick={() => onView(row.original)}
            >
              <Camera />
            </Button>
          ),
      },
      {
        accessorKey: 'timestamp',
        header: t('log.time'),
        cell: ({ row }) => (
          <span className='text-sm whitespace-nowrap'>
            {fmtUtc(row.original.timestamp)}
          </span>
        ),
      },
      {
        accessorKey: 'access_type',
        header: t('log.direction'),
        cell: ({ row }) =>
          row.original.access_type === 'EXIT' ? (
            <span className='flex items-center gap-1 text-sm'>
              <ArrowUpRight className='size-4 text-muted-foreground' />
              {t('log.exit')}
            </span>
          ) : (
            <span className='flex items-center gap-1 text-sm'>
              <ArrowDownLeft className='size-4 text-muted-foreground' />
              {t('log.entry')}
            </span>
          ),
      },
      {
        id: 'what',
        // Plate for ANPR, otherwise the credential type + its short name.
        accessorFn: (l) =>
          [l.method, l.license_plate, l.credential_label].join(' '),
        header: t('log.method'),
        cell: ({ row }) => {
          const l = row.original
          return (
            <span className='flex items-center gap-2'>
              <Badge variant='secondary'>{l.method ?? '-'}</Badge>
              {l.license_plate ? (
                <span className='font-mono'>
                  {formatPlate(l.license_plate)}
                </span>
              ) : (
                <span className='text-sm'>{l.credential_label ?? ''}</span>
              )}
            </span>
          )
        },
      },
      {
        accessorKey: 'house_number',
        header: t('col.house'),
        cell: ({ row }) => row.original.house_number ?? '-',
      },
      {
        accessorKey: 'gate_name',
        header: t('log.gate'),
        cell: ({ row }) => row.original.gate_name ?? '-',
      },
      {
        accessorKey: 'decision',
        header: t('log.result'),
        cell: ({ row }) => {
          const l = row.original
          return (
            <span className='flex flex-col items-start gap-0.5'>
              <Badge
                className={
                  l.decision === 'YES'
                    ? 'bg-success text-white'
                    : l.decision === 'NO'
                      ? 'bg-destructive text-white'
                      : 'bg-warning text-black'
                }
              >
                {t(
                  l.decision === 'YES'
                    ? 'log.allowed'
                    : l.decision === 'NO'
                      ? 'log.denied'
                      : 'log.error'
                )}
              </Badge>
              <span className='text-xs text-muted-foreground'>
                {reason(l.reason_code)}
              </span>
            </span>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, onView]
  )
}
