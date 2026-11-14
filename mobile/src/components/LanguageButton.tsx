// Top-of-screen pill that reopens the language picker (patient & family screens, login).
import { router } from "expo-router";
import { Globe } from "lucide-react-native";
import { Pressable } from "react-native";

import { AppText } from "@/components/ui";
import { fontFor, LANGUAGES } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

export function LanguageButton() {
  const { language } = useSession();
  const lang = language ?? "en";
  return (
    <Pressable
      onPress={() => router.replace({ pathname: "/language", params: { change: "1" } })}
      accessibilityLabel="Change language"
      className="flex-row items-center gap-1 rounded-full border border-line bg-white px-3 py-2"
    >
      <Globe size={16} color={colors.muted} />
      <AppText className="text-sm text-muted" style={{ fontFamily: fontFor(lang, "semibold") }}>
        {LANGUAGES.find((l) => l.code === lang)?.label}
      </AppText>
    </Pressable>
  );
}
