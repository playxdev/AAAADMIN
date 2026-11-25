import { type TKey, useT } from '@/lib/i18n'
import { COLORS } from '../vehicle-options'

/** Colour dropdown items (swatch + translated name), shared by house and visitor vehicles. */
export function useColorItems() {
  const t = useT()
  return Object.entries(COLORS).map(([code, hex]) => ({
    value: code,
    label: (
      <span className='flex items-center gap-2'>
        <span
          className='size-3.5 rounded-full border border-border'
          style={{ backgroundColor: hex }}
        />
        {t(`color.${code}` as TKey)}
      </span>
    ),
  }))
}
