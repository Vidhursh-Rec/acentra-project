// Screen 6 — Map. Specialty chips pre-selected from the approved plan, nearest providers first,
// a provider named in the summary pinned on top. Suggestions only: disclaimer always shown.
import * as Location from "expo-location";
import { useFocusEffect } from "expo-router";
import { Building2, FlaskConical, MapPin, Navigation, Phone, Pin, Stethoscope, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import Animated, { ReduceMotion, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PatientHeader } from "@/components/patient/PatientHeader";
import { AppText, Button, Notice, Screen } from "@/components/ui";
import { api } from "@/lib/api";
import { fontFor, StringKey } from "@/lib/i18n";
import { useLang, useT } from "@/lib/session";
import { SPECIALTY_NAMES, specialtyName } from "@/lib/specialties";
import { colors } from "@/lib/theme";

type Provider = {
  id: number; name: string; type: "individual_doctor" | "hospital" | "lab"; specialty: string;
  address: string; phone: string; lat: number; lng: number; distance_km: number | null;
};
type Ctx = { specialties: string[]; named: Provider[]; home: { lat: number | null; lng: number | null } };
type Point = { lat: number; lng: number };

const CHENNAI: Point = { lat: 13.0418, lng: 80.2341 };
const TYPE_ICON = { individual_doctor: Stethoscope, hospital: Building2, lab: FlaskConical };

function mapsUrl(p: Provider): string {
  const label = encodeURIComponent(p.name);
  return Platform.select({
    ios: `http://maps.apple.com/?daddr=${p.lat},${p.lng}&q=${label}`,
    default: `geo:0,0?q=${p.lat},${p.lng}(${label})`,
  });
}

export default function MapTab() {
  const t = useT();
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [origin, setOrigin] = useState<Point | null>(null);
  const [usingGps, setUsingGps] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [open, setOpen] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Context + location (GPS first, saved address if permission is denied).
  useFocusEffect(useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await api<Ctx>("/patient/map");
        if (cancelled) return;
        setCtx(c);
        setSelected((s) => (s.length ? s : c.specialties));
        let point: Point | null = null;
        try {
          if ((await Location.requestForegroundPermissionsAsync()).granted) {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUsingGps(true);
          }
        } catch {
          // fall back below
        }
        if (!point) point = c.home.lat != null && c.home.lng != null ? { lat: c.home.lat, lng: c.home.lng } : CHENNAI;
        if (!cancelled) setOrigin(point);
      } catch {
        if (!cancelled) setError(t("networkError"));
      }
    })();
    return () => { cancelled = true; };
  }, [t]));

  // Providers for the selected specialties, nearest first.
  useEffect(() => {
    if (!origin) return;
    const q = selected.map((s) => `&specialty=${encodeURIComponent(s)}`).join("");
    api<Provider[]>(`/providers?lat=${origin.lat}&lng=${origin.lng}&limit=30${q}`)
      .then((list) => { setProviders(list); setError(null); })
      .catch(() => setError(t("networkError")));
  }, [origin, selected, t]);

  // Named-in-summary first (never overridden), then the rest without duplicates.
  const pins = useMemo(() => {
    const named = ctx?.named ?? [];
    const ids = new Set(named.map((p) => p.id));
    return [...named, ...providers.filter((p) => !ids.has(p.id))];
  }, [ctx, providers]);
  const namedIds = useMemo(() => new Set((ctx?.named ?? []).map((p) => p.id)), [ctx]);

  // Frame the pins.
  useEffect(() => {
    if (!origin || !pins.length) return;
    mapRef.current?.fitToCoordinates(
      [{ latitude: origin.lat, longitude: origin.lng }, ...pins.slice(0, 15).map((p) => ({ latitude: p.lat, longitude: p.lng }))],
      { edgePadding: { top: 140, right: 50, bottom: 160, left: 50 }, animated: true },
    );
  }, [origin, pins]);

  // Plan specialties first, then the rest.
  const chips = useMemo(() => {
    const preset = ctx?.specialties ?? [];
    return [...preset, ...Object.keys(SPECIALTY_NAMES).filter((s) => !preset.includes(s))];
  }, [ctx]);

  function toggle(s: string) {
    setOpen(null);
    setSelected((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function focus(p: Provider) {
    setOpen(p);
    mapRef.current?.animateToRegion({ latitude: p.lat, longitude: p.lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 400);
  }

  return (
    <Screen header={<PatientHeader title={t("tabMap")} />}>
      <View className="flex-1">
        <MapView
          ref={mapRef}
          style={{ flex: 1 }}
          showsUserLocation={usingGps}
          initialRegion={{ latitude: CHENNAI.lat, longitude: CHENNAI.lng, latitudeDelta: 0.2, longitudeDelta: 0.2 }}
          onPress={() => setOpen(null)}
        >
          {pins.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              pinColor={namedIds.has(p.id) ? colors.brandDark : colors.brand}
              onPress={(e) => { e.stopPropagation(); focus(p); }}
            />
          ))}
          {!usingGps && origin ? (
            <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} pinColor={colors.ink} />
          ) : null}
        </MapView>

        {/* Filter chips (pre-selected from the plan) */}
        <View className="absolute left-0 right-0 top-0 pt-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
            <Pressable
              onPress={() => { setOpen(null); setSelected([]); }}
              className={`rounded-full border px-4 py-2 ${selected.length === 0 ? "border-brand bg-brand" : "border-line bg-white"}`}
            >
              <AppText weight="semibold" className={`text-sm ${selected.length === 0 ? "text-white" : "text-ink"}`}>{t("all")}</AppText>
            </Pressable>
            {chips.map((s) => {
              const on = selected.includes(s);
              return (
                <Pressable key={s} onPress={() => toggle(s)}
                  className={`rounded-full border px-4 py-2 ${on ? "border-brand bg-brand" : "border-line bg-white"}`}>
                  <AppText weight="semibold" className={`text-sm ${on ? "text-white" : "text-ink"}`}>{specialtyName(s, lang)}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          {ctx?.named.length ? (
            <Pressable onPress={() => focus(ctx.named[0])} className="mx-4 mt-2 flex-row items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2">
              <Pin size={16} color={colors.brandDark} />
              <AppText className="flex-1 text-sm text-green-700" numberOfLines={1}>
                {t("namedInSummary")}: {ctx.named.map((n) => n.name).join(", ")}
              </AppText>
            </Pressable>
          ) : null}
          {error ? <View className="mx-4 mt-2"><Notice tone="red">{error}</Notice></View> : null}
          {origin && pins.length === 0 && !error ? <View className="mx-4 mt-2"><Notice tone="gray">{t("noProviders")}</Notice></View> : null}
        </View>

        {/* Bottom sheet for the tapped pin; disclaimer always visible otherwise */}
        {open ? (
          <Animated.View
            entering={SlideInDown.duration(300).reduceMotion(ReduceMotion.System)}
            exiting={SlideOutDown.duration(200).reduceMotion(ReduceMotion.System)}
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl border border-line bg-white px-5 pt-4 shadow-sm"
            style={{ paddingBottom: insets.bottom > 0 ? 16 : 20 }}
          >
            <View className="flex-row items-start gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-green-100">
                {(() => { const Icon = TYPE_ICON[open.type] ?? MapPin; return <Icon size={22} color={colors.brand} />; })()}
              </View>
              <View className="flex-1">
                <AppText className="text-lg" style={{ fontFamily: fontFor("en", "semibold") }}>{open.name}</AppText>
                <AppText className="text-sm text-muted">
                  {t(open.type as StringKey)} · {specialtyName(open.specialty, lang)}
                  {open.distance_km != null ? ` · ${t("kmAway", { km: String(open.distance_km) })}` : ""}
                </AppText>
                {namedIds.has(open.id) ? <AppText className="mt-1 text-xs text-green-700">📌 {t("namedInSummary")}</AppText> : null}
              </View>
              <Pressable onPress={() => setOpen(null)} hitSlop={10} className="p-1"><X size={20} color={colors.muted} /></Pressable>
            </View>
            <AppText className="mt-3 text-sm" style={{ fontFamily: fontFor("en") }}>{open.address}</AppText>
            <View className="mt-4 flex-row gap-3">
              <Button className="flex-1" variant="secondary" title={t("call")} icon={<Phone size={16} color={colors.ink} />}
                onPress={() => Linking.openURL(`tel:${open.phone}`)} />
              <Button className="flex-1" title={t("openInMaps")} icon={<Navigation size={16} color="#fff" />}
                onPress={() => Linking.openURL(mapsUrl(open))} />
            </View>
            <AppText className="mt-3 text-center text-xs text-muted">{t("disclaimer")}</AppText>
          </Animated.View>
        ) : (
          <View className="absolute bottom-3 left-4 right-4 rounded-full bg-white/95 px-4 py-2">
            <AppText className="text-center text-xs text-muted">{t("disclaimer")}</AppText>
          </View>
        )}
      </View>
    </Screen>
  );
}
