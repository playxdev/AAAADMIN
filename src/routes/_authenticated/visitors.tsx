import { createFileRoute } from '@tanstack/react-router'
import { Visitors } from '@/features/visitors'

export const Route = createFileRoute('/_authenticated/visitors')({
  component: Visitors,
})
