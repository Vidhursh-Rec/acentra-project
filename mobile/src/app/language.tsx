// Language picker. Shown after the splash on every launch when not logged in (saved choice
// pre-selected), and reopened from the language button at the top of other screens.
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, ScrollView, View } from "react-native";

import { LanguageTiles } from "@/components/LanguageTiles";
import { AppText, Button, Screen } from "@/components/ui";
import { api } from "@/lib/api";
import { BANNER_LANGUAGE, BANNER_LANGUAGE_RATIO } from "@/lib/brand";
import { fontFor, Lang, translate } from "@/lib/i18n";
import { useSession } from "@/lib/session";

export default function Splash() {
  const { change } = useLocalSearchParams<{ change?: string }>(); // opened from a language button
  const { language, setLanguage, session } = useSession();
  const [choice, setChoice] = useState<Lang>(language ?? "en");

  if (session && (!change || session.role === "doctor")) {
    return <Redirect href={session.role === "doctor" ? "/doctor" : "/patient"} />;
  }

  async function confirm() {
    await setLanguage(choice);
    if (!session) return router.replace("/login");
    try {
      await api("/auth/language", { method: "PATCH", body: { language: choice } }); // server sends messages in it
    } catch {
      // Device language is already saved; the server copy is updated again on next login.
    }
    router.replace("/patient");
  }

  return (
    <Screen>
      <ScrollView contentContainerClassName="flex-grow justify-between px-6 pb-8 pt-10">
        <View className="items-center">
          <Image source={BANNER_LANGUAGE} accessibilityLabel="CareBridge — choose your language" resizeMode="contain"
            style={{ width: 270, height: 270 / BANNER_LANGUAGE_RATIO }} />
          <AppText className="mt-3 text-center text-base text-muted">{translate(choice, "tagline")}</AppText>
        </View>

        <View className="mt-6">
          {/* The banner already says "Choose your Language" in English */}
          {choice !== "en" ? (
            <AppText weight="semibold" className="mb-4 text-center text-sm uppercase tracking-wide text-muted"
              style={{ fontFamily: fontFor(choice, "semibold") }}>
              {translate(choice, "chooseLanguage")}
            </AppText>
          ) : null}

          <LanguageTiles value={choice} onChange={setChoice} />

          <Button
            title={translate(choice, "continue")}
            className="mt-6"
            onPress={confirm}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}
