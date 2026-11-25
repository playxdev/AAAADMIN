import { describe, expect, it } from 'vitest'
import { endOfDayUtc, fmtUtc } from '@/lib/utils'
import {
  credentialSchema,
  toCredentialPayload,
  formatPlate,
  randomQrCode,
  toVehiclePayload,
  vehicleSchema,
} from '@/features/houses/access-data'
import { houseSchema, toHousePayload } from '@/features/houses/data'
import {
  COMMON_AREA,
  keypadDigits,
  toVisitorPayload,
  visitorStatus,
} from '@/features/visitors/data'

describe('dates', () => {
  it('endOfDayUtc returns SQLite UTC for the end of the local day', () => {
    const s = endOfDayUtc('2026-11-01')
    expect(s).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    expect(new Date(s.replace(' ', 'T') + 'Z').getTime()).toBe(
      new Date('2026-11-01T23:59:59').getTime()
    )
  })
  it('fmtUtc treats DB time as UTC', () => {
    expect(fmtUtc(null)).toBe('-')
    expect(fmtUtc('2026-11-01 00:00:00')).toBe(
      new Date('2026-11-01T00:00:00Z').toLocaleString()
    )
  })
})

describe('houses', () => {
  const base = {
    house_number: ' 99/1 ',
    house_code: '',
    zone_or_soi: ' ',
    payment_status: 'OVERDUE' as const,
    occupancy_status: 'OCCUPIED' as const,
    contacts: [],
  }
  it('validates house_code like the API', () => {
    expect(houseSchema.safeParse({ ...base, house_code: '0123' }).success).toBe(
      false
    )
    expect(
      houseSchema.safeParse({ ...base, house_code: '1234567' }).success
    ).toBe(false)
    expect(houseSchema.safeParse({ ...base, house_code: '9801' }).success).toBe(
      true
    )
    expect(houseSchema.safeParse(base).success).toBe(true)
  })
  it('sends payment_status only on edit; empty optional fields become null', () => {
    expect(toHousePayload(base, false)).toEqual({
      house_number: '99/1',
      house_code: null,
      zone_or_soi: null,
      occupancy_status: 'OCCUPIED',
    })
    expect(toHousePayload(base, true)).toMatchObject({
      payment_status: 'OVERDUE',
    })
  })
})

describe('house contacts', () => {
  it('skips blank rows but needs a name when a phone is given', () => {
    const base = {
      house_number: '1/1',
      house_code: '',
      zone_or_soi: '',
      payment_status: 'NORMAL' as const,
      occupancy_status: 'OCCUPIED' as const,
    }
    const row = (full_name: string, phone_number: string) => ({
      full_name,
      phone_number,
      role: 'OWNER' as const,
    })
    const ok = (contacts: ReturnType<typeof row>[]) =>
      houseSchema.safeParse({ ...base, contacts }).success
    expect(ok([row('', '')])).toBe(true)
    expect(ok([row('สมชาย', '0812345678')])).toBe(true)
    expect(ok([row('', '0812345678')])).toBe(false)
  })
})

describe('access', () => {
  it('omits empty optional vehicle fields', () => {
    expect(
      toVehiclePayload({
        plate_prefix: ' กข ',
        plate_number: '1234 ',
        province: '',
        brand: 'Toyota',
        color: '',
        label: 'รถพ่อ',
      })
    ).toEqual({
      license_plate: 'กข 1234',
      province: undefined,
      brand: 'Toyota',
      color: undefined,
    })
  })
  it('splits stored plates and validates category + number', () => {
    expect(formatPlate('1กข1234')).toBe('1กข 1234')
    expect(formatPlate('701234')).toBe('70-1234')
    expect(formatPlate('ABC')).toBe('ABC')
    const v = { province: '', brand: '', color: '', label: '' }
    const ok = (plate_prefix: string, plate_number: string) =>
      vehicleSchema.safeParse({ ...v, plate_prefix, plate_number }).success
    expect(ok('1กข', '1234')).toBe(true)
    expect(ok('จ', '12')).toBe(true)
    expect(ok('70', '1234')).toBe(true)
    expect(ok('70', '12')).toBe(false)
    expect(ok('AB', '1234')).toBe(false)
    expect(ok('1กข', '12345')).toBe(false)
  })
  it('generates QR codes in the format AAAAPI accepts', () => {
    const a = randomQrCode()
    expect(a).toMatch(/^[A-HJ-NP-Z2-9]{20}$/)
    expect(randomQrCode()).not.toBe(a)
  })
  it('PIN is empty (generated) or the 4 digits after the house code', () => {
    expect(
      credentialSchema.safeParse({
        cred_type: 'PIN',
        value: '12a4',
        duration: '1d',
        valid_until: '',
      }).success
    ).toBe(false)
    expect(
      credentialSchema.safeParse({
        cred_type: 'PIN',
        value: '123456',
        duration: '1d',
        valid_until: '',
      }).success
    ).toBe(false)
    for (const value of ['', '1234'])
      expect(
        credentialSchema.safeParse({
          cred_type: 'PIN',
          value,
          duration: '1d',
          valid_until: '',
        }).success
      ).toBe(true)
    expect(
      credentialSchema.safeParse({
        cred_type: 'RFID',
        value: 'A1B2',
        duration: '1d',
        valid_until: '',
      }).success
    ).toBe(true)
  })
  it('sends duration, or valid_until for a custom date', () => {
    const v = {
      cred_type: 'RFID' as const,
      value: 'A1',
      valid_until: '',
    }
    expect(toCredentialPayload({ ...v, duration: 'forever' })).toEqual({
      cred_type: 'RFID',
      value: 'A1',
      duration: 'forever',
    })
    expect(
      toCredentialPayload({
        ...v,
        duration: 'custom',
        valid_until: '2030-01-01',
      })
    ).toHaveProperty('valid_until')
    expect(
      credentialSchema.safeParse({ ...v, duration: 'custom' }).success
    ).toBe(false)
  })
})

describe('visitors', () => {
  it('maps common area to no house_id and drops empty fields', () => {
    const p = toVisitorPayload({
      house_id: COMMON_AREA,
      duration: '7d',
      full_name: '',
      phone_number: '',
      plate_prefix: 'กข',
      plate_number: '9',
      province: 'ชลบุรี',
      brand: 'HONDA',
      color: '',
      purpose: '',
      issue_code: true,
      status: 'ACTIVE',
    })
    expect(p).toEqual({
      house_id: undefined,
      duration: '7d',
      full_name: undefined,
      phone_number: undefined,
      license_plate: 'กข 9',
      province: 'ชลบุรี',
      brand: 'HONDA',
      color: undefined,
      purpose: undefined,
      issue_code: true,
    })
  })
  it('derives status and keypad digits', () => {
    expect(visitorStatus({ id_status: 'REVOKED', is_valid_now: 1 })).toBe(
      'REVOKED'
    )
    expect(visitorStatus({ id_status: 'ACTIVE', is_valid_now: 1 })).toBe(
      'VALID'
    )
    expect(visitorStatus({ id_status: 'ACTIVE', is_valid_now: 0 })).toBe(
      'EXPIRED'
    )
    expect(keypadDigits('+98011234')).toBe('98011234')
  })
})
