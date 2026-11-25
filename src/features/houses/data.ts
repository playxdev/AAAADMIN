import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { k } from '@/lib/i18n'
import type { Contact, House, PaymentStatus } from '@/lib/types'

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
  house_number: z.string().trim().min(1, k('v.houseNumber')).max(32),
  house_code: z
    .string()
    .trim()
    .refine((v) => v === '' || HOUSE_CODE_RE.test(v), k('v.houseCode')),
  zone_or_soi: z.string().trim().max(64),
  payment_status: z.enum(['NORMAL', 'OVERDUE', 'OVERDUE_SEVERE']),
  occupancy_status: z.enum(['OCCUPIED', 'VACANT']),
  contacts: z.array(
    z
      .object({
        user_id: z.string().optional(),
        full_name: z.string().trim().max(128),
        phone_number: z.string().trim().max(32),
        role: z.enum(['OWNER', 'RESIDENT', 'TENANT']),
      })
      // A blank row is ignored on save, but a phone needs a name.
      .refine((c) => c.full_name !== '' || c.phone_number === '', {
        message: k('v.fullName'),
        path: ['full_name'],
      })
  ),
})

type ContactRow = z.input<typeof houseSchema>['contacts'][number]

/** payment_status is only sent on edit (the API sets NORMAL on create). */
export function toHousePayload(
  v: z.input<typeof houseSchema>,
  isEdit: boolean
) {
  const payload: Record<string, unknown> = {
    house_number: v.house_number.trim(),
    house_code: v.house_code.trim() || null,
    zone_or_soi: v.zone_or_soi.trim() || null,
    occupancy_status: v.occupancy_status,
  }
  if (isEdit) payload.payment_status = v.payment_status as PaymentStatus
  return payload
}

/** Syncs the dialog's contact rows with the API: add new, update changed, remove dropped. */
export async function saveContacts(
  houseId: string,
  before: Contact[],
  rows: ContactRow[]
) {
  const enc = encodeURIComponent
  const keep = rows.filter((r) => r.full_name.trim())
  const body = (r: ContactRow) => ({
    full_name: r.full_name.trim(),
    phone_number: r.phone_number.trim() || null,
    role: r.role,
  })
  const changed = (r: ContactRow, b: Contact) =>
    b.full_name !== r.full_name.trim() ||
    (b.phone_number ?? '') !== r.phone_number.trim() ||
    b.role !== r.role
  await Promise.all([
    ...before
      .filter((b) => !keep.some((r) => r.user_id === b.user_id))
      .map((b) => api.delete(`/contacts/${enc(b.user_id)}`)),
    ...keep.map((r) => {
      const b = before.find((x) => x.user_id === r.user_id)
      if (!r.user_id || !b)
        return api.post(`/houses/${enc(houseId)}/contacts`, body(r))
      return changed(r, b)
        ? api.patch(`/contacts/${enc(r.user_id)}`, body(r))
        : null
    }),
  ])
}
