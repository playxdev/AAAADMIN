import { Badge } from '@/components/ui/badge'

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className='bg-emerald-600 text-white'>ACTIVE</Badge>
  ) : (
    <Badge variant='destructive'>INACTIVE</Badge>
  )
}
