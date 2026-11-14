// Splash — the only dark screen. Nike-style: dark gradient, white elements, a hint of green.
// Pill → nurse crossfade in the centre, faint icons twinkle like stars, then after ~2.5 s:
// logged in → home, otherwise → language picker (language-first).
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Activity, CalendarCheck, HeartPulse, LucideIcon, Pill, Stethoscope, Syringe } from "lucide-react-native";
import { useEffect } from "react";
import { Image, View } from "react-native";
import Animated, {
  Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming,
} from "react-native-reanimated";

import { AppText } from "@/components/ui";
import { fontFor } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

const NURSE = require("../../assets/brand/app/splash.png");
const NURSE_RATIO = 900 / 986;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const SPLASH_MS = 2500;
const STAR_OPACITY = 0.35; // faint: stars, not decoration

// Fixed spots around the centre (percent of screen).
const STARS: { Icon: LucideIcon; left: `${number}%`; top: `${number}%` }[] = [
  { Icon: Pill, left: "14%", top: "18%" },
  { Icon: Stethoscope, left: "78%", top: "14%" },
  { Icon: HeartPulse, left: "84%", top: "46%" },
  { Icon: CalendarCheck, left: "74%", top: "80%" },
  { Icon: Syringe, left: "16%", top: "76%" },
  { Icon: Activity, left: "8%", top: "46%" },
];

function Star({ Icon, left, top, index, reduced }: (typeof STARS)[number] & { index: number; reduced: boolean }) {
  const opacity = useSharedValue(reduced ? STAR_OPACITY * 0.6 : 0);
  useEffect(() => {
    if (reduced) return;
    // fade in 400, hold 400, fade out 400, rest 600 — each star starts 300 ms after the last
    opacity.set(withDelay(index * 300, withRepeat(withSequence(
      withTiming(STAR_OPACITY, { duration: 400, easing: EASE_OUT }),
      withTiming(STAR_OPACITY, { duration: 400 }),
      withTiming(0, { duration: 400, easing: EASE_OUT }),
      withTiming(0, { duration: 600 }),
    ), -1)));
  }, [index, reduced, opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return (
    <Animated.View style={[{ position: "absolute", left, top }, style]}>
      <Icon size={26} color="#ffffff" strokeWidth={1.5} />
    </Animated.View>
  );
}

export default function Splash() {
  const { session } = useSession();
  const reduced = useReducedMotion();
  const intro = useSharedValue(reduced ? 1 : 0); // logo + stage entrance
  const phase = useSharedValue(0); // 0 = pill, 1 = nurse

  useEffect(() => {
    if (!reduced) {
      intro.set(withTiming(1, { duration: 500, easing: EASE_OUT }));
      // pill shows first, then nurse, swapping one after the other
      phase.set(withRepeat(withSequence(
        withDelay(600, withTiming(1, { duration: 400, easing: EASE_OUT })),
        withDelay(1000, withTiming(0, { duration: 400, easing: EASE_OUT })),
      ), -1));
    }
    const timer = setTimeout(() => {
      if (session) router.replace(session.role === "doctor" ? "/doctor" : "/patient");
      else router.replace("/language");
    }, SPLASH_MS);
    return () => clearTimeout(timer);
  }, [reduced, session, intro, phase]);

  const introStyle = useAnimatedStyle(() => ({
    opacity: intro.get(),
    transform: [{ scale: 0.8 + 0.2 * intro.get() }],
  }));
  const pillStyle = useAnimatedStyle(() => ({ opacity: 1 - phase.get() }));
  const nurseStyle = useAnimatedStyle(() => ({ opacity: phase.get() }));

  return (
    <LinearGradient colors={["#000000", colors.ink]} style={{ flex: 1 }}>
      <StatusBar style="light" />
      {STARS.map((s, i) => <Star key={i} {...s} index={i} reduced={reduced} />)}

      <View className="flex-1 items-center justify-center px-8">
        <Animated.View style={introStyle} className="items-center">
          <View style={{ width: 220, height: 220 }} className="items-center justify-center">
            <Animated.View style={[{ position: "absolute" }, pillStyle]}>
              <Pill size={110} color="#ffffff" strokeWidth={1.25} />
            </Animated.View>
            <Animated.View style={[{ position: "absolute" }, nurseStyle]}>
              <Image source={NURSE} accessibilityIgnoresInvertColors resizeMode="contain"
                style={{ height: 220, width: 220 * NURSE_RATIO }} />
            </Animated.View>
          </View>

          <AppText className="mt-6 text-white" style={{ fontFamily: fontFor("en", "bold"), fontSize: 34, letterSpacing: -0.5 }}>
            CareBridge
          </AppText>
          <View className="mt-2 flex-row items-center gap-2">
            <View className="h-1.5 w-1.5 rounded-full bg-brand" />
            <AppText className="text-sm text-white/70" style={{ fontFamily: fontFor("en") }}>
              From Discharge to Recovery
            </AppText>
          </View>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}
