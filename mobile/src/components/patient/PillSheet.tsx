// Hub Manager: photo of the pill with its strip + colour/shape chips for one medicine.
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImageIcon } from "lucide-react-native";
import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Button, Notice, SectionHeader } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { fontFor } from "@/lib/i18n";
import { Pill, PILL_COLORS, SHAPES, STRIP_COLORS } from "@/lib/pill";
import { useLang, useT } from "@/lib/session";
import { colors } from "@/lib/theme";

type Picked = { uri: string; name: string; type: string };
const PHOTO_WIDTH = 1280;

function Chips({ options, value, onChange }: {
  options: { key: string; label: string; swatch?: string }[]; value: string | null; onChange: (k: string | null) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(active ? null : o.key)}
            className={`flex-row items-center gap-1.5 rounded-full border-2 px-3 py-1.5 ${active ? "border-brand bg-green-50" : "border-line bg-white"}`}
          >
            {o.swatch ? <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: o.swatch, borderWidth: 1, borderColor: colors.line }} /> : null}
            <AppText className={`text-sm ${active ? "text-brand" : "text-ink"}`}>{o.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PillSheet({ itemId, drug, pill, onClose, onSaved }: {
  itemId: string; drug: string; pill: Pill | null; onClose: () => void; onSaved: (p: Pill) => void;
}) {
  const t = useT();
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const [photo, setPhoto] = useState<Picked | null>(null);
  const [pillColor, setPillColor] = useState<string | null>(pill?.pill_color ?? null);
  const [shape, setShape] = useState<string | null>(pill?.pill_shape ?? null);
  const [strip, setStrip] = useState<string | null>(pill?.strip_color ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function applyPicked(r: ImagePicker.ImagePickerResult) {
    if (r.canceled || !r.assets?.[0]) return;
    try {
      // A full iPhone camera photo is 3–5 MB; a pill photo only needs ~1280 px (~200 KB).
      const context = ImageManipulator.manipulate(r.assets[0].uri);
      context.resize({ width: PHOTO_WIDTH, height: null });
      const small = await (await context.renderAsync()).saveAsync({ compress: 0.6, format: SaveFormat.JPEG });
      setPhoto({ uri: small.uri, name: "pill.jpg", type: "image/jpeg" });
    } catch (e) {
      console.warn("pill photo resize failed, uploading original", e);
      const png = r.assets[0].mimeType === "image/png";
      setPhoto({ uri: r.assets[0].uri, name: png ? "pill.png" : "pill.jpg", type: png ? "image/png" : "image/jpeg" });
    }
  }

  async function takePhoto() {
    if (!(await ImagePicker.requestCameraPermissionsAsync()).granted) return setError(t("cameraDenied"));
    applyPicked(await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 }));
  }

  async function fromGallery() {
    applyPicked(await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
    }));
  }

  async function save() {
    if (!photo && !pill?.photo_url && !pillColor && !strip) return setError(t("addPhotoOrColour"));
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      if (photo) form.append("file", photo as unknown as Blob);
      if (pillColor) form.append("pill_color", pillColor);
      if (shape) form.append("pill_shape", shape);
      if (strip) form.append("strip_color", strip);
      onSaved(await api<Pill>(`/patient/med/${itemId}/pill`, { method: "PUT", form, timeoutMs: 90000 }));
    } catch (e) {
      console.warn("pill save failed", e instanceof ApiError ? `${e.status} ${e.message}` : e);
      setError(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  const preview = photo?.uri ?? pill?.photo_url ?? null;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <ScrollView className="flex-1 bg-white" contentContainerClassName="p-5" contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <AppText weight="bold" className="text-xl">{pill ? t("changePillPhoto") : t("addPillPhoto")}</AppText>
        <AppText className="mt-1 text-base" style={{ fontFamily: fontFor("en", "semibold") }}>{drug}</AppText>
        <AppText className="mt-2 text-sm text-muted">{t("pillPhotoHint")}</AppText>

        <View className="mt-4 items-center justify-center overflow-hidden rounded-xl border border-line bg-surface" style={{ height: 220 }}>
          {preview ? (
            <Image source={{ uri: preview }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <Camera size={40} color={colors.muted} />
          )}
        </View>
        <View className="mt-3 flex-row gap-3">
          <Button small className="flex-1" title={t("takePhoto")} onPress={takePhoto} icon={<Camera size={16} color="#fff" />} />
          <Button small className="flex-1" variant="secondary" title={t("fromGallery")} onPress={fromGallery} icon={<ImageIcon size={16} color={colors.ink} />} />
        </View>

        <SectionHeader>{t("pillColour")}</SectionHeader>
        <Chips value={pillColor} onChange={setPillColor}
          options={Object.entries(PILL_COLORS).map(([key, c]) => ({ key, label: c.name[lang], swatch: c.swatch }))} />
        <SectionHeader>{t("pillShape")}</SectionHeader>
        <Chips value={shape} onChange={setShape}
          options={Object.entries(SHAPES).map(([key, n]) => ({ key, label: n[lang] }))} />
        <SectionHeader>{t("stripColour")}</SectionHeader>
        <Chips value={strip} onChange={setStrip}
          options={Object.entries(STRIP_COLORS).map(([key, c]) => ({ key, label: c.name[lang], swatch: c.swatch }))} />

        {error ? <View className="mt-4"><Notice tone="red">{error}</Notice></View> : null}
        <View className="mt-6 gap-3">
          <Button title={t("save")} onPress={save} loading={busy} />
          <Button title={t("cancel")} variant="secondary" onPress={onClose} />
        </View>
      </ScrollView>
    </Modal>
  );
}
