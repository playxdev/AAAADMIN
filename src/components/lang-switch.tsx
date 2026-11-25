import { Check, Languages } from 'lucide-react'
import { LANGS, useLangStore, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function LangSwitch() {
  const t = useT()
  const { lang, setLang } = useLangStore()
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='rounded-full'
          aria-label={t('lang.toggle')}
        >
          <Languages />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        {LANGS.map((l) => (
          <DropdownMenuItem key={l.value} onClick={() => setLang(l.value)}>
            {l.label}
            <Check
              size={14}
              className={cn('ms-auto', lang !== l.value && 'hidden')}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
