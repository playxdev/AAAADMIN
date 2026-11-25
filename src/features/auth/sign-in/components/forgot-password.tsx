import { MessageCircle } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// PlayDevX LINE OA (e.g. https://lin.ee/xxxx); set in .env.production.
const SUPPORT_LINE_URL = import.meta.env.VITE_SUPPORT_LINE_URL

/** Admins have no e-mail: a forgotten password is reset by PlayDevX (root). */
export function ForgotPassword() {
  const t = useT()
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type='button'
          variant='link'
          size='sm'
          className='justify-self-center'
        >
          {t('pw.forgot')}
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>{t('pw.forgotTitle')}</DialogTitle>
          <DialogDescription>{t('pw.forgotDesc')}</DialogDescription>
        </DialogHeader>
        {SUPPORT_LINE_URL && (
          <DialogFooter>
            <Button variant='success' asChild className='w-full'>
              <a href={SUPPORT_LINE_URL} target='_blank' rel='noreferrer'>
                <MessageCircle /> {t('pw.contactLine')}
              </a>
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
