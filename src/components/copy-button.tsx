import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

/** Icon button that copies `value`; the icon turns into a check for a moment. */
export function CopyButton({ value }: { value: string }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      className='size-8'
      aria-label={t('common.copy')}
      title={t('common.copy')}
      onClick={() =>
        // Clipboard API needs a secure context (https or localhost).
        navigator.clipboard.writeText(value).then(
          () => {
            setCopied(true)
            toast.success(t('common.copied'))
            setTimeout(() => setCopied(false), 1500)
          },
          () => toast.error(t('common.copyFailed'))
        )
      }
    >
      {copied ? <Check className='text-success' /> : <Copy />}
    </Button>
  )
}
