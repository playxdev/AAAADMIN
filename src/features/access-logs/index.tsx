import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiErrorMessage } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable } from '@/components/data-table'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'
import {
  type AccessLogFilters,
  accessLogColumns,
  fetchAccessLogs,
  toLogParams,
} from './data'

export function AccessLogs() {
  const [plate, setPlate] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [params, setParams] = useState<AccessLogFilters>({})

  const logs = useQuery({
    queryKey: ['/access-logs', params],
    queryFn: () => fetchAccessLogs(params),
  })

  return (
    <>
      <AppHeader />
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Access Logs</h2>
          <p className='text-muted-foreground'>Gate entry and exit events.</p>
        </div>
        <form
          className='flex flex-wrap items-end gap-3'
          onSubmit={(e) => {
            e.preventDefault()
            setParams(toLogParams(plate, from, to))
          }}
        >
          <div className='grid gap-1.5'>
            <Label htmlFor='filter-plate'>License plate</Label>
            <Input
              id='filter-plate'
              value={plate}
              onChange={(e) => setPlate(e.target.value)}
              placeholder='Filter by plate...'
              className='h-9 w-48'
            />
          </div>
          <div className='grid gap-1.5'>
            <Label htmlFor='filter-from'>From</Label>
            <Input
              id='filter-from'
              type='date'
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className='h-9'
            />
          </div>
          <div className='grid gap-1.5'>
            <Label htmlFor='filter-to'>To</Label>
            <Input
              id='filter-to'
              type='date'
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className='h-9'
            />
          </div>
          <Button type='submit' className='h-9'>
            Apply
          </Button>
          <Button
            type='button'
            variant='ghost'
            className='h-9'
            onClick={() => {
              setPlate('')
              setFrom('')
              setTo('')
              setParams({})
            }}
          >
            Reset
          </Button>
        </form>
        <DataTable
          columns={accessLogColumns}
          data={logs.data?.data ?? []}
          isLoading={logs.isPending}
          error={
            logs.isError ? apiErrorMessage(logs.error, 'Failed to load') : null
          }
          searchPlaceholder='Search loaded logs...'
        />
      </Main>
    </>
  )
}
