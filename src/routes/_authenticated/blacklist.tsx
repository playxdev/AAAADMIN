import { createFileRoute } from '@tanstack/react-router'
import { ResourcePage } from '@/features/resources'
import { resources } from '@/features/resources/config'

export const Route = createFileRoute('/_authenticated/blacklist')({
  component: () => <ResourcePage config={resources.blacklist} />,
})
