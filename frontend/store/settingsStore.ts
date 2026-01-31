import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'ru' | 'en' | 'de' | 'es' | 'pt';
export type Currency = 'RUB' | 'USD' | 'EUR' | 'BTC' | 'USDT';

interface SettingsState {
  language: Language;
  currency: Currency;
  theme: 'dark' | 'light';
  soundEnabled: boolean;
  musicEnabled: boolean;
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  hideBalance: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
  
  // Actions
  setLanguage: (lang: Language) => void;
  setCurrency: (currency: Currency) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  toggleNotifications: () => void;
  toggleEmailNotifications: () => void;
  togglePushNotifications: () => void;
  toggleHideBalance: () => void;
  toggleCompactMode: () => void;
  toggleAnimations: () => void;
  updateSettings: (settings: Partial<SettingsState>) => void;
}

// Currency exchange rates (примерные курсы)
export const exchangeRates: Record<Currency, number> = {
  RUB: 1,
  USD: 0.011,
  EUR: 0.010,
  BTC: 0.00000012,
  USDT: 0.011,
};

export const currencySymbols: Record<Currency, string> = {
  RUB: '₽',
  USD: '$',
  EUR: '€',
  BTC: '₿',
  USDT: '₮',
};

export const currencyNames: Record<Currency, string> = {
  RUB: 'Российский рубль',
  USD: 'US Dollar',
  EUR: 'Euro',
  BTC: 'Bitcoin',
  USDT: 'Tether',
};

export const languageNames: Record<Language, { name: string; flag: string }> = {
  ru: { name: 'Русский', flag: '🇷🇺' },
  en: { name: 'English', flag: '🇬🇧' },
  de: { name: 'Deutsch', flag: '🇩🇪' },
  es: { name: 'Español', flag: '🇪🇸' },
  pt: { name: 'Português', flag: '🇧🇷' },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'ru',
      currency: 'RUB',
      theme: 'dark',
      soundEnabled: true,
      musicEnabled: false,
      notificationsEnabled: true,
      emailNotifications: true,
      pushNotifications: true,
      hideBalance: false,
      compactMode: false,
      animationsEnabled: true,

      setLanguage: (language) => set({ language }),
      setCurrency: (currency) => set({ currency }),
      setTheme: (theme) => set({ theme }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
      toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
      toggleEmailNotifications: () => set((state) => ({ emailNotifications: !state.emailNotifications })),
      togglePushNotifications: () => set((state) => ({ pushNotifications: !state.pushNotifications })),
      toggleHideBalance: () => set((state) => ({ hideBalance: !state.hideBalance })),
      toggleCompactMode: () => set((state) => ({ compactMode: !state.compactMode })),
      toggleAnimations: () => set((state) => ({ animationsEnabled: !state.animationsEnabled })),
      updateSettings: (settings) => set((state) => ({ ...state, ...settings })),
    }),
    {
      name: 'aurex-settings',
    }
  )
);

// Helper function to format currency
export function formatCurrency(amountInRub: number, currency: Currency): string {
  const converted = amountInRub * exchangeRates[currency];
  const symbol = currencySymbols[currency];
  
  if (currency === 'BTC') {
    return `${symbol}${converted.toFixed(8)}`;
  }
  
  return `${symbol}${converted.toLocaleString('ru-RU', { 
    minimumFractionDigits: currency === 'USDT' ? 2 : 0,
    maximumFractionDigits: currency === 'USDT' ? 2 : 0 
  })}`;
}
