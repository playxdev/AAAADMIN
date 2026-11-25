import { createFileRoute } from '@tanstack/react-router'
import { AccessLogs } from '@/features/access-logs'

export const Route = createFileRoute('/_authenticated/access-logs')({
  component: AccessLogs,
})
