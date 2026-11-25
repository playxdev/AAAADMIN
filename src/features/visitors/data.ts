import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Visitor } from '@/lib/types'

export function useVisitors(validOnly: boolean) {
  return useQuery({
    queryKey: ['visitors', { validOnly }],
    queryFn: () =>
      api
        .get<{
          visitors: Visitor[]
        }>('/visitors', { params: validOnly ? { valid: '1' } : undefined })
        .then((r) => r.data.visitors),
  })
}

export const DURATIONS = ['1d', '7d', '14d', '30d', '1y', 'forever'] as const

/** Radix Select cannot use '' as a value. */
export const COMMON_AREA = '__common'

export const visitorSchema = z.object({
  house_id: z.string(),
  duration: z.enum(DURATIONS),
  full_name: z.string().trim().max(128),
  phone_number: z.string().trim().max(32),
  license_plate: z.string().trim().max(32),
  purpose: z.string().trim().max(64),
  issue_code: z.boolean(),
})

export function toVisitorPayload(v: z.input<typeof visitorSchema>) {
  const opt = (s: string) => s.trim() || undefined
  return {
    house_id: v.house_id && v.house_id !== COMMON_AREA ? v.house_id : undefined,
    duration: v.duration,
    full_name: opt(v.full_name),
    phone_number: opt(v.phone_number),
    license_plate: opt(v.license_plate),
    purpose: opt(v.purpose),
    issue_code: v.issue_code,
  }
}

export function visitorStatus(v: Pick<Visitor, 'id_status' | 'is_valid_now'>) {
  if (v.id_status === 'REVOKED') return 'REVOKED' as const
  return v.is_valid_now ? ('VALID' as const) : ('EXPIRED' as const)
}

/** "+12345" Guest Code -> digits typed on the keypad. */
export const keypadDigits = (code: string) => code.replace('+', '')
