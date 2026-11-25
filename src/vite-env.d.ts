/// <reference types="vite/client" />
declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
  /** PlayDevX LINE OA link shown on "forgot password". */
  readonly VITE_SUPPORT_LINE_URL?: string
}
