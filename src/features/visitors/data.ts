import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { k } from '@/lib/i18n'
import type { Visitor } from '@/lib/types'
import { PROVINCES } from '@/features/houses/vehicle-options'

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

// Same rule as PLATE_PREFIX_RE in houses/access-data (not imported: that module imports this one).
const PLATE_PREFIX_RE = /^(\d?[ก-ฮ]{1,3}|\d{2})$/

// Plate is optional; when given it follows the same rules as a house vehicle.
export const visitorSchema = z
  .object({
    house_id: z.string(),
    duration: z.enum(DURATIONS),
    full_name: z.string().trim().max(128),
    phone_number: z.string().trim().max(32),
    plate_prefix: z.string().trim(),
    plate_number: z.string().trim(),
    province: z.string().trim().max(64),
    brand: z.string().trim().max(64),
    color: z.string().trim().max(32),
    purpose: z.string().trim().max(64),
    issue_code: z.boolean(),
    // Edit only: ACTIVE / REVOKED (revoked visitors can be re-activated).
    status: z.enum(['ACTIVE', 'REVOKED']),
  })
  .refine(
    (v) =>
      (!v.plate_prefix && !v.plate_number) ||
      PLATE_PREFIX_RE.test(v.plate_prefix),
    { message: k('v.platePrefix'), path: ['plate_prefix'] }
  )
  .refine(
    (v) =>
      (!v.plate_prefix && !v.plate_number) || /^\d{1,4}$/.test(v.plate_number),
    { message: k('v.plateNumber'), path: ['plate_number'] }
  )
  // Thai plates carry the province in Thai: pick it from the list.
  .refine((v) => !v.province || PROVINCES.includes(v.province), {
    message: k('v.province'),
    path: ['province'],
  })
  .refine(
    (v) => !/^\d{2}$/.test(v.plate_prefix) || v.plate_number.length === 4,
    { message: k('v.plateNumber4'), path: ['plate_number'] }
  )

export function toVisitorPayload(v: z.input<typeof visitorSchema>) {
  const opt = (s: string) => s.trim() || undefined
  return {
    house_id: v.house_id && v.house_id !== COMMON_AREA ? v.house_id : undefined,
    duration: v.duration,
    full_name: opt(v.full_name),
    phone_number: opt(v.phone_number),
    license_plate: v.plate_prefix
      ? `${v.plate_prefix.trim()} ${v.plate_number.trim()}`
      : undefined,
    province: v.plate_prefix ? opt(v.province) : undefined,
    brand: v.plate_prefix ? opt(v.brand) : undefined,
    color: v.plate_prefix ? opt(v.color) : undefined,
    purpose: opt(v.purpose),
    issue_code: v.issue_code,
  }
}

/** Stored "1กข1234" -> ["1กข", "1234"] for the edit form; anything else stays in the prefix box. */
export function splitPlate(plate: string | null): [string, string] {
  if (!plate) return ['', '']
  const m = /^(\d?[ก-ฮ]{1,3}|\d{2})(\d{1,4})$/.exec(plate)
  return m ? [m[1], m[2]] : [plate, '']
}

/** PATCH body: empty text clears the field (null); no plate clears the whole vehicle. */
export function toVisitorEditPayload(v: z.input<typeof visitorSchema>) {
  const p = toVisitorPayload(v)
  return {
    full_name: p.full_name ?? null,
    phone_number: p.phone_number ?? null,
    purpose: p.purpose ?? null,
    license_plate: p.license_plate ?? null,
    province: p.province ?? null,
    brand: p.brand ?? null,
    color: p.color ?? null,
    is_active: v.status === 'ACTIVE',
  }
}

export function visitorStatus(v: Pick<Visitor, 'id_status' | 'is_valid_now'>) {
  if (v.id_status === 'REVOKED') return 'REVOKED' as const
  return v.is_valid_now ? ('VALID' as const) : ('EXPIRED' as const)
}

/** "+12345" Guest Code -> digits typed on the keypad. */
export const keypadDigits = (code: string) => code.replace('+', '')
