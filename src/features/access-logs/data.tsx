import { type ColumnDef } from '@tanstack/react-table'
import { api } from '@/lib/api'
import type { AccessLog, ListResponse } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'

export type AccessLogFilters = {
  license_plate?: string
  date_from?: string
  date_to?: string
}

/** Date inputs (yyyy-mm-dd, local) -> API params; date_to covers the whole day. */
export function toLogParams(
  plate: string,
  from: string,
  to: string
): AccessLogFilters {
  const params: AccessLogFilters = {}
  if (plate.trim()) params.license_plate = plate.trim()
  if (from) params.date_from = new Date(`${from}T00:00:00`).toISOString()
  if (to) params.date_to = new Date(`${to}T23:59:59.999`).toISOString()
  return params
}

export function fetchAccessLogs(params: AccessLogFilters) {
  return api
    .get<ListResponse<AccessLog>>('/access-logs', { params })
    .then((r) => r.data)
}

const text = (v: string | null) =>
  v ? v : <span className='text-muted-foreground'>-</span>

export const accessLogColumns: ColumnDef<AccessLog>[] = [
  {
    accessorKey: 'access_date',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Time' />
    ),
    cell: ({ row }) => new Date(row.original.access_date).toLocaleString(),
  },
  {
    accessorKey: 'license_plate',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Plate' />
    ),
    cell: ({ row }) => (
      <span className='font-mono text-sm'>
        {text(row.original.license_plate)}
      </span>
    ),
  },
  {
    accessorKey: 'access_type',
    header: 'Type',
    cell: ({ row }) => text(row.original.access_type),
  },
  {
    accessorKey: 'user_type',
    header: 'User Type',
    cell: ({ row }) => text(row.original.user_type),
  },
  {
    accessorKey: 'device_id',
    header: 'Device',
    cell: ({ row }) => (
      <span className='font-mono text-sm'>{text(row.original.device_id)}</span>
    ),
  },
  {
    accessorKey: 'project_id',
    header: 'Project',
    cell: ({ row }) => (
      <span className='font-mono text-sm'>{row.original.project_id}</span>
    ),
  },
  {
    accessorKey: 'is_success',
    header: 'Status',
    cell: ({ row }) =>
      row.original.is_success ? (
        <Badge className='bg-emerald-600 text-white'>Success</Badge>
      ) : (
        <Badge variant='destructive'>Failed</Badge>
      ),
  },
]
