import { afterEach, describe, expect, it } from 'vitest'
import { type TKey, t, useLangStore } from './i18n'

describe('i18n', () => {
  afterEach(() => useLangStore.getState().setLang('en'))

  it('translates and interpolates in the current language', () => {
    useLangStore.getState().setLang('en')
    expect(t('table.pageOf', { page: 2, total: 5 })).toBe('Page 2 of 5')
    useLangStore.getState().setLang('th')
    expect(t('table.pageOf', { page: 2, total: 5 })).toBe('หน้า 2 จาก 5')
    expect(document.documentElement.lang).toBe('th')
  })

  it('falls back to the key for unknown keys', () => {
    expect(t('api.SOME_NEW_CODE' as TKey)).toBe('api.SOME_NEW_CODE')
  })
})
