import { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, TextInputProps, TextProps, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fontFor, Weight } from "@/lib/i18n";
import { useLang } from "@/lib/session";
import { colors } from "@/lib/theme";

// ---------------------------------------------------------------- Text

const HAS_COLOR = /\btext-(ink|muted|white|brand|alert|warn|red|amber|green|gray)/;

export function AppText({ weight = "regular", className = "", style, ...rest }: TextProps & { weight?: Weight; className?: string }) {
  const lang = useLang();
  const color = HAS_COLOR.test(className) ? "" : "text-ink";
  return <Text className={`${color} ${className}`} style={[{ fontFamily: fontFor(lang, weight) }, style]} {...rest} />;
}

/** Section header: small, grey, uppercase. */
export function SectionHeader({ children }: { children: ReactNode }) {
  return (
    <AppText weight="semibold" className="mb-2 mt-4 text-sm uppercase tracking-wide text-muted">
      {children}
    </AppText>
  );
}

// ---------------------------------------------------------------- Layout

export function Screen({ children, header }: { children: ReactNode; header?: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {header}
      {children}
    </View>
  );
}

export function Card({ children, className = "", alert = false }: { children: ReactNode; className?: string; alert?: boolean }) {
  const colors = alert ? "border-red-200 bg-red-50" : "border-line bg-surface"; // alert = missed dose
  return <View className={`rounded-xl border p-4 shadow-sm ${colors} ${className}`}>{children}</View>;
}

// ---------------------------------------------------------------- Buttons

type Variant = "primary" | "secondary" | "green" | "danger";

const BUTTON: Record<Variant, { box: string; text: string; spinner: string }> = {
  primary: { box: "bg-ink", text: "text-white", spinner: "#ffffff" },
  secondary: { box: "border border-line bg-white", text: "text-ink", spinner: colors.ink },
  green: { box: "bg-brand", text: "text-white", spinner: "#ffffff" },
  danger: { box: "border border-red-200 bg-white", text: "text-red-700", spinner: colors.alert },
};

export function Button({
  title, onPress, variant = "primary", loading = false, disabled = false, icon, small = false, className = "",
}: {
  title: string; onPress: () => void; variant?: Variant; loading?: boolean; disabled?: boolean;
  icon?: ReactNode; small?: boolean; className?: string;
}) {
  const s = BUTTON[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      className={`flex-row items-center justify-center gap-2 rounded-full ${small ? "px-4 py-2" : "px-5 py-3.5"} ${s.box} active:opacity-80 ${off ? "opacity-50" : "opacity-100"} ${className}`}
    >
      {loading ? <ActivityIndicator color={s.spinner} /> : icon}
      <AppText weight="semibold" className={`${small ? "text-sm" : "text-base"} ${s.text}`}>
        {title}
      </AppText>
    </Pressable>
  );
}

// ---------------------------------------------------------------- Badges & notices

export type Tone = "gray" | "green" | "amber" | "red";

const BADGE: Record<Tone, string> = {
  gray: "bg-gray-100 text-gray-600",
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  const [bg, fg] = BADGE[tone].split(" ");
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${bg}`}>
      <AppText weight="semibold" className={`text-xs ${fg}`}>
        {label}
      </AppText>
    </View>
  );
}

const NOTICE: Record<Tone, { box: string; title: string; body: string }> = {
  red: { box: "border-red-200 bg-red-50", title: "text-red-700", body: "text-red-600" },
  amber: { box: "border-amber-200 bg-amber-50", title: "text-amber-700", body: "text-amber-600" },
  green: { box: "border-green-200 bg-green-50", title: "text-green-700", body: "text-green-700" },
  gray: { box: "border-line bg-surface", title: "text-ink", body: "text-muted" },
};

export function Notice({ tone, title, children, icon }: { tone: Tone; title?: string; children?: ReactNode; icon?: ReactNode }) {
  const s = NOTICE[tone];
  return (
    <View className={`flex-row gap-3 rounded-xl border p-3 ${s.box}`}>
      {icon}
      <View className="flex-1">
        {title ? (
          <AppText weight="semibold" className={`text-sm ${s.title}`}>
            {title}
          </AppText>
        ) : null}
        {typeof children === "string" ? <AppText className={`text-sm ${s.body}`}>{children}</AppText> : children}
      </View>
    </View>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <View className="items-center gap-3 py-6">
      <ActivityIndicator size="large" color={colors.brand} />
      {label ? <AppText className="text-center text-muted">{label}</AppText> : null}
    </View>
  );
}

// ---------------------------------------------------------------- Inputs

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const lang = useLang();
  return (
    <View className="mb-3">
      <AppText weight="semibold" className="mb-1.5 text-sm text-muted">
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={colors.muted}
        className="rounded-xl border border-line bg-white px-4 py-3 text-base text-ink"
        style={{ fontFamily: fontFor(lang) }}
        {...props}
      />
    </View>
  );
}

/** Pill switch, e.g. Patient | Family | Doctor or Summary | Plan. */
export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row rounded-full border border-line bg-surface p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            // Same class "shape" on every render: NativeWind v4 crashes if shadow/active: classes appear or disappear.
            className={`flex-1 items-center rounded-full border py-2 ${active ? "border-line bg-white" : "border-transparent bg-transparent"}`}
          >
            <AppText weight="semibold" className={`text-sm ${active ? "text-brand" : "text-muted"}`}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
