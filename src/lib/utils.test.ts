import { describe, expect, it } from 'vitest'
import {
  digitsOnly,
  getPageNumbers,
  normalizeProjectCode,
  plateCategoryChars,
} from './utils'

describe('getPageNumbers', () => {
  it('returns all pages when total is at most 5', () => {
    expect(getPageNumbers(1, 3)).toEqual([1, 2, 3])
    expect(getPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('shows ellipsis near the beginning', () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, 3, 4, '...', 10])
    expect(getPageNumbers(3, 10)).toEqual([1, 2, 3, 4, '...', 10])
  })

  it('shows ellipsis near the end', () => {
    expect(getPageNumbers(10, 10)).toEqual([1, '...', 7, 8, 9, 10])
    expect(getPageNumbers(9, 10)).toEqual([1, '...', 7, 8, 9, 10])
  })

  it('shows ellipsis on both side in the middle', () => {
    expect(getPageNumbers(5, 10)).toEqual([1, '...', 4, 5, 6, '...', 10])
  })

  it('handles current page greater than total pages', () => {
    expect(getPageNumbers(6, 5)).toEqual([1, 2, 3, 4, 5])
    expect(getPageNumbers(11, 10)).toEqual([1, '...', 7, 8, 9, 10])
  })
})

describe('normalizeProjectCode', () => {
  it('accepts AAAA-AA11 in any case, with or without dash', () => {
    expect(normalizeProjectCode(' proj0001 ')).toBe('PROJ-0001')
    expect(normalizeProjectCode('SNTW-BK01')).toBe('SNTW-BK01')
    expect(normalizeProjectCode('PRJ-0001')).toBeNull()
    expect(normalizeProjectCode('1234-ABCD')).toBeNull()
  })
})

describe('digitsOnly / plateCategoryChars', () => {
  it('drops Thai vowels from the Thai number row and maps Thai digits', () => {
    expect(digitsOnly('5ุ5ึ55')).toBe('5555')
    expect(digitsOnly('๑๒๓๔')).toBe('1234')
    expect(plateCategoryChars('1กุข ')).toBe('1กข')
  })
})
