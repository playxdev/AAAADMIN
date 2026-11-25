import { Link } from '@tanstack/react-router'
import { KeyRound, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { useT } from '@/lib/i18n'
import { getDisplayNameInitials as initials } from '@/lib/utils'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SignOutDialog } from '@/components/sign-out-dialog'

export function ProfileDropdown() {
  const t = useT()
  const [open, setOpen] = useDialogState()
  const user = useAuthStore((s) => s.auth.user)
  const name = user?.fullName ?? 'Admin'

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='relative h-8 w-8 rounded-full'
            aria-label={t('account.menu')}
          >
            <Avatar className='h-8 w-8'>
              <AvatarFallback>{initials(name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className='w-56' align='end' forceMount>
          <DropdownMenuLabel className='font-normal'>
            <div className='flex flex-col gap-1.5'>
              <p className='text-sm leading-none font-medium'>{name}</p>
              <p className='text-xs leading-none text-muted-foreground'>
                {user &&
                  (user.projectName ??
                    t('account.project', {
                      id: user.projectCode ?? user.projectId,
                    }))}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to='/change-password'>
              <KeyRound />
              {t('pw.title')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className='text-warning focus:text-warning [&_svg]:text-warning!'
            onClick={() => setOpen(true)}
          >
            <LogOut />
            {t('account.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}
