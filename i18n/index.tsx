import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export const SUPPORTED_LANGUAGES = ["en", "zh", "es", "hi", "ar", "bn", "pt"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

type Dictionary = Record<string, string>;
export type TranslationKey = keyof typeof strings.en;
type I18nContextValue = {
  language: Language;
  isRTL: boolean;
  /** Saves an explicit user preference. This always takes precedence over the device locale. */
  changeLanguage: (language: Language) => Promise<void>;
  /** Translates a UI key. English is returned safely for missing translations. */
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const LANGUAGE_KEY = "@app_language";
const FALLBACK_LANGUAGE: Language = "en";

/** Display names are deliberately native to make the picker usable before translation. */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English", pt: "Português", es: "Español", hi: "हिन्दी",
  ar: "العربية", bn: "বাংলা", zh: "中文",
};

const strings: Record<Language, Dictionary> = {
  en: { askAI: "Ask AI", history: "History", studio: "Studio", files: "Files", settings: "Settings", agent: "Agent", onDuty: "ON DUTY", clear: "Clear", promptHint: "What should I do for you?", newChat: "New Chat", missingKeyTitle: "Missing OpenRouter key", missingKey: "Set EXPO_PUBLIC_OPENROUTER_API_KEY in your .env and restart the bundler.", imageStudio: "Image Studio", generating: "Generating…", tryAgain: "Try again", archive: "ARCHIVE", nothingSaved: "Nothing saved yet.", insights: "Insights", document: "Document", analyzeNow: "Analyze now", preferences: "PREFERENCES", personalAssistant: "PERSONAL ASSISTANT", agentModel: "AGENT MODEL", agentBehavior: "AGENT BEHAVIOR", proactiveAssistant: "Proactive assistant", enabledWatching: "Enabled · watching your services", notificationsBlocked: "Enabled · notifications blocked", disabledConfigure: "Disabled · tap to configure", askBeforeActing: "Ask before acting", approveWrites: "Approve every write to an external service", locationPermission: "Allow location to choose your language", locationMessage: "Your country is used only to show the app in a suitable language. Your precise location is never saved or shared.", locationUnavailable: "Using your device language. You can enable location later to improve the match." },
  pt: { askAI: "Perguntar à IA", history: "Histórico", studio: "Estúdio", files: "Arquivos", settings: "Ajustes", agent: "Agente", onDuty: "EM SERVIÇO", clear: "Limpar", promptHint: "O que você quer que eu faça?", newChat: "Nova conversa", missingKeyTitle: "Chave OpenRouter ausente", missingKey: "Defina EXPO_PUBLIC_OPENROUTER_API_KEY no .env e reinicie o bundler.", imageStudio: "Estúdio de imagens", generating: "Gerando…", tryAgain: "Tentar novamente", archive: "ARQUIVO", nothingSaved: "Nada salvo ainda.", insights: "Insights", document: "Documento", analyzeNow: "Analisar agora", preferences: "PREFERÊNCIAS", personalAssistant: "ASSISTENTE PESSOAL", agentModel: "MODELO DO AGENTE", agentBehavior: "COMPORTAMENTO DO AGENTE", proactiveAssistant: "Assistente proativo", enabledWatching: "Ligado · vigiando seus serviços", notificationsBlocked: "Ligado · notificações bloqueadas", disabledConfigure: "Desligado · toque para configurar", askBeforeActing: "Perguntar antes de agir", approveWrites: "Aprove cada alteração em um serviço externo", locationPermission: "Permita a localização para escolher seu idioma", locationMessage: "Seu país é usado somente para mostrar o app no idioma adequado. A localização precisa nunca é salva nem compartilhada.", locationUnavailable: "Usando o idioma do dispositivo. Você pode ativar a localização depois para melhorar a escolha." },
  es: { askAI: "Preguntar a IA", history: "Historial", studio: "Estudio", files: "Archivos", settings: "Ajustes", agent: "Agente", onDuty: "ACTIVO", clear: "Limpiar", promptHint: "¿Qué quieres que haga?", newChat: "Nuevo chat", missingKeyTitle: "Falta la clave de OpenRouter", missingKey: "Configura EXPO_PUBLIC_OPENROUTER_API_KEY en .env y reinicia el bundler.", imageStudio: "Estudio de imágenes", generating: "Generando…", tryAgain: "Intentar de nuevo", archive: "ARCHIVO", nothingSaved: "Aún no hay nada guardado.", insights: "Información", document: "Documento", analyzeNow: "Analizar ahora", preferences: "PREFERENCIAS", personalAssistant: "ASISTENTE PERSONAL", agentModel: "MODELO DEL AGENTE", agentBehavior: "COMPORTAMIENTO DEL AGENTE", proactiveAssistant: "Asistente proactivo", enabledWatching: "Activo · vigilando tus servicios", notificationsBlocked: "Activo · notificaciones bloqueadas", disabledConfigure: "Desactivado · toca para configurar", askBeforeActing: "Preguntar antes de actuar", approveWrites: "Aprueba cada cambio en un servicio externo", locationPermission: "Permite la ubicación para elegir tu idioma", locationMessage: "Tu país solo se usa para mostrar la app en un idioma adecuado. Tu ubicación precisa nunca se guarda ni se comparte.", locationUnavailable: "Usando el idioma del dispositivo. Puedes activar la ubicación después para mejorar la selección." },
  hi: { askAI: "AI से पूछें", history: "इतिहास", studio: "स्टूडियो", files: "फ़ाइलें", settings: "सेटिंग्स", agent: "एजेंट", onDuty: "सक्रिय", clear: "साफ़ करें", promptHint: "मैं आपके लिए क्या करूँ?", newChat: "नई चैट", missingKeyTitle: "OpenRouter कुंजी नहीं मिली", missingKey: "अपने .env में EXPO_PUBLIC_OPENROUTER_API_KEY सेट करें और बंडलर रीस्टार्ट करें।", imageStudio: "इमेज स्टूडियो", generating: "बन रहा है…", tryAgain: "फिर से कोशिश करें", archive: "संग्रह", nothingSaved: "अभी कुछ भी सहेजा नहीं गया है।", insights: "जानकारी", document: "दस्तावेज़", analyzeNow: "अभी विश्लेषण करें", preferences: "प्राथमिकताएँ", personalAssistant: "निजी सहायक", agentModel: "एजेंट मॉडल", agentBehavior: "एजेंट व्यवहार", proactiveAssistant: "सक्रिय सहायक", enabledWatching: "सक्रिय · आपकी सेवाओं पर नज़र", notificationsBlocked: "सक्रिय · सूचनाएँ अवरुद्ध", disabledConfigure: "बंद · सेट करने के लिए टैप करें", askBeforeActing: "कार्रवाई से पहले पूछें", approveWrites: "बाहरी सेवा में हर बदलाव को स्वीकृत करें", locationPermission: "अपनी भाषा चुनने के लिए स्थान की अनुमति दें", locationMessage: "आपके देश का उपयोग केवल ऐप की भाषा चुनने के लिए होता है। सटीक स्थान कभी सहेजा या साझा नहीं होता।", locationUnavailable: "डिवाइस की भाषा इस्तेमाल हो रही है। बेहतर चयन के लिए बाद में स्थान सक्रिय कर सकते हैं।" },
  ar: { askAI: "اسأل الذكاء الاصطناعي", history: "السجل", studio: "الاستوديو", files: "الملفات", settings: "الإعدادات", agent: "الوكيل", onDuty: "متاح", clear: "مسح", promptHint: "ماذا تريد أن أفعل؟", newChat: "محادثة جديدة", missingKeyTitle: "مفتاح OpenRouter مفقود", missingKey: "عيّن EXPO_PUBLIC_OPENROUTER_API_KEY في .env وأعد تشغيل الحزمة.", imageStudio: "استوديو الصور", generating: "جارٍ الإنشاء…", tryAgain: "حاول مجددًا", archive: "الأرشيف", nothingSaved: "لا يوجد شيء محفوظ بعد.", insights: "الرؤى", document: "مستند", analyzeNow: "حلّل الآن", preferences: "التفضيلات", personalAssistant: "المساعد الشخصي", agentModel: "نموذج الوكيل", agentBehavior: "سلوك الوكيل", proactiveAssistant: "مساعد استباقي", enabledWatching: "مفعّل · يراقب خدماتك", notificationsBlocked: "مفعّل · الإشعارات محظورة", disabledConfigure: "متوقف · اضغط للإعداد", askBeforeActing: "اسأل قبل التنفيذ", approveWrites: "وافق على كل تعديل في خدمة خارجية", locationPermission: "اسمح بالموقع لاختيار لغتك", locationMessage: "يُستخدم بلدك فقط لعرض التطبيق بلغة مناسبة. لا يتم حفظ أو مشاركة موقعك الدقيق.", locationUnavailable: "يُستخدم الآن لغة جهازك. يمكنك تفعيل الموقع لاحقًا لتحسين الاختيار." },
  bn: { askAI: "AI-কে জিজ্ঞাসা করুন", history: "ইতিহাস", studio: "স্টুডিও", files: "ফাইল", settings: "সেটিংস", agent: "এজেন্ট", onDuty: "সক্রিয়", clear: "মুছুন", promptHint: "আমি আপনার জন্য কী করতে পারি?", newChat: "নতুন চ্যাট", missingKeyTitle: "OpenRouter কী পাওয়া যায়নি", missingKey: ".env-এ EXPO_PUBLIC_OPENROUTER_API_KEY সেট করে bundler পুনরায় চালু করুন।", imageStudio: "ইমেজ স্টুডিও", generating: "তৈরি হচ্ছে…", tryAgain: "আবার চেষ্টা করুন", archive: "সংরক্ষণাগার", nothingSaved: "এখনও কিছু সংরক্ষণ করা হয়নি।", insights: "তথ্য", document: "নথি", analyzeNow: "এখনই বিশ্লেষণ করুন", preferences: "পছন্দসমূহ", personalAssistant: "ব্যক্তিগত সহকারী", agentModel: "এজেন্ট মডেল", agentBehavior: "এজেন্টের আচরণ", proactiveAssistant: "সক্রিয় সহকারী", enabledWatching: "চালু · আপনার সেবাগুলো দেখছে", notificationsBlocked: "চালু · বিজ্ঞপ্তি বন্ধ", disabledConfigure: "বন্ধ · সেট করতে ট্যাপ করুন", askBeforeActing: "কাজের আগে জিজ্ঞাসা করুন", approveWrites: "বাহ্যিক সেবার প্রতিটি পরিবর্তন অনুমোদন করুন", locationPermission: "ভাষা বাছতে অবস্থানের অনুমতি দিন", locationMessage: "শুধু উপযুক্ত ভাষা বাছতে আপনার দেশ ব্যবহৃত হয়। সুনির্দিষ্ট অবস্থান কখনও রাখা বা শেয়ার করা হয় না।", locationUnavailable: "ডিভাইসের ভাষা ব্যবহার হচ্ছে। ভালো মিলের জন্য পরে অবস্থান চালু করতে পারেন।" },
  zh: { askAI: "询问 AI", history: "历史记录", studio: "工作室", files: "文件", settings: "设置", agent: "智能助手", onDuty: "在线", clear: "清除", promptHint: "我能为您做什么？", newChat: "新对话", missingKeyTitle: "缺少 OpenRouter 密钥", missingKey: "请在 .env 中设置 EXPO_PUBLIC_OPENROUTER_API_KEY，然后重启打包器。", imageStudio: "图像工作室", generating: "正在生成…", tryAgain: "重试", archive: "归档", nothingSaved: "尚未保存任何内容。", insights: "洞察", document: "文档", analyzeNow: "立即分析", preferences: "偏好设置", personalAssistant: "个人助手", agentModel: "助手模型", agentBehavior: "助手行为", proactiveAssistant: "主动助手", enabledWatching: "已开启 · 正在关注您的服务", notificationsBlocked: "已开启 · 通知被阻止", disabledConfigure: "已关闭 · 点击配置", askBeforeActing: "执行前询问", approveWrites: "批准对外部服务的每次写入", locationPermission: "允许使用位置以选择语言", locationMessage: "您的国家/地区仅用于以合适的语言显示应用。精确位置绝不会被保存或共享。", locationUnavailable: "正在使用设备语言。您可以稍后启用位置以改善匹配。" },
};

function deviceLanguage(): Language {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0].toLowerCase();
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(locale) ? (locale as Language) : FALLBACK_LANGUAGE;
}

function interpolate(value: string, values?: Record<string, string | number>) {
  return value.replace(/\{(\w+)\}/g, (_, key) => String(values?.[key] ?? `{${key}}`));
}

const I18nContext = createContext<I18nContextValue>({
  language: FALLBACK_LANGUAGE,
  isRTL: false,
  changeLanguage: async () => undefined,
  t: (key) => strings.en[key],
});

export function I18nProvider({ children }: React.PropsWithChildren) {
  const [language, setLanguage] = useState<Language>(deviceLanguage);

  useEffect(() => {
    let active = true;
    const resolveLanguage = async () => {
      const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (saved && (SUPPORTED_LANGUAGES as readonly string[]).includes(saved)) {
        if (active) setLanguage(saved as Language);
        return;
      }
      // Do not request location to infer a language. Country and language are
      // different concepts, and an explicit choice is more accurate and private.
    };
    resolveLanguage();
    return () => { active = false; };
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    isRTL: language === "ar",
    changeLanguage: async (nextLanguage) => {
      await AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage);
      setLanguage(nextLanguage);
    },
    t: (key, values) => interpolate(strings[language][key] ?? strings.en[key], values),
  }), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() { return useContext(I18nContext); }
