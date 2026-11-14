// Screen 4 — Home. Before approval: upload / waiting. After: pinned Warning Signs,
// status banner, and a big calendar of appointments.
import { useFocusEffect } from "expo-router";
import { AlertTriangle, CheckCircle2, Clock, Phone } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { Calendar } from "react-native-calendars";

import { PatientHeader } from "@/components/patient/PatientHeader";
import { DocStatus, UploadStatus } from "@/components/patient/UploadStatus";
import { AppText, Card, Notice, Screen, SectionHeader, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { setCalendarLocale } from "@/lib/calendarLocale";
import { fontFor, formatDateLang, formatTime12, StringKey } from "@/lib/i18n";
import { useLang, useSession, useT } from "@/lib/session";
import { colors } from "@/lib/theme";

type Warning = { id: string; text: string; text_ta: string | null; text_hi: string | null };
type Home = { status: DocStatus; emergency_number: string; warnings: Warning[]; missed_count: number };
type Event = {
  id: string; type: "appointment" | "test" | "referral"; title: string; date: string; time: string;
  text: Record<"en" | "ta" | "hi", string | null>;
};
type Cal = { events: Event[]; doses_per_day: Record<string, number> };

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function HomeTab() {
  const t = useT();
  const lang = useLang();
  const { session } = useSession();
  const [home, setHome] = useState<Home | null>(null);
  const [cal, setCal] = useState<Cal>({ events: [], doses_per_day: {} });
  const [selected, setSelected] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const h = await api<Home>("/patient/home");
      setHome(h);
      if (h.status === "approved") setCal(await api<Cal>("/patient/calendar"));
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) setError(t("networkError"));
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  setCalendarLocale(lang);
  const marked = useMemo(() => {
    const m: Record<string, any> = {};
    for (const e of cal.events) m[e.date] = { marked: true, dotColor: colors.brand };
    m[selected] = { ...(m[selected] ?? {}), selected: true, selectedColor: colors.brand };
    return m;
  }, [cal.events, selected]);

  const dayEvents = cal.events.filter((e) => e.date === selected);
  const dayDoses = cal.doses_per_day[selected] ?? 0;
  const approved = home?.status === "approved";

  return (
    <Screen header={<PatientHeader title={t("hello", { name: session?.name ?? "" })} />}>
      <ScrollView
        contentContainerClassName="gap-4 p-5"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.brand}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {error ? <Notice tone="red">{error}</Notice> : null}
        {!home ? <Spinner /> : null}

        {/* Pinned Warning Signs: always first once the plan is approved. Original text + translation. */}
        {approved && home.warnings.length ? (
          <Notice tone="red" title={t("warningSigns")} icon={<AlertTriangle size={20} color={colors.alert} />}>
            <View className="mt-1 gap-1.5">
              {home.warnings.map((w) => {
                const translated = lang === "ta" ? w.text_ta : lang === "hi" ? w.text_hi : null;
                return (
                  <View key={w.id}>
                    <AppText className="text-sm text-red-700" style={{ fontFamily: fontFor("en") }}>• {w.text}</AppText>
                    {translated ? <AppText className="ml-3 text-sm text-red-600">{translated}</AppText> : null}
                  </View>
                );
              })}
              <Pressable onPress={() => Linking.openURL(`tel:${home.emergency_number}`)}
                className="mt-2 flex-row items-center gap-2 self-start rounded-full bg-red-600 px-4 py-2">
                <Phone size={16} color="#ffffff" />
                <AppText weight="bold" className="text-white">{t("emergency", { number: home.emergency_number })}</AppText>
              </Pressable>
            </View>
          </Notice>
        ) : null}

        {/* Status banner */}
        {home && approved && home.missed_count > 0 ? (
          <Notice tone="red" icon={<AlertTriangle size={18} color={colors.alert} />}>{t("statusMissed", { n: String(home.missed_count) })}</Notice>
        ) : home && approved ? (
          <Notice tone="green" icon={<CheckCircle2 size={18} color={colors.brand} />}>{t("approvedTitle")}</Notice>
        ) : home && (home.status === "pending_review" || home.status === "processing" || home.status === "queued") ? (
          <Notice tone="amber" icon={<Clock size={18} color={colors.warn} />}>{t("statusWaiting")}</Notice>
        ) : null}

        {home && !approved ? <UploadStatus status={home.status} onChange={load} /> : null}

        {approved ? (
          <>
            <View className="overflow-hidden rounded-xl border border-line">
              <Calendar
                key={lang}
                current={selected}
                markedDates={marked}
                onDayPress={(d) => setSelected(d.dateString)}
                theme={{
                  todayTextColor: colors.brand,
                  arrowColor: colors.ink,
                  selectedDayBackgroundColor: colors.brand,
                  textDayFontFamily: fontFor("en"),
                  textMonthFontFamily: fontFor(lang, "semibold"),
                  textDayHeaderFontFamily: fontFor(lang, "semibold"),
                  textMonthFontSize: 17,
                }}
              />
            </View>

            <View>
              <SectionHeader>{formatDateLang(lang, selected)}</SectionHeader>
              {dayEvents.length === 0 && dayDoses === 0 ? <AppText className="text-muted">{t("nothingDue")}</AppText> : null}
              {dayEvents.map((e) => (
                <Card key={e.id} className="mb-3">
                  <AppText weight="semibold" className="text-xs uppercase tracking-wide text-brand">{t(e.type as StringKey)}</AppText>
                  <AppText weight="semibold" className="mt-1 text-base">{e.text?.[lang] ?? e.text?.en ?? e.title}</AppText>
                  <AppText className="mt-0.5 text-sm text-muted">{formatTime12(e.time)}</AppText>
                </Card>
              ))}
              {dayDoses > 0 ? <AppText className="text-sm text-muted">💊 {t("dosesDue", { n: String(dayDoses) })}</AppText> : null}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
