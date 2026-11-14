// Top bar on every patient / family tab: title, language button, log out.
import { router } from "expo-router";
import { LogOut } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { LanguageButton } from "@/components/LanguageButton";
import { AppText } from "@/components/ui";
import { useSession, useT } from "@/lib/session";
import { colors } from "@/lib/theme";

export function PatientHeader({ title }: { title: string }) {
  const t = useT();
  const { signOut } = useSession();
  return (
    <View className="flex-row items-center gap-2 border-b border-line px-5 py-3">
      <AppText weight="bold" className="flex-1 text-xl" numberOfLines={1}>
        {title}
      </AppText>
      <LanguageButton />
      <Pressable
        onPress={async () => { await signOut(); router.replace("/login"); }}
        accessibilityLabel={t("logout")}
        className="p-2"
      >
        <LogOut size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}
