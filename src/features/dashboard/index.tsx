import { useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { api, apiErrorMessage } from '@/lib/api'
import type { ListResponse } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DataTable } from '@/components/data-table'
import { AppHeader } from '@/components/layout/app-header'
import { Main } from '@/components/layout/main'
import { accessLogColumns, fetchAccessLogs } from '@/features/access-logs/data'
import { resources } from '@/features/resources/config'

const statResources = [
  resources.projects,
  resources.houses,
  resources.users,
  resources.vehicles,
]

export function Dashboard() {
  // Same query keys as the list pages, so counts and pages share the cache.
  const stats = useQueries({
    queries: statResources.map((r) => ({
      queryKey: [r.endpoint],
      queryFn: () =>
        api.get<ListResponse<unknown>>(r.endpoint).then((res) => res.data),
    })),
  })

  const [weekAgo] = useState(() =>
    new Date(Date.now() - 7 * 86_400_000).toISOString()
  )
  const logs = useQuery({
    queryKey: ['/access-logs', { date_from: weekAgo }],
    queryFn: () => fetchAccessLogs({ date_from: weekAgo }),
  })

  return (
    <>
      <AppHeader />
      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <h2 className='text-2xl font-bold tracking-tight'>Dashboard</h2>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {statResources.map((r, i) => {
            const q = stats[i]
            return (
              <Card key={r.endpoint}>
                <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    {r.title}
                  </CardTitle>
                  <r.icon className='size-4 text-muted-foreground' />
                </CardHeader>
                <CardContent>
                  {q.isPending ? (
                    <Skeleton className='h-8 w-16' />
                  ) : (
                    <div className='text-2xl font-bold'>
                      {q.isError ? '-' : q.data.total}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent access logs (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              compact
              columns={accessLogColumns}
              data={logs.data?.data.slice(0, 20) ?? []}
              isLoading={logs.isPending}
              error={
                logs.isError
                  ? apiErrorMessage(logs.error, 'Failed to load')
                  : null
              }
            />
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
