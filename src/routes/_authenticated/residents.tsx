import { createFileRoute } from '@tanstack/react-router'
import { Residents } from '@/features/residents'

export const Route = createFileRoute('/_authenticated/residents')({
  component: Residents,
})
