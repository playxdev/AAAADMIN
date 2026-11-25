import { useNavigate, useRouter } from '@tanstack/react-router'
import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

export function UnauthorisedError() {
  const t = useT()
  const navigate = useNavigate()
  const { history } = useRouter()
  return (
    <div className='h-svh'>
      <div className='m-auto flex h-full w-full flex-col items-center justify-center gap-2'>
        <h1 className='text-[7rem] leading-tight font-bold'>401</h1>
        <span className='font-medium'>{t('e401.title')}</span>
        <p className='text-center text-muted-foreground'>{t('e401.desc')}</p>
        <div className='mt-6 flex gap-4'>
          <Button variant='outline' onClick={() => history.go(-1)}>
            {t('common.goBack')}
          </Button>
          <Button onClick={() => navigate({ to: '/' })}>
            {t('common.backHome')}
          </Button>
        </div>
      </div>
    </div>
  )
}
