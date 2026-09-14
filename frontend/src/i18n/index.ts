import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en/translation.json'

export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिन्दी', short: 'हि' },
  { code: 'bn', label: 'বাংলা', short: 'বা' },
  { code: 'mr', label: 'मराठी', short: 'म' },
  { code: 'ta', label: 'தமிழ்', short: 'த' },
  { code: 'te', label: 'తెలుగు', short: 'తె' },
  { code: 'gu', label: 'ગુજરાતી', short: 'ગુ' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', short: 'ਪੰ' },
] as const

const CODES = LANGUAGES.map((l) => l.code)

// Each locale is code-split; only the active language is fetched.
// English ships in the main bundle because it is the fallback language.
const loaders: Record<string, () => Promise<{ default: object }>> = {
  en: () => Promise.resolve({ default: en }),
  hi: () => import('./locales/hi/translation.json'),
  bn: () => import('./locales/bn/translation.json'),
  mr: () => import('./locales/mr/translation.json'),
  ta: () => import('./locales/ta/translation.json'),
  te: () => import('./locales/te/translation.json'),
  gu: () => import('./locales/gu/translation.json'),
  pa: () => import('./locales/pa/translation.json'),
}

function resolveInitial(): string {
  const stored = typeof window !== 'undefined' ? localStorage.getItem('sg-lang') : null
  const browserLang = (navigator.language || 'en').slice(0, 2).toLowerCase()
  if (stored && CODES.includes(stored as never)) return stored
  if (CODES.includes(browserLang as never)) return browserLang
  return 'en'
}

/** English is bundled (fallback); the active locale loads before the app renders. */
export async function initI18n(): Promise<typeof i18n> {
  const initial = resolveInitial()
  let initialMessages: object = en
  if (initial !== 'en') {
    try {
      initialMessages = (await loaders[initial]()).default
    } catch {
      initialMessages = en
    }
  }

  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      [initial]: { translation: initialMessages },
    },
    lng: initial,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })
  if (typeof document !== 'undefined') {
    document.documentElement.lang = initial
  }
  return i18n
}

export function setLanguage(code: string) {
  if (!CODES.includes(code as never)) return
  loaders[code]()
    .then((mod) => {
      i18n.addResourceBundle(code, 'translation', mod.default, true, true)
      i18n.changeLanguage(code)
      localStorage.setItem('sg-lang', code)
      document.documentElement.lang = code
    })
    .catch(() => {
      // Keep the current language if the locale chunk fails to load
    })
}

export default i18n
