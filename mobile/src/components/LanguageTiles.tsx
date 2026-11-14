// Three language tiles with the brand illustrations (splash and Settings).
import { Check } from "lucide-react-native";
import { Image, Pressable, View } from "react-native";

import { AppText } from "@/components/ui";
import { fontFor, Lang, LANGUAGES } from "@/lib/i18n";

const ICONS: Record<Lang, number> = {
  en: require("../../assets/brand/lang-en.png"),
  ta: require("../../assets/brand/lang-ta.png"),
  hi: require("../../assets/brand/lang-hi.png"),
};
const NAMES: Record<Lang, string> = { en: "English", ta: "Tamil", hi: "Hindi" };

export function LanguageTiles({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
  return (
    <View className="flex-row gap-3">
      {LANGUAGES.map((l) => {
        const active = l.code === value;
        return (
          <Pressable
            key={l.code}
            onPress={() => onChange(l.code)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            className={`flex-1 items-center rounded-2xl border-2 px-2 pb-3 pt-4 ${active ? "border-brand bg-green-50" : "border-line bg-white"}`}
          >
            <View className={`absolute right-2 top-2 h-5 w-5 items-center justify-center rounded-full ${active ? "bg-brand" : "bg-transparent"}`}>
              {active ? <Check size={13} color="#ffffff" strokeWidth={3} /> : null}
            </View>
            <Image source={ICONS[l.code]} style={{ width: 76, height: 76 }} resizeMode="contain" />
            <AppText className={`mt-2 text-lg ${active ? "text-brand" : "text-ink"}`} style={{ fontFamily: fontFor(l.code, "semibold") }}>
              {l.label}
            </AppText>
            <AppText className="text-xs text-muted">{NAMES[l.code]}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
