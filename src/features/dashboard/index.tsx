import {
  AlertTriangle,
  Home,
  LayoutDashboard,
  type LucideIcon,
  UserCheck,
  Users,
} from 'lucide-react'
import { apiErrorMessage } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Page } from '@/components/layout/page'
import { useHouses } from '@/features/houses/data'
import { useVisitors } from '@/features/visitors/data'

function Stat({
  title,
  icon: Icon,
  value,
  isPending,
  error,
}: {
  title: string
  icon: LucideIcon
  value?: number
  isPending: boolean
  error: unknown
}) {
  const t = useT()
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        <Icon className='size-4 text-muted-foreground' />
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className='h-8 w-16' />
        ) : error ? (
          <p className='text-sm text-destructive'>
            {apiErrorMessage(error, t('err.load'))}
          </p>
        ) : (
          <div className='text-2xl font-bold'>{value}</div>
        )}
      </CardContent>
    </Card>
  )
}

export function Dashboard() {
  const t = useT()
  // Same query keys as the list pages, so the dashboard and pages share the cache.
  const houses = useHouses()
  const visitors = useVisitors(true)
  const activeHouses = houses.data?.filter((h) => h.is_active)

  return (
    <Page title={t('nav.dashboard')} icon={LayoutDashboard}>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Stat
          title={t('nav.houses')}
          icon={Home}
          value={activeHouses?.length}
          isPending={houses.isPending}
          error={houses.error}
        />
        <Stat
          title={t('dash.occupied')}
          icon={Users}
          value={
            activeHouses?.filter((h) => h.occupancy_status === 'OCCUPIED')
              .length
          }
          isPending={houses.isPending}
          error={houses.error}
        />
        <Stat
          title={t('dash.overdue')}
          icon={AlertTriangle}
          value={
            activeHouses?.filter((h) => h.payment_status !== 'NORMAL').length
          }
          isPending={houses.isPending}
          error={houses.error}
        />
        <Stat
          title={t('dash.validVisitors')}
          icon={UserCheck}
          value={visitors.data?.filter((v) => v.is_valid_now).length}
          isPending={visitors.isPending}
          error={visitors.error}
        />
      </div>
    </Page>
  )
}
