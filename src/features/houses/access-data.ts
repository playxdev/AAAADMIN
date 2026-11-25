import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { k } from '@/lib/i18n'
import type { HouseDetail } from '@/lib/types'
import { endOfDayUtc } from '@/lib/utils'
import { DURATIONS } from '@/features/visitors/data'

/** House with its contacts, vehicles and credentials (Access dialog). */
export function useHouse(id: string | undefined) {
  return useQuery({
    queryKey: ['houses', id],
    queryFn: () =>
      api
        .get<HouseDetail>(`/houses/${encodeURIComponent(id!)}`)
        .then((r) => r.data),
    enabled: !!id,
  })
}

// Same rule as AAAAPI PLATE_RE. หมวด: optional digit + 1-3 Thai letters (1กข, จ, รวย) or 2 digits (truck/bus 70).
export const PLATE_PREFIX_RE = /^(\d?[ก-ฮ]{1,3}|\d{2})$/
const PLATE_SPLIT_RE = /^(\d?[ก-ฮ]{1,3}|\d{2})(\d{1,4})$/
const isTruckPrefix = (prefix: string) => /^\d{2}$/.test(prefix.trim())

/** Stored "1กข1234" / "701234" -> "1กข 1234" / "70-1234"; anything else as stored. */
export function formatPlate(plate: string) {
  const m = PLATE_SPLIT_RE.exec(plate)
  if (!m) return plate
  return isTruckPrefix(m[1]) ? `${m[1]}-${m[2]}` : `${m[1]} ${m[2]}`
}

export const vehicleSchema = z
  .object({
    plate_prefix: z.string().trim().regex(PLATE_PREFIX_RE, k('v.platePrefix')),
    plate_number: z
      .string()
      .trim()
      .regex(/^\d{1,4}$/, k('v.plateNumber')),
    province: z.string().trim().max(64),
    brand: z.string().trim().max(64),
    color: z.string().trim().max(32),
  })
  // Truck/bus plates (70-1234) always have 4 digits.
  .refine(
    (v) => !isTruckPrefix(v.plate_prefix) || v.plate_number.trim().length === 4,
    { message: k('v.plateNumber4'), path: ['plate_number'] }
  )

export const credentialSchema = z
  .object({
    cred_type: z.enum(['RFID', 'QRCODE', 'PIN']),
    value: z.string().trim().max(256),
    duration: z.enum([...DURATIONS, 'custom']),
    valid_until: z.string(),
  })
  .refine((v) => v.duration !== 'custom' || v.valid_until !== '', {
    message: k('v.date'),
    path: ['valid_until'],
  })
  .refine((v) => v.value !== '', {
    message: k('v.value'),
    path: ['value'],
  })
  // Same rule as AAAAPI: PIN is 4-8 digits.
  .refine((v) => v.cred_type !== 'PIN' || /^\d{4,8}$/.test(v.value), {
    message: k('v.pin'),
    path: ['value'],
  })

/** Optional fields are omitted (undefined), matching the API's optional body fields. */
export function toVehiclePayload(v: z.input<typeof vehicleSchema>) {
  return {
    license_plate: `${v.plate_prefix.trim()} ${v.plate_number.trim()}`,
    province: v.province.trim() || undefined,
    brand: v.brand.trim() || undefined,
    color: v.color.trim() || undefined,
  }
}

export function toCredentialPayload(v: z.input<typeof credentialSchema>) {
  return {
    cred_type: v.cred_type,
    value: v.value.trim(),
    ...(v.duration === 'custom'
      ? { valid_until: endOfDayUtc(v.valid_until) }
      : { duration: v.duration }),
  }
}

// Same format AAAAPI checks for QRCODE: 20 chars, 32-symbol alphabet (100 bits). 256 % 32 = 0, so no modulo bias.
const QR_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const randomQrCode = () =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(20)),
    (b) => QR_ALPHABET[b % 32]
  ).join('')

type CredType = z.input<typeof credentialSchema>['cred_type']
/** Resident RFID cards are long-lived; PIN / QR default to 1 day. */
export const defaultDuration = (t: CredType) =>
  t === 'RFID' ? ('forever' as const) : ('1d' as const)
