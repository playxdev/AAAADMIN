import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { tokenClaims, useAuthStore } from '@/stores/auth-store'
import { api, apiErrorMessage } from '@/lib/api'
import { getCookie, setCookie } from '@/lib/cookies'
import { k, t as tNow, useT } from '@/lib/i18n'
import type { AdminLoginRequest, AdminLoginResponse } from '@/lib/types'
import { cn, normalizeProjectCode, safeRedirect } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const PROJECT_CODE_COOKIE = 'project_code'

const formSchema = z.object({
  project_code: z
    .string()
    .refine((v) => normalizeProjectCode(v) !== null, k('v.projectCode')),
  admin_name: z.string().trim().min(1, k('v.adminName')),
  password: z.string().min(1, k('v.password')),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const t = useT()
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    // Remembered from the last successful login on this device.
    defaultValues: {
      project_code: getCookie(PROJECT_CODE_COOKIE) ?? '',
      admin_name: '',
      password: '',
    },
  })

  async function onSubmit(data: AdminLoginRequest) {
    setIsLoading(true)
    try {
      const res = await api.post<AdminLoginResponse>('/login', {
        ...data,
        project_code: normalizeProjectCode(data.project_code),
      })
      const claims = tokenClaims(res.data.access_token)
      setCookie(PROJECT_CODE_COOKIE, res.data.project_code, 60 * 60 * 24 * 365)
      // The admin JWT carries only sub (admin id) and pid (project id).
      auth.setSession(res.data.access_token, {
        id: claims.sub,
        fullName: data.admin_name,
        projectId: claims.pid,
        projectCode: res.data.project_code,
        projectName: res.data.project_name,
        level: res.data.admin_level,
      })
      toast.success(tNow('auth.welcome', { name: data.admin_name }))
      navigate({ to: safeRedirect(redirectTo), replace: true })
    } catch (error) {
      toast.error(apiErrorMessage(error, tNow('err.login')))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='project_code'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.projectCode')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('auth.projectCodePh')}
                  autoComplete='organization'
                  autoCapitalize='characters'
                  className='font-mono uppercase'
                  maxLength={10}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='admin_name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.name')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('auth.namePh')}
                  autoComplete='username'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('auth.password')}</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder='********'
                  autoComplete='current-password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          {t('auth.signIn')}
        </Button>
      </form>
    </Form>
  )
}
