import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import pl from '../locales/pl.json';
import en from '../locales/en.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import es from '../locales/es.json';
import uk from '../locales/uk.json';
import cs from '../locales/cs.json';

i18n.use(initReactI18next).init({
  resources: {
    pl: { translation: pl },
    en: { translation: en },
    de: { translation: de },
    fr: { translation: fr },
    es: { translation: es },
    uk: { translation: uk },
    cs: { translation: cs },
  },
  lng: 'pl',
  fallbackLng: 'pl',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;
