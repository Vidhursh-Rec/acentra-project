// Screen 7 — Settings: change language only.
import { CheckCircle2 } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { LanguageTiles } from "@/components/LanguageTiles";
import { PatientHeader } from "@/components/patient/PatientHeader";
import { Notice, Screen, SectionHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { Lang } from "@/lib/i18n";
import { useSession, useT } from "@/lib/session";
import { colors } from "@/lib/theme";

export default function SettingsTab() {
  const t = useT();
  const { language, setLanguage } = useSession();
  const [saved, setSaved] = useState(false);

  async function choose(lang: Lang) {
    setSaved(false);
    await setLanguage(lang);
    try {
      await api("/auth/language", { method: "PATCH", body: { language: lang } });
    } catch {
      // Saved on the device; the server copy is refreshed on next login.
    }
    setSaved(true);
  }

  return (
    <Screen header={<PatientHeader title={t("tabSettings")} />}>
      <ScrollView contentContainerClassName="p-5">
        <SectionHeader>{t("language")}</SectionHeader>
        <LanguageTiles value={language ?? "en"} onChange={choose} />
        {saved ? (
          <View className="mt-4">
            <Notice tone="green" icon={<CheckCircle2 size={18} color={colors.brand} />}>{t("saved")}</Notice>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
