import { createFileRoute, redirect } from '@tanstack/react-router'
import { isAuthenticated, useAuthStore } from '@/stores/auth-store'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/sign-in', search: { redirect: location.href } })
    }
    // The API refuses everything else until a root-issued password is replaced.
    if (useAuthStore.getState().auth.user?.mustChangePassword) {
      throw redirect({
        to: '/change-password',
        search: { redirect: location.href },
      })
    }
  },
  component: AuthenticatedLayout,
})
