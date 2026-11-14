import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { api, setAuth } from "./api";
import { cancelDoseReminders } from "./notifications";
import { Lang, StringKey, translate } from "./i18n";

export type Role = "patient" | "hub_manager" | "viewer" | "doctor";

export type Session = {
  token: string;
  role: Role;
  id: string;
  name: string;
  patientId?: string;
};

type Ctx = {
  ready: boolean;
  language: Lang | null; // null until chosen on the splash screen
  setLanguage: (lang: Lang) => Promise<void>;
  session: Session | null;
  signIn: (s: Session) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Ctx | null>(null);
const SESSION_KEY = "carebridge.session";
const LANGUAGE_KEY = "carebridge.language";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [language, setLang] = useState<Lang | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const signOut = useCallback(async () => {
    // Stop this phone getting alerts for a patient it's no longer logged into.
    await api("/auth/push-token", { method: "PATCH", body: { token: null } }).catch(() => {});
    await cancelDoseReminders().catch(() => {});
    setAuth(null);
    setSession(null);
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }, []);

  const signIn = useCallback(
    async (s: Session) => {
      setAuth(s.token, signOut);
      setSession(s);
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(s));
    },
    [signOut],
  );

  const setLanguage = useCallback(async (lang: Lang) => {
    setLang(lang);
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [savedLang, savedSession] = await Promise.all([
          AsyncStorage.getItem(LANGUAGE_KEY),
          SecureStore.getItemAsync(SESSION_KEY),
        ]);
        if (savedLang) setLang(savedLang as Lang);
        if (savedSession) {
          const s: Session = JSON.parse(savedSession);
          setAuth(s.token, signOut);
          setSession(s);
        }
      } finally {
        setReady(true);
      }
    })();
  }, [signOut]);

  const value = useMemo(
    () => ({ ready, language, setLanguage, session, signIn, signOut }),
    [ready, language, setLanguage, session, signIn, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Ctx {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}

/** Language for the current screen. Doctor screens are always English. */
export function useLang(): Lang {
  const { language, session } = useSession();
  if (session?.role === "doctor") return "en";
  return language ?? "en";
}

export function useT() {
  const lang = useLang();
  return useCallback((key: StringKey, vars?: Record<string, string>) => translate(lang, key, vars), [lang]);
}
