import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage } from '@/features/resources'
import { resources } from '@/features/resources/config'

export const Route = createFileRoute('/_authenticated/vehicles')({
  component: () => <ResourcePage config={resources.vehicles} />,
})
