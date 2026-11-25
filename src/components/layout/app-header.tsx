import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Header } from './header'

function SystemStatus() {
  const { data, isError, isPending } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ status: string }>('/health').then((r) => r.data),
    refetchInterval: 60_000,
    retry: false,
  })
  const online = data?.status === 'ok'
  const label = isPending
    ? 'Checking...'
    : isError
      ? 'Offline'
      : online
        ? 'System Online'
        : 'System Issue'
  return (
    <span
      className='hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex'
      role='status'
    >
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          isPending
            ? 'bg-muted-foreground'
            : online
              ? 'bg-emerald-500'
              : 'bg-destructive'
        )}
      />
      {label}
    </span>
  )
}

/** Shared top bar for every authenticated page. */
export function AppHeader() {
  return (
    <Header fixed>
      <Search className='me-auto' />
      <SystemStatus />
      <ThemeSwitch />
      <ConfigDrawer />
      <ProfileDropdown />
    </Header>
  )
}
