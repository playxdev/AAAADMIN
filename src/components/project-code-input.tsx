import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

type Props = Omit<React.ComponentProps<'input'>, 'value' | 'onChange'> & {
  /** "PROJ-0001" (or partial, e.g. "PRO" / "PROJ-00"). */
  value: string
  onChange: (value: string) => void
  /** Accessible name of the second box (the branch / number part). */
  suffixLabel: string
}

const clean = (v: string) => v.toUpperCase().replace(/[^A-Z0-9]/g, '')

/**
 * Project code as two 4-char boxes: AAAA - AA11.
 * Typing the 4th char jumps to the 2nd box, Backspace on an empty 2nd box jumps back,
 * and typing / pasting a whole code ("proj0001", "PROJ-0001") into the 1st box fills both.
 * Extra props (id, aria-*) from FormControl go to the 1st box so the label targets it.
 */
export function ProjectCodeInput({
  value,
  onChange,
  suffixLabel,
  className,
  onBlur,
  ...first
}: Props) {
  const suffixRef = useRef<HTMLInputElement>(null)
  const [head = '', tail = ''] = value.split('-')
  const emit = (h: string, t: string) => onChange(t ? `${h}-${t}` : h)
  const box =
    'h-10 min-w-0 flex-1 text-center font-mono text-base tracking-[0.2em] uppercase'

  return (
    <div className={cn('flex w-full items-center gap-2', className)}>
      <Input
        {...first}
        value={head}
        autoComplete='organization'
        autoCapitalize='characters'
        spellCheck={false}
        maxLength={9}
        placeholder='PROJ'
        className={box}
        onBlur={onBlur}
        onChange={(e) => {
          const c = clean(e.target.value)
          // A whole code typed / pasted here spills into the 2nd box.
          const h = c.slice(0, 4)
          const t = c.length > 4 ? c.slice(4, 8) : tail
          emit(h, t)
          if (c.length >= 4) suffixRef.current?.focus()
        }}
      />
      <span aria-hidden className='text-lg font-semibold text-muted-foreground'>
        -
      </span>
      <Input
        ref={suffixRef}
        aria-label={suffixLabel}
        value={tail}
        autoComplete='off'
        autoCapitalize='characters'
        spellCheck={false}
        maxLength={4}
        placeholder='0001'
        className={box}
        onBlur={onBlur}
        onChange={(e) => emit(head, clean(e.target.value).slice(0, 4))}
        onKeyDown={(e) => {
          if (e.key === 'Backspace' && !tail) {
            e.preventDefault()
            emit(head.slice(0, -1), '')
            ;(
              e.currentTarget.previousElementSibling
                ?.previousElementSibling as HTMLInputElement | null
            )?.focus()
          }
        }}
      />
    </div>
  )
}
