import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/stores/auth-store'
import { ChangePassword } from '@/features/auth/change-password'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/change-password')({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }
  },
  component: ChangePassword,
  validateSearch: searchSchema,
})
