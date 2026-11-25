import { describe, expect, it } from 'vitest'
import { toLogParams } from '@/features/access-logs/data'
import { buildSchema, resources, toPayload } from './config'

describe('toPayload', () => {
  it('trims values and nulls empty optional fields', () => {
    const payload = toPayload(resources.projects.fields, {
      project_name: '  Green Ville ',
      address: '   ',
      contact_number: '02-000-0000',
    })
    expect(payload).toEqual({
      project_name: 'Green Ville',
      address: null,
      contact_number: '02-000-0000',
    })
  })
})

describe('buildSchema', () => {
  it('requires required fields after trimming', () => {
    const schema = buildSchema(resources.blacklist)
    const bad = schema.safeParse({
      project_id: ' ',
      license_plate: 'กข 1234',
      reason: '',
    })
    expect(bad.success).toBe(false)
    const ok = schema.safeParse({
      project_id: 'PRJ-1',
      license_plate: 'กข 1234',
      reason: '',
    })
    expect(ok.success).toBe(true)
  })
})

describe('toLogParams', () => {
  it('omits empty filters and makes date_to inclusive of the whole day', () => {
    expect(toLogParams(' ', '', '')).toEqual({})
    const p = toLogParams('กข1234', '2026-11-01', '2026-11-01')
    expect(p.license_plate).toBe('กข1234')
    expect(
      new Date(p.date_to!).getTime() - new Date(p.date_from!).getTime()
    ).toBe(86_400_000 - 1)
  })
})
