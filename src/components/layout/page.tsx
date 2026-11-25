import { ConfigDrawer } from '@/components/config-drawer'
import { LangSwitch } from '@/components/lang-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Header } from './header'
import { Main } from './main'

type PageProps = {
  title: string
  icon?: React.ElementType
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

/** Shared shell for every authenticated page: top bar + title row + content. */
export function Page({
  title,
  icon: Icon,
  description,
  actions,
  children,
}: PageProps) {
  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <LangSwitch />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>
      <Main fluid className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='flex items-center gap-2 text-2xl font-bold tracking-tight'>
              {Icon && <Icon className='size-6 text-muted-foreground' />}
              {title}
            </h2>
            {description && (
              <p className='text-muted-foreground'>{description}</p>
            )}
          </div>
          {actions && <div className='flex items-center gap-3'>{actions}</div>}
        </div>
        {children}
      </Main>
    </>
  )
}
