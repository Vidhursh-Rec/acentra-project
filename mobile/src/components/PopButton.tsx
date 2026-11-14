// Round icon button that "pops": presses in subtly (0.96, per emil-design-eng), springs back with a little bounce on
// release. Optional `active` pulse (e.g. while read-aloud is speaking). UI-thread only.
import * as Haptics from "expo-haptics";
import { ReactNode, useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  cancelAnimation, Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue,
  withRepeat, withSequence, withSpring, withTiming,
} from "react-native-reanimated";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export function PopButton({ onPress, label, className = "", active = false, children }: {
  onPress: () => void; label: string; className?: string; active?: boolean; children: ReactNode;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (active && !reduced) {
      pulse.set(withRepeat(withSequence(
        withTiming(1.12, { duration: 450, easing: EASE_OUT }),
        withTiming(1, { duration: 450, easing: EASE_OUT }),
      ), -1));
    } else {
      cancelAnimation(pulse);
      pulse.set(withTiming(1, { duration: 150 }));
    }
  }, [active, reduced, pulse]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() * pulse.get() }] }));

  return (
    <Pressable
      onPressIn={() => {
        Haptics.selectionAsync().catch(() => {});
        scale.set(withTiming(0.96, { duration: 100, easing: EASE_OUT, reduceMotion: ReduceMotion.System }));
      }}
      onPressOut={() => {
        // Pop back past 1 and settle: the bounce is the "pop".
        scale.set(withSpring(1, { duration: 350, dampingRatio: 0.45, reduceMotion: ReduceMotion.System }));
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      pressRetentionOffset={12}
    >
      <Animated.View style={style} className={`h-11 w-11 items-center justify-center rounded-full ${className}`}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
