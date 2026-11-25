import { useSearch } from '@tanstack/react-router'
import { useT } from '@/lib/i18n'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const t = useT()
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <AuthLayout>
      <Card className='w-full max-w-sm gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            {t('auth.title')}
          </CardTitle>
          <CardDescription>{t('auth.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <UserAuthForm redirectTo={redirect} />
        </CardContent>
      </Card>
      <p className='text-center text-xs text-muted-foreground'>
        &copy; PlayDevX &middot; v{__APP_VERSION__}
      </p>
    </AuthLayout>
  )
}
