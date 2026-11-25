import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Resident, ResidentDetail } from '@/lib/types'
import { endOfDayUtc } from '@/lib/utils'

export function useResidents() {
  return useQuery({
    queryKey: ['residents'],
    queryFn: () =>
      api
        .get<{ residents: Resident[] }>('/residents')
        .then((r) => r.data.residents),
  })
}

export function useResident(id: string | undefined) {
  return useQuery({
    queryKey: ['residents', id],
    queryFn: () =>
      api
        .get<ResidentDetail>(`/residents/${encodeURIComponent(id!)}`)
        .then((r) => r.data),
    enabled: !!id,
  })
}

export const residentSchema = z.object({
  full_name: z.string().trim().min(1, 'Full Name is required.').max(128),
  house_id: z.string().min(1, 'House is required.'),
  phone_number: z.string().trim().max(32),
  line_id: z.string().trim().max(64),
  reactivate: z.boolean(),
})

export function toResidentPayload(v: z.input<typeof residentSchema>) {
  const payload: Record<string, unknown> = {
    full_name: v.full_name.trim(),
    house_id: v.house_id,
    phone_number: v.phone_number.trim() || null,
    line_id: v.line_id.trim() || null,
  }
  if (v.reactivate) payload.is_active = true
  return payload
}

export const vehicleSchema = z.object({
  license_plate: z.string().trim().min(1, 'Plate is required.').max(32),
  province: z.string().trim().max(64),
  brand: z.string().trim().max(64),
  color: z.string().trim().max(32),
})

export const credentialSchema = z
  .object({
    cred_type: z.enum(['RFID', 'QRCODE', 'PIN']),
    value: z.string().trim().min(1, 'Value is required.').max(256),
    valid_until: z.string(),
  })
  // Same rule as AAAAPI: PIN is 4-8 digits.
  .refine((v) => v.cred_type !== 'PIN' || /^\d{4,8}$/.test(v.value), {
    message: 'PIN must be 4-8 digits.',
    path: ['value'],
  })

/** Optional fields are omitted (undefined), matching the API's optional body fields. */
export function toVehiclePayload(v: z.input<typeof vehicleSchema>) {
  return {
    license_plate: v.license_plate.trim(),
    province: v.province.trim() || undefined,
    brand: v.brand.trim() || undefined,
    color: v.color.trim() || undefined,
  }
}

export function toCredentialPayload(v: z.input<typeof credentialSchema>) {
  return {
    cred_type: v.cred_type,
    value: v.value.trim(),
    valid_until: v.valid_until ? endOfDayUtc(v.valid_until) : undefined,
  }
}
