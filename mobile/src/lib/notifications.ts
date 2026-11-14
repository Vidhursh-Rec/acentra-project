// Family: push for missed doses (fallback: in-app local alerts). Patient: local dose reminders.
// All text comes from fixed templates; drug names and doses are shown exactly as written.
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { api } from "./api";
import { formatTime12, Lang, translate } from "./i18n";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SEEN_KEY = "carebridge.seenMissed";
const DOSE_PREFIX = "dose-";

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  return (await Notifications.requestPermissionsAsync()).status === "granted";
}

/** Family member: send this phone's Expo push token to the server. False = no push on this device. */
export async function registerFamilyPush(): Promise<boolean> {
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!Device.isDevice || !projectId || !(await ensurePermission())) throw new Error("push unavailable");
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await api("/auth/push-token", { method: "PATCH", body: { token } });
    return true;
  } catch {
    await api("/auth/push-token", { method: "PATCH", body: { token: null } }).catch(() => {});
    return false;
  }
}

/** Family fallback (no push): show a local notification for each missed dose not shown yet. */
export async function showNewMissed(): Promise<void> {
  if (!(await ensurePermission())) return;
  const missed = await api<{ id: string; title: string; body: string }[]>("/patient/missed");
  const seen = new Set<string>(JSON.parse((await AsyncStorage.getItem(SEEN_KEY)) ?? "[]"));
  for (const m of missed) {
    if (seen.has(m.id)) continue;
    await Notifications.scheduleNotificationAsync({ content: { title: m.title, body: m.body }, trigger: null });
    seen.add(m.id);
  }
  await AsyncStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200)));
}

type Dose = { id: string; title: string; slot: "morning" | "afternoon" | "night"; time: string; at: string };

/** Patient: replace this phone's dose reminders with the next 48 h of pending doses. */
export async function scheduleDoseReminders(lang: Lang): Promise<void> {
  if (!(await ensurePermission())) return;
  const doses = await api<Dose[]>("/patient/upcoming");
  await cancelDoseReminders();
  for (const d of doses) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${DOSE_PREFIX}${d.id}`,
      content: {
        title: d.title, // e.g. "Dolo 650", never translated
        body: translate(lang, "doseReminder", { slot: translate(lang, d.slot), time: formatTime12(d.time) }),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(d.at) },
    });
  }
}

export async function cancelDoseReminders(): Promise<void> {
  for (const n of await Notifications.getAllScheduledNotificationsAsync()) {
    if (n.identifier.startsWith(DOSE_PREFIX)) await Notifications.cancelScheduledNotificationAsync(n.identifier);
  }
}
