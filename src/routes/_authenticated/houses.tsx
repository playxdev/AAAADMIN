import { createFileRoute } from '@tanstack/react-router'
import { Houses } from '@/features/houses'

export const Route = createFileRoute('/_authenticated/houses')({
  component: Houses,
})
