import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { api, apiErrorMessage } from '@/lib/api'
import { k, useT } from '@/lib/i18n'
import { safeRedirect } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'
import { AuthLayout } from '../auth-layout'

// Same rules as AAAAPI: at least 12 characters and not the current password.
const schema = z
  .object({
    current_password: z.string().min(1, k('v.password')),
    new_password: z.string().min(12, k('v.password12')).max(256),
    confirm: z.string(),
  })
  .refine((v) => v.new_password !== v.current_password, {
    message: k('pw.same'),
    path: ['new_password'],
  })
  .refine((v) => v.confirm === v.new_password, {
    message: k('pw.mismatch'),
    path: ['confirm'],
  })

type Values = z.infer<typeof schema>

const FIELDS = [
  ['current_password', 'pw.current', 'current-password'],
  ['new_password', 'pw.new', 'new-password'],
  ['confirm', 'pw.confirm', 'new-password'],
] as const

/** Own password change; forced after root creates / resets the account. */
export function ChangePassword() {
  const t = useT()
  const navigate = useNavigate()
  const { redirect } = useSearch({ from: '/(auth)/change-password' })
  const { user, accessToken, setSession } = useAuthStore((s) => s.auth)
  const forced = !!user?.mustChangePassword
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { current_password: '', new_password: '', confirm: '' },
  })
  const save = useMutation({
    mutationFn: (v: Values) =>
      api.post('/me/password', {
        current_password: v.current_password,
        new_password: v.new_password,
      }),
    onSuccess: () => {
      if (user) setSession(accessToken, { ...user, mustChangePassword: false })
      toast.success(t('pw.changed'))
      navigate({ to: safeRedirect(redirect), replace: true })
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('err.save'))),
  })

  return (
    <AuthLayout>
      <Card className='w-full max-w-sm gap-4'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-lg tracking-tight'>
            <KeyRound className='size-5' /> {t('pw.title')}
          </CardTitle>
          <CardDescription>
            {t(forced ? 'pw.forced' : 'pw.desc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((v) => save.mutate(v))}
              className='grid gap-3'
            >
              {FIELDS.map(([name, label, autoComplete]) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t(label)}</FormLabel>
                      <FormControl>
                        <PasswordInput autoComplete={autoComplete} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
              <Button className='mt-2' disabled={save.isPending}>
                {save.isPending && <Loader2 className='animate-spin' />}
                {t('pw.save')}
              </Button>
              {!forced && (
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => navigate({ to: safeRedirect(redirect) })}
                >
                  {t('common.cancel')}
                </Button>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </AuthLayout>
  )
}
