// Before approval: upload, "Plan waiting for doctor review", or rejection reason.
// Family members see status only. No plan content is shown here.
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { AlertTriangle, FileText, ImageIcon } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { AppText, Button, Card, Notice, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useSession, useT } from "@/lib/session";
import { colors } from "@/lib/theme";

export type DocStatus = "none" | "queued" | "processing" | "rejected" | "pending_review" | "approved";
type PickedFile = { uri: string; name: string; type: string };

const POLL_MS: Partial<Record<DocStatus, number>> = { queued: 4000, processing: 4000, pending_review: 15000 };

export function UploadStatus({ status, onChange }: { status: DocStatus; onChange: () => void }) {
  const t = useT();
  const { session } = useSession();
  const [rejection, setRejection] = useState<string | null>(null);
  const [uploading, setUploading] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const role = session?.role;
  const canUploadRole = role === "patient" || role === "hub_manager"; // Viewer is read-only

  useEffect(() => {
    if (status !== "rejected") return;
    api("/patient/rejection").then((r) => setRejection(r.message)).catch(() => {});
  }, [status]);

  // Keep checking while the document is being read or waiting for the doctor.
  useEffect(() => {
    const ms = POLL_MS[status];
    if (ms) timer.current = setTimeout(onChange, ms);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [status, onChange]);

  const upload = useCallback(async (file: PickedFile) => {
    setUploading(file);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file as unknown as Blob);
      await api("/patient/upload", { form, timeoutMs: 60000 });
      onChange();
    } catch (e) {
      const err = e as ApiError;
      setError(err.status === 0 ? t("networkError") : typeof err.detail === "object" ? err.message : t("uploadFailed"));
    } finally {
      setUploading(null);
    }
  }, [onChange, t]);

  async function pickPhoto() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible, // HEIC -> JPEG
    });
    if (r.canceled || !r.assets?.[0]) return;
    const png = r.assets[0].mimeType === "image/png";
    upload({ uri: r.assets[0].uri, name: `discharge-photo.${png ? "png" : "jpg"}`, type: png ? "image/png" : "image/jpeg" });
  }

  async function pickFile() {
    const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "text/plain"], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    upload({ uri: a.uri, name: a.name, type: a.mimeType ?? "application/octet-stream" });
  }

  const canUpload = canUploadRole && (status === "none" || status === "rejected");

  return (
    <View className="gap-4">
      {error ? <Notice tone="red">{error}</Notice> : null}

      {status === "rejected" && rejection ? (
        <Notice tone="red" title={t("rejectedTitle")} icon={<AlertTriangle size={20} color={colors.alert} />}>
          {rejection}
        </Notice>
      ) : null}

      {status === "queued" || status === "processing" ? <Card><Spinner label={t("reading")} /></Card> : null}

      {status === "pending_review" ? (
        <Card className="items-center">
          <Spinner label={t("waitingTitle")} />
          <AppText className="text-center text-sm text-muted">{t("waitingHint")}</AppText>
        </Card>
      ) : null}

      {!canUploadRole && status === "none" ? <Notice tone="gray">{t("familyNoUpload")}</Notice> : null}

      {canUpload ? (
        <Card>
          <AppText weight="semibold" className="text-lg">
            {status === "rejected" ? t("uploadAgain") : t(role === "patient" ? "uploadTitle" : "uploadTitleFamily")}
          </AppText>
          <AppText className="mb-4 mt-1 text-sm text-muted">{t("uploadHint")}</AppText>
          {uploading ? (
            <View className="flex-row items-center gap-3 rounded-xl border border-line bg-white p-3">
              <ActivityIndicator color={colors.brand} />
              <View className="flex-1">
                <AppText weight="semibold" numberOfLines={1}>{uploading.name}</AppText>
                <AppText className="text-xs text-muted">{t("uploading")}</AppText>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              <Button title={t("choosePhoto")} onPress={pickPhoto} icon={<ImageIcon size={18} color="#fff" />} />
              <Button title={t("chooseFile")} variant="secondary" onPress={pickFile} icon={<FileText size={18} color={colors.ink} />} />
            </View>
          )}
        </Card>
      ) : null}
    </View>
  );
}
