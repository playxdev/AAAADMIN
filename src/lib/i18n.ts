import { useCallback } from 'react'
import { en } from '@/locales/en'
import { th } from '@/locales/th'
import { create } from 'zustand'
import { getCookie, setCookie } from './cookies'

const dicts = { th, en }
export type Lang = keyof typeof dicts
export type TKey = keyof typeof en
type Vars = Record<string, string | number>

export const LANGS: { value: Lang; label: string }[] = [
  { value: 'th', label: 'ไทย' },
  { value: 'en', label: 'English' },
]

const LANG_COOKIE = 'lang'

function initialLang(): Lang {
  const saved = getCookie(LANG_COOKIE)
  if (saved && saved in dicts) return saved as Lang
  return navigator.language.startsWith('th') ? 'th' : 'en'
}

export const useLangStore = create<{
  lang: Lang
  setLang: (lang: Lang) => void
}>()((set) => ({
  lang: initialLang(),
  setLang: (lang) => {
    setCookie(LANG_COOKIE, lang, 60 * 60 * 24 * 365)
    set({ lang })
  },
}))

const syncHtmlLang = (lang: Lang) => (document.documentElement.lang = lang)
syncHtmlLang(useLangStore.getState().lang)
useLangStore.subscribe((s) => syncHtmlLang(s.lang))

/** Unknown keys (e.g. an API error code with no entry) fall back to the key itself. */
function format(lang: Lang, key: string, vars?: Vars) {
  const s = (dicts[lang] as Record<string, string>)[key] ?? key
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => String(vars[k] ?? m)) : s
}

/** For non-React code (toasts, axios helpers). Components use useT() so they re-render on language change. */
export const t = (key: TKey, vars?: Vars) =>
  format(useLangStore.getState().lang, key, vars)

export function useT() {
  const lang = useLangStore((s) => s.lang)
  return useCallback(
    (key: TKey, vars?: Vars) => format(lang, key, vars),
    [lang]
  )
}

/** Type-checks a key that is translated later, e.g. zod messages rendered by FormMessage. */
export const k = (key: TKey) => key

/** BCP 47 locale for Intl date formatting; undefined = browser default. */
export const dateLocale = () =>
  useLangStore.getState().lang === 'th' ? 'th-TH' : undefined
