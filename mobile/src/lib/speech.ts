// Read-aloud with the phone's own voice. Drug names and doses are read exactly as written.
import { setAudioModeAsync } from "expo-audio";
import * as Speech from "expo-speech";

import { formatDateLang, formatTime12, Lang, translate } from "./i18n";
import { appearanceText, Pill } from "./pill";

const VOICE: Record<Lang, string> = { en: "en-IN", ta: "ta-IN", hi: "hi-IN" };

export type SpeakableTask = {
  type: "med" | "appointment" | "test" | "referral";
  title: string;
  text: Record<Lang, string | null>;
  food: Record<Lang, string | null> | null;
  date: string;
  time: string;
  slot: "morning" | "afternoon" | "night";
  pill: Pill | null;
};

/** Localised title for appointments/tests; medicines always keep their written name. */
export function taskTitle(task: SpeakableTask, lang: Lang): string {
  if (task.type === "med") return task.title;
  return task.text?.[lang] ?? task.text?.en ?? task.title;
}

export function speechText(task: SpeakableTask, lang: Lang): string {
  if (task.type !== "med") return [taskTitle(task, lang), formatDateLang(lang, task.date)].join(". ");
  const food = task.food?.[lang] ?? task.food?.en;
  return [
    task.title, // e.g. "Dolo 650", as written
    appearanceText(lang, task.pill), // e.g. "White round pill, blue strip"
    `${translate(lang, task.slot)} ${formatTime12(task.time)}`,
    food,
  ].filter(Boolean).join(". ");
}

let audioReady: Promise<void> | null = null;
let voiceLangs: Promise<Set<string>> | null = null;

/** iPhone: let speech play even when the ring/silent switch is on silent. */
function prepareAudio(): Promise<void> {
  audioReady ??= setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  return audioReady;
}

/** Languages this phone has a voice for (e.g. "ta"); some phones have no Tamil voice installed. */
function installedVoices(): Promise<Set<string>> {
  voiceLangs ??= Speech.getAvailableVoicesAsync()
    .then((vs) => new Set(vs.map((v) => v.language.slice(0, 2).toLowerCase())))
    .catch(() => new Set<string>());
  return voiceLangs;
}

/** Speaks the task. Returns the language actually used ("en" if the phone lacks that voice). */
export async function speakTask(task: SpeakableTask, lang: Lang, onEnd: () => void): Promise<Lang> {
  await prepareAudio();
  if (await Speech.isSpeakingAsync()) await Speech.stop(); // stopping when idle can drop the next utterance on iOS
  const voices = await installedVoices();
  const used: Lang = voices.size === 0 || voices.has(lang) ? lang : "en";
  Speech.speak(speechText(task, used), {
    language: VOICE[used],
    rate: 0.85,
    onDone: onEnd,
    onStopped: onEnd,
    onError: onEnd,
  });
  return used;
}

export function stopSpeaking(): void {
  Speech.stop().catch(() => {});
}
