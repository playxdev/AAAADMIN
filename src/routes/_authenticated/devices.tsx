import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage } from '@/features/resources'
import { resources } from '@/features/resources/config'

export const Route = createFileRoute('/_authenticated/devices')({
  component: () => <ResourcePage config={resources.devices} />,
})
