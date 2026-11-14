// Screen 5 — Daily reminders: Morning / Afternoon / Night. Drug names & doses never translated.
// Each card: optional pill photo (Hub Manager adds via +), read-aloud, toggle, status.
import { useFocusEffect } from "expo-router";
import { Eye, Pencil, Plus, Volume2, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Image, Modal, Pressable, RefreshControl, ScrollView, Switch, View } from "react-native";

import { PatientHeader } from "@/components/patient/PatientHeader";
import { PillSheet } from "@/components/patient/PillSheet";
import { PopButton } from "@/components/PopButton";
import { AppText, Badge, Card, Notice, Screen, SectionHeader, Spinner, Tone } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { fontFor, formatDateLang, formatTime12, StringKey } from "@/lib/i18n";
import { scheduleDoseReminders } from "@/lib/notifications";
import { appearanceText, Pill } from "@/lib/pill";
import { useLang, useSession, useT } from "@/lib/session";
import { SpeakableTask, speakTask, stopSpeaking, taskTitle } from "@/lib/speech";
import { colors } from "@/lib/theme";

type Status = "pending" | "completed" | "taken_late" | "missed";
type Task = SpeakableTask & {
  id: string; item_id: string; status: Status;
  marked_by: string | null; marked_by_role: "patient" | "hub_manager" | null;
};
type Today = { date: string; can_mark: boolean; can_add_photo: boolean; tasks: Task[] };

const SLOTS = [
  { key: "morning", emoji: "🌅" },
  { key: "afternoon", emoji: "☀️" },
  { key: "night", emoji: "🌙" },
] as const;

const TONE: Record<Status, Tone> = { pending: "gray", completed: "green", taken_late: "amber", missed: "red" };

export default function RemindersTab() {
  const t = useT();
  const lang = useLang();
  const { session } = useSession();
  const [today, setToday] = useState<Today | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null); // pill sheet open for this med
  const [viewing, setViewing] = useState<string | null>(null); // full-size photo url
  const [speaking, setSpeaking] = useState<string | null>(null); // task id being read aloud
  const [voiceNote, setVoiceNote] = useState<string | null>(null);

  async function readAloud(task: Task) {
    if (speaking === task.id) return stopSpeaking(); // tap again to stop
    setSpeaking(task.id);
    setVoiceNote(null);
    const used = await speakTask(task, lang, () => setSpeaking((id) => (id === task.id ? null : id)));
    if (used !== lang) setVoiceNote(t("voiceMissing"));
  }

  const load = useCallback(async () => {
    try {
      setToday(await api<Today>("/patient/reminders/today"));
      setError(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) setError(t("networkError"));
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function toggle(task: Task, done: boolean) {
    setSaving(task.id);
    setError(null);
    try {
      const updated = await api<Task>(`/task/${task.id}/done`, { method: "PATCH", body: { done } });
      setToday((d) => d && { ...d, tasks: d.tasks.map((x) => (x.id === task.id ? updated : x)) });
      if (session?.role === "patient") scheduleDoseReminders(lang).catch(() => {}); // no alarm for a dose already marked
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? t("onlyToday") : t("networkError"));
    } finally {
      setSaving(null);
    }
  }

  function pillSaved(itemId: string, pill: Pill) {
    // The same medicine appears once per dose time; update every card for it.
    setToday((d) => d && { ...d, tasks: d.tasks.map((x) => (x.item_id === itemId ? { ...x, pill } : x)) });
    setEditing(null);
  }

  return (
    <Screen header={<PatientHeader title={t("tabReminders")} />}>
      <ScrollView
        contentContainerClassName="p-5 pb-10"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.brand}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {!today ? <Spinner /> : null}
        {today ? (
          <View className="flex-row items-center justify-between">
            <AppText weight="semibold" className="text-base">{formatDateLang(lang, today.date)}</AppText>
            {!today.can_mark ? (
              <View className="flex-row items-center gap-1">
                <Eye size={14} color={colors.muted} />
                <AppText className="text-xs text-muted">{t("viewOnly")}</AppText>
              </View>
            ) : null}
          </View>
        ) : null}
        {error ? <View className="mt-3"><Notice tone="red">{error}</Notice></View> : null}
        {voiceNote ? <View className="mt-3"><Notice tone="amber">{voiceNote}</Notice></View> : null}
        {today && today.tasks.length === 0 ? <View className="mt-4"><Notice tone="gray">{t("noReminders")}</Notice></View> : null}

        {today && SLOTS.map(({ key, emoji }) => {
          const tasks = today.tasks.filter((x) => x.slot === key);
          if (!tasks.length) return null;
          return (
            <View key={key}>
              <SectionHeader>{`${t(key)} ${emoji}`}</SectionHeader>
              {tasks.map((task) => {
                const done = task.status === "completed" || task.status === "taken_late";
                const isMed = task.type === "med";
                const food = task.food?.[lang] ?? task.food?.en;
                const looks = appearanceText(lang, task.pill);
                return (
                  <Card key={task.id} className="mb-3" alert={task.status === "missed"}>
                    <View className="flex-row items-center gap-3">
                      {task.pill?.photo_url ? (
                        <Pressable onPress={() => setViewing(task.pill!.photo_url)} accessibilityLabel={looks || task.title}>
                          <Image source={{ uri: task.pill.photo_url }} style={{ width: 64, height: 64, borderRadius: 12 }} />
                        </Pressable>
                      ) : null}
                      <View className="flex-1">
                        {!isMed ? (
                          <AppText weight="semibold" className="text-xs uppercase tracking-wide text-brand">{t(task.type as StringKey)}</AppText>
                        ) : null}
                        {isMed ? (
                          // Drug name + dose exactly as written, never translated
                          <AppText className="text-base" style={{ fontFamily: fontFor("en", "semibold") }}>{task.title}</AppText>
                        ) : (
                          <AppText weight="semibold" className="text-base">{taskTitle(task, lang)}</AppText>
                        )}
                        <AppText className="mt-0.5 text-sm text-muted">
                          {formatTime12(task.time)}{food ? ` · ${food}` : ""}
                        </AppText>
                        {looks ? <AppText className="mt-0.5 text-sm text-ink">{looks}</AppText> : null}
                      </View>
                      {today.can_mark ? (
                        <Switch
                          value={done}
                          disabled={saving === task.id}
                          onValueChange={(v) => toggle(task, v)}
                          trackColor={{ true: colors.brand, false: colors.line }}
                          ios_backgroundColor={colors.line}
                          accessibilityLabel={task.title}
                        />
                      ) : null}
                    </View>

                    <View className="mt-3 flex-row items-center gap-2">
                      <View className="flex-1 flex-row flex-wrap items-center gap-2">
                        <Badge label={t(task.status)} tone={TONE[task.status]} />
                        {task.marked_by ? (
                          <AppText className="text-xs text-muted">
                            {t("markedBy", {
                              name: task.marked_by,
                              role: t(task.marked_by_role === "hub_manager" ? "hubManager" : "patient"),
                            })}
                          </AppText>
                        ) : null}
                      </View>
                      {isMed && today.can_add_photo ? (
                        <PopButton onPress={() => setEditing(task)} label={t(task.pill ? "changePillPhoto" : "addPillPhoto")}
                          className="border border-line bg-white">
                          {task.pill ? <Pencil size={18} color={colors.ink} /> : <Plus size={22} color={colors.ink} />}
                        </PopButton>
                      ) : null}
                      <PopButton onPress={() => readAloud(task)} label={t("readAloud")} active={speaking === task.id}
                        className={speaking === task.id ? "bg-brand" : "bg-green-100"}>
                        <Volume2 size={20} color={speaking === task.id ? "#ffffff" : colors.brand} />
                      </PopButton>
                    </View>
                    {task.pill?.added_by ? (
                      <AppText className="mt-1 text-xs text-muted">{t("photoBy", { name: task.pill.added_by })}</AppText>
                    ) : null}
                  </Card>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {editing ? (
        <PillSheet itemId={editing.item_id} drug={editing.title} pill={editing.pill}
          onClose={() => setEditing(null)} onSaved={(p) => pillSaved(editing.item_id, p)} />
      ) : null}

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable onPress={() => setViewing(null)} className="flex-1 items-center justify-center bg-black/90 p-4">
          {viewing ? <Image source={{ uri: viewing }} style={{ width: "100%", height: "80%" }} resizeMode="contain" /> : null}
          <View className="absolute right-6 top-16 rounded-full bg-white/20 p-2"><X size={24} color="#ffffff" /></View>
        </Pressable>
      </Modal>
    </Screen>
  );
}
