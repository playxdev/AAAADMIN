import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { House, PaymentStatus } from '@/lib/types'

export function useHouses() {
  return useQuery({
    queryKey: ['houses'],
    queryFn: () =>
      api.get<{ houses: House[] }>('/houses').then((r) => r.data.houses),
  })
}

// Same rule as AAAAPI HOUSE_CODE_RE: 1-6 digits, no leading zero.
const HOUSE_CODE_RE = /^[1-9]\d{0,5}$/

export const houseSchema = z.object({
  house_number: z.string().trim().min(1, 'House Number is required.').max(32),
  house_code: z
    .string()
    .trim()
    .refine(
      (v) => v === '' || HOUSE_CODE_RE.test(v),
      '1-6 digits, not starting with 0.'
    ),
  zone_or_soi: z.string().trim().max(64),
  payment_status: z.enum(['NORMAL', 'OVERDUE', 'OVERDUE_SEVERE']),
})

/** payment_status is only sent on edit (the API sets NORMAL on create). */
export function toHousePayload(
  v: z.input<typeof houseSchema>,
  isEdit: boolean
) {
  const payload: Record<string, unknown> = {
    house_number: v.house_number.trim(),
    house_code: v.house_code.trim() || null,
    zone_or_soi: v.zone_or_soi.trim() || null,
  }
  if (isEdit) payload.payment_status = v.payment_status as PaymentStatus
  return payload
}
