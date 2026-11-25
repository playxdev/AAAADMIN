import { describe, expect, it } from 'vitest'
import { endOfDayUtc, fmtUtc } from '@/lib/utils'
import { houseSchema, toHousePayload } from '@/features/houses/data'
import {
  credentialSchema,
  toCredentialPayload,
  toResidentPayload,
  toVehiclePayload,
} from '@/features/residents/data'
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
    })
    expect(toHousePayload(base, true)).toMatchObject({
      payment_status: 'OVERDUE',
    })
  })
})

describe('residents', () => {
  it('adds is_active only when re-activating', () => {
    const v = {
      full_name: 'สมชาย',
      house_id: 'H1',
      phone_number: '',
      line_id: '',
      reactivate: false,
    }
    expect(toResidentPayload(v)).toEqual({
      full_name: 'สมชาย',
      house_id: 'H1',
      phone_number: null,
      line_id: null,
    })
    expect(toResidentPayload({ ...v, reactivate: true })).toMatchObject({
      is_active: true,
    })
  })
  it('omits empty optional vehicle fields', () => {
    expect(
      toVehiclePayload({
        license_plate: ' กข 1234 ',
        province: '',
        brand: 'Toyota',
        color: '',
      })
    ).toEqual({
      license_plate: 'กข 1234',
      province: undefined,
      brand: 'Toyota',
      color: undefined,
    })
  })
  it('requires a 4-8 digit PIN', () => {
    expect(
      credentialSchema.safeParse({
        cred_type: 'PIN',
        value: '12a4',
        valid_until: '',
      }).success
    ).toBe(false)
    expect(
      credentialSchema.safeParse({
        cred_type: 'PIN',
        value: '1234',
        valid_until: '',
      }).success
    ).toBe(true)
    expect(
      credentialSchema.safeParse({
        cred_type: 'RFID',
        value: 'A1B2',
        valid_until: '',
      }).success
    ).toBe(true)
    expect(
      toCredentialPayload({ cred_type: 'RFID', value: 'A1', valid_until: '' })
        .valid_until
    ).toBeUndefined()
  })
})

describe('visitors', () => {
  it('maps common area to no house_id and drops empty fields', () => {
    const p = toVisitorPayload({
      house_id: COMMON_AREA,
      duration: '7d',
      full_name: '',
      phone_number: '',
      license_plate: 'ZZ 9',
      purpose: '',
      issue_code: true,
    })
    expect(p).toEqual({
      house_id: undefined,
      duration: '7d',
      full_name: undefined,
      phone_number: undefined,
      license_plate: 'ZZ 9',
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
