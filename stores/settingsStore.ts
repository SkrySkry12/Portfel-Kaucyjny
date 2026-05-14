import { create } from 'zustand';
import { getSetting, setSetting } from '../services/database';
import i18n from '../services/i18n';
import type { ThemeMode } from '../types';

interface SettingsState {
  theme: ThemeMode;
  language: string;
  currency: string;
  isLoaded: boolean;

  loadSettings: () => void;
  setTheme: (mode: ThemeMode) => void;
  setLanguage: (lang: string) => void;
  setCurrency: (currency: string) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'system',
  language: 'pl',
  currency: 'PLN',
  isLoaded: false,

  loadSettings: () => {
    try {
      const theme = (getSetting('theme') as ThemeMode) ?? 'system';
      const language = getSetting('language') ?? 'pl';
      const currency = getSetting('currency') ?? 'PLN';
      i18n.changeLanguage(language);
      set({ theme, language, currency, isLoaded: true });
    } catch {
      set({ isLoaded: true });
    }
  },

  setTheme: (mode: ThemeMode) => {
    setSetting('theme', mode);
    set({ theme: mode });
  },

  setLanguage: (lang: string) => {
    setSetting('language', lang);
    i18n.changeLanguage(lang);
    set({ language: lang });
  },

  setCurrency: (currency: string) => {
    setSetting('currency', currency);
    set({ currency });
  },
}));
