// Patient & family app: Home · Reminders · Map · Settings (active tab = green).
// Also sets up notifications: patient = local dose reminders; family = missed-dose push
// (or in-app alerts when push isn't available on this phone).
import { Redirect, Tabs } from "expo-router";
import { Bell, House, Map, Settings } from "lucide-react-native";
import { useEffect } from "react";
import { AppState } from "react-native";

import { fontFor } from "@/lib/i18n";
import { registerFamilyPush, scheduleDoseReminders, showNewMissed } from "@/lib/notifications";
import { useLang, useSession, useT } from "@/lib/session";
import { colors } from "@/lib/theme";

const FALLBACK_POLL_MS = 60000;

function useNotifications() {
  const { session } = useSession();
  const lang = useLang();
  const role = session?.role;

  useEffect(() => {
    if (!role || role === "doctor") return;
    let poll: ReturnType<typeof setInterval> | undefined;
    let pushOk = false;

    const refresh = () => {
      if (role === "patient") scheduleDoseReminders(lang).catch(() => {});
      else if (!pushOk) showNewMissed().catch(() => {});
    };

    (async () => {
      if (role !== "patient") {
        pushOk = await registerFamilyPush();
        if (!pushOk) poll = setInterval(refresh, FALLBACK_POLL_MS);
      }
      refresh();
    })();

    const sub = AppState.addEventListener("change", (s) => { if (s === "active") refresh(); });
    return () => { sub.remove(); if (poll) clearInterval(poll); };
  }, [role, lang]);
}

export default function PatientTabs() {
  const { session } = useSession();
  const t = useT();
  const lang = useLang();
  useNotifications();
  if (!session || session.role === "doctor") return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fontFor(lang, "semibold"), fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.line },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t("tabHome"), tabBarIcon: ({ color }) => <House size={22} color={color} /> }} />
      <Tabs.Screen name="reminders" options={{ title: t("tabReminders"), tabBarIcon: ({ color }) => <Bell size={22} color={color} /> }} />
      <Tabs.Screen name="map" options={{ title: t("tabMap"), tabBarIcon: ({ color }) => <Map size={22} color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: t("tabSettings"), tabBarIcon: ({ color }) => <Settings size={22} color={color} /> }} />
    </Tabs>
  );
}
