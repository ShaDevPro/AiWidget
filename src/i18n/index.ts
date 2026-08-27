import i18next from 'i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';

export const SUPPORTED_LANGUAGES = ['en', 'fr', 'ar'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const RTL_LANGUAGES: Language[] = ['ar'];

export function isRTL(lang: string = currentLanguage()): boolean {
  return RTL_LANGUAGES.includes(lang as Language);
}

export async function initI18n(defaultLang: string = 'en'): Promise<void> {
  const lang = SUPPORTED_LANGUAGES.includes(defaultLang as Language) ? defaultLang : 'en';
  await i18next.init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
      ar: { translation: ar },
    },
    lng: lang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
  applyLanguageDirection(lang);
}

export function changeLanguage(lang: string): void {
  const safeLang = SUPPORTED_LANGUAGES.includes(lang as Language) ? lang : 'en';
  i18next.changeLanguage(safeLang);
  applyLanguageDirection(safeLang);
}

function applyLanguageDirection(lang: string): void {
  const html = document.documentElement;
  if (isRTL(lang)) {
    html.setAttribute('dir', 'rtl');
    html.setAttribute('lang', lang);
  } else {
    html.setAttribute('dir', 'ltr');
    html.setAttribute('lang', lang);
  }
  document.body.classList.toggle('rtl', isRTL(lang));
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, options as Record<string, unknown> & { defaultValue?: string });
}

export function currentLanguage(): string {
  return i18next.language || 'en';
}
