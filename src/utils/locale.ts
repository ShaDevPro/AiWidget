export function detectSystemLanguage(): string {
  const SUPPORTED = ['fr', 'en', 'ar'];
  const LS_KEY = 'aiwidget_ui_lang';

  const stored = localStorage.getItem(LS_KEY);
  if (stored && SUPPORTED.includes(stored)) return stored;

  const nav = navigator.language || (navigator as unknown as { userLanguage?: string }).userLanguage || 'fr';
  const code = nav.split('-')[0].toLowerCase();

  if (code === 'ar') return 'ar';
  if (code === 'en') return 'en';
  if (code === 'fr') return 'fr';

  return 'fr';
}
