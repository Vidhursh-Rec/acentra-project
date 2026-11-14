// Screen 2 — Login. Patient: ID + name. Family: join with patient ID + role. Doctor: ID + password.
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";

import { LanguageButton } from "@/components/LanguageButton";
import { AppText, Button, Field, Notice, Screen, Segmented } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { BANNER_LOGIN, BANNER_LOGIN_RATIO } from "@/lib/brand";
import { Role, useSession, useT } from "@/lib/session";

type Mode = "patient" | "family" | "doctor";

export default function Login() {
  const t = useT();
  const { language, signIn } = useSession();
  const [mode, setMode] = useState<Mode>("patient");
  const [patientId, setPatientId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [familyRole, setFamilyRole] = useState<"hub_manager" | "viewer">("hub_manager");
  const [doctorId, setDoctorId] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const missing =
      mode === "patient" ? !patientId.trim() || !name.trim()
      : mode === "family" ? !patientId.trim() || !name.trim() || !phone.trim()
      : !doctorId.trim() || !password;
    if (missing) return setError(t("fillAll"));

    setBusy(true);
    try {
      if (mode === "family") {
        const r = await api("/auth/family/join", {
          body: { patient_id: patientId.trim(), name: name.trim(), phone: phone.trim(), role: familyRole, language: language ?? "en" },
        });
        await signIn({ token: r.token, role: r.role as Role, id: r.id, name: r.name, patientId: r.patient_id });
        if (r.role !== r.requested_role) Alert.alert(t("viewer"), t("joinedAsViewer"));
        router.replace("/patient");
      } else {
        const r = await api("/auth/login", {
          body: mode === "patient"
            ? { role: "patient", id: patientId.trim(), name: name.trim(), language: language ?? "en" }
            : { role: "doctor", id: doctorId.trim(), password },
        });
        await signIn({ token: r.token, role: r.role as Role, id: r.id, name: r.name, patientId: r.patient_id });
        router.replace(mode === "doctor" ? "/doctor" : "/patient");
      }
    } catch (e) {
      setError(e instanceof ApiError && e.status === 0 ? t("networkError") : t("loginFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerClassName="px-6 pb-10 pt-3" keyboardShouldPersistTaps="handled">
          <View className="flex-row justify-end">
            <LanguageButton />
          </View>
          <View className="mb-5 items-center">
            <Image source={BANNER_LOGIN} accessibilityLabel="CareBridge" resizeMode="contain"
              style={{ width: 230, height: 230 / BANNER_LOGIN_RATIO }} />
          </View>

          <Segmented
            value={mode}
            onChange={(m) => { setMode(m); setError(null); }}
            options={[
              { value: "patient", label: t("patient") },
              { value: "family", label: t("family") },
              { value: "doctor", label: t("doctor") },
            ]}
          />

          <View className="mt-6">
            {mode !== "doctor" ? (
              <>
                <Field label={t("patientId")} value={patientId} onChangeText={setPatientId} autoCapitalize="characters" placeholder="P1001" />
                <Field
                  label={mode === "patient" ? t("patientName") : t("yourName")}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </>
            ) : (
              <>
                <Field label={t("doctorId")} value={doctorId} onChangeText={setDoctorId} autoCapitalize="characters" placeholder="D101" />
                <Field label={t("password")} value={password} onChangeText={setPassword} secureTextEntry />
              </>
            )}

            {mode === "family" ? (
              <>
                <Field label={t("phone")} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <AppText weight="semibold" className="mb-1.5 text-sm text-muted">
                  {t("yourRole")}
                </AppText>
                <View className="mb-3 flex-row gap-3">
                  {(["hub_manager", "viewer"] as const).map((r) => {
                    const active = familyRole === r;
                    return (
                      <Pressable
                        key={r}
                        onPress={() => setFamilyRole(r)}
                        className={`flex-1 rounded-xl border p-3 ${active ? "border-brand bg-green-50" : "border-line bg-surface"}`}
                      >
                        <AppText weight="semibold" className={active ? "text-brand" : "text-ink"}>
                          {t(r === "hub_manager" ? "hubManager" : "viewer")}
                        </AppText>
                        <AppText className="mt-1 text-xs text-muted">
                          {t(r === "hub_manager" ? "hubManagerHint" : "viewerHint")}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            {error ? <Notice tone="red">{error}</Notice> : null}
            <Button title={t("login")} onPress={submit} loading={busy} className="mt-4" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
