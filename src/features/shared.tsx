import { useT } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'

export function ActiveBadge({ active }: { active: boolean }) {
  const t = useT()
  return active ? (
    <Badge className='bg-emerald-600 text-white'>{t('status.ACTIVE')}</Badge>
  ) : (
    <Badge variant='secondary'>{t('status.INACTIVE')}</Badge>
  )
}
