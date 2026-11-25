import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { api, apiErrorMessage } from '@/lib/api'
import type { AdminLoginRequest, AdminLoginResponse } from '@/lib/types'
import { cn, safeRedirect } from '@/lib/utils'
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

const formSchema = z.object({
  admin_name: z.string().trim().min(1, 'Please enter your admin name.'),
  password: z.string().min(1, 'Please enter your password.'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { admin_name: '', password: '' },
  })

  async function onSubmit(data: AdminLoginRequest) {
    setIsLoading(true)
    try {
      const res = await api.post<AdminLoginResponse>('/auth/admin/login', data)
      auth.setSession(res.data.token, {
        id: res.data.admin_id,
        fullName: res.data.full_name,
        role: res.data.role,
      })
      toast.success(`Welcome back, ${res.data.full_name}!`)
      navigate({ to: safeRedirect(redirectTo), replace: true })
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Login failed'))
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
          name='admin_name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admin Name</FormLabel>
              <FormControl>
                <Input
                  placeholder='Admin username'
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
              <FormLabel>Password</FormLabel>
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
          Sign in
        </Button>
      </form>
    </Form>
  )
}
