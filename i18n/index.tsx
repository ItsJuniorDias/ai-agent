/**
 * i18n do app — i18next + react-i18next + expo-localization.
 *
 * Substitui o motor caseiro anterior (dicionário de ~30 chaves em um arquivo
 * só, detecção por GPS via expo-location). Agora:
 *
 *  - Dicionário por idioma em `i18n/locales/{en,pt,es,zh,hi,ar,fr}.ts`, com
 *    plurais e interpolação `{{var}}` nativos do i18next.
 *  - Idioma inicial vem do device via `expo-localization` (síncrono, sem rede,
 *    sem permissão) e é sobrescrito por uma preferência salva em AsyncStorage.
 *  - Seletor manual de idioma exposto em Ajustes via `setLanguage()`.
 *  - RTL de verdade para árabe: `I18nManager.forceRTL()` — a virada da direção
 *    nativa só entra no próximo boot, então `setLanguage` devolve `true` quando
 *    um restart é necessário, e a tela avisa o usuário.
 *
 * A API pública (`useTranslation`, `I18nProvider`, `SUPPORTED_LANGUAGES`,
 * `Language`) é a mesma de antes, então as telas que já usavam `t()` seguem
 * funcionando; só as chaves mudaram de nome.
 */

import "intl-pluralrules";

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next, useTranslation as useI18next } from "react-i18next";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { I18nManager } from "react-native";

import ar from "./locales/ar";
import en from "./locales/en";
import es from "./locales/es";
import fr from "./locales/fr";
import hi from "./locales/hi";
import pt from "./locales/pt";
import zh from "./locales/zh";

export const SUPPORTED_LANGUAGES = [
  "en",
  "pt",
  "es",
  "zh",
  "hi",
  "ar",
  "fr",
] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Nome nativo + flag de RTL de cada idioma, para o seletor em Ajustes. */
export const LANGUAGE_META: Record<
  Language,
  { native: string; rtl: boolean }
> = {
  en: { native: "English", rtl: false },
  pt: { native: "Português", rtl: false },
  es: { native: "Español", rtl: false },
  zh: { native: "中文", rtl: false },
  hi: { native: "हिन्दी", rtl: false },
  ar: { native: "العربية", rtl: true },
  fr: { native: "Français", rtl: false },
};

const RTL_LANGUAGES = new Set<Language>(["ar"]);
const LANGUAGE_KEY = "@app_language";
const FALLBACK: Language = "en";

function isSupported(code?: string | null): code is Language {
  return !!code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

/** Idioma do dispositivo — síncrono, sem rede e sem prompt de permissão. */
function detectDeviceLanguage(): Language {
  try {
    const code = Localization.getLocales()[0]?.languageCode?.toLowerCase();
    return isSupported(code) ? code : FALLBACK;
  } catch {
    return FALLBACK;
  }
}

// RTL fica sempre permitido; a virada real acontece via forceRTL + restart.
I18nManager.allowRTL(true);

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
      es: { translation: es },
      zh: { translation: zh },
      hi: { translation: hi },
      ar: { translation: ar },
      fr: { translation: fr },
    },
    lng: detectDeviceLanguage(),
    fallbackLng: FALLBACK,
    compatibilityJSON: "v4",
    interpolation: { escapeValue: false },
    returnNull: false,
  });
}

type I18nContextValue = {
  language: Language;
  isRTL: boolean;
  /**
   * Troca o idioma, persiste a escolha e ajusta a direção do layout.
   * Devolve `true` quando a direção mudou (LTR<->RTL) e um restart do app é
   * necessário para a virada nativa entrar em vigor.
   */
  setLanguage: (language: Language) => Promise<boolean>;
};

const I18nContext = createContext<I18nContextValue>({
  language: FALLBACK,
  isRTL: false,
  setLanguage: async () => false,
});

export function I18nProvider({ children }: React.PropsWithChildren) {
  const [language, setLang] = useState<Language>(i18n.language as Language);

  useEffect(() => {
    let active = true;

    // Preferência salva vence a detecção por device.
    (async () => {
      const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (isSupported(saved) && saved !== i18n.language) {
        await i18n.changeLanguage(saved);
        if (active) setLang(saved);
      }
    })();

    const onChange = (lng: string) => {
      if (active && isSupported(lng)) setLang(lng);
    };
    i18n.on("languageChanged", onChange);

    return () => {
      active = false;
      i18n.off("languageChanged", onChange);
    };
  }, []);

  const setLanguage = async (next: Language): Promise<boolean> => {
    await i18n.changeLanguage(next);
    await AsyncStorage.setItem(LANGUAGE_KEY, next);

    const rtl = RTL_LANGUAGES.has(next);
    if (rtl !== I18nManager.isRTL) {
      I18nManager.forceRTL(rtl);
      return true; // precisa reiniciar para a direção nativa virar
    }
    return false;
  };

  const value = useMemo<I18nContextValue>(
    () => ({ language, isRTL: RTL_LANGUAGES.has(language), setLanguage }),
    [language],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Hook único do app. `t` vem do react-i18next (re-renderiza em
 * `languageChanged`); `language`/`isRTL`/`setLanguage` vêm do contexto.
 */
export function useTranslation() {
  const { t } = useI18next();
  const { language, isRTL, setLanguage } = useContext(I18nContext);
  return { t, language, isRTL, setLanguage };
}

/** BCP-47 para `toLocaleDateString`/`Intl` a partir do idioma ativo. */
export function localeTag(language: Language): string {
  switch (language) {
    case "pt":
      return "pt-BR";
    case "zh":
      return "zh-CN";
    default:
      return language;
  }
}
