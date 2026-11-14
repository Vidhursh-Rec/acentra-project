// Doctor Screen 2 — assigned patients, with overdue badge.
import { router, useFocusEffect } from "expo-router";
import { ChevronRight, LogOut } from "lucide-react-native";
import { useCallback, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";

import { AppText, Badge, Card, Notice, Screen, Spinner, Tone } from "@/components/ui";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

type Row = {
  patient_id: string;
  name: string;
  status: "none" | "queued" | "processing" | "rejected" | "pending_review" | "approved";
  discharge_date: string | null;
  needs_review_count: number;
  overdue: boolean;
};

const STATUS: Record<Row["status"], { label: string; tone: Tone }> = {
  none: { label: "No upload", tone: "gray" },
  queued: { label: "Queued", tone: "gray" },
  processing: { label: "Processing", tone: "gray" },
  rejected: { label: "Upload rejected", tone: "gray" },
  pending_review: { label: "Awaiting approval", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
};

export default function DoctorPatients() {
  const { session, signOut } = useSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(await api<Row[]>("/doctor/patients"));
      setError(null);
    } catch {
      setError("Could not load patients. Check the connection.");
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const header = (
    <View className="flex-row items-center justify-between border-b border-line px-5 py-3">
      <View>
        <AppText weight="bold" className="text-xl">My patients</AppText>
        <AppText className="text-sm text-muted">{session?.name}</AppText>
      </View>
      <Pressable onPress={async () => { await signOut(); router.replace("/login"); }} className="flex-row items-center gap-1 p-2">
        <LogOut size={18} color={colors.muted} />
        <AppText className="text-sm text-muted">Log out</AppText>
      </Pressable>
    </View>
  );

  return (
    <Screen header={header}>
      {error ? <View className="p-5"><Notice tone="red">{error}</Notice></View> : null}
      {rows === null && !error ? <Spinner /> : null}
      <FlatList
        data={rows ?? []}
        keyExtractor={(r) => r.patient_id}
        contentContainerClassName="gap-3 p-5"
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={colors.brand}
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
        ListEmptyComponent={rows ? <AppText className="text-center text-muted">No patients assigned.</AppText> : null}
        renderItem={({ item: r }) => {
          const open = r.status === "pending_review" || r.status === "approved";
          const s = STATUS[r.status];
          return (
            <Pressable disabled={!open}
              onPress={() => router.push({ pathname: "/doctor/patient/[id]", params: { id: r.patient_id, name: r.name } })}>
              <Card className={open ? "" : "opacity-60"}>
                <View className="flex-row items-center">
                  <View className="flex-1 gap-1">
                    <AppText weight="semibold" className="text-base">{r.name}</AppText>
                    <AppText className="text-xs text-muted">
                      {r.patient_id}{r.discharge_date ? ` · Discharged ${formatDate(r.discharge_date)}` : ""}
                    </AppText>
                    <View className="mt-1 flex-row flex-wrap gap-2">
                      <Badge label={s.label} tone={s.tone} />
                      {r.overdue ? <Badge label="Overdue" tone="red" /> : null}
                      {r.status === "pending_review" && r.needs_review_count > 0 ? (
                        <Badge label={`${r.needs_review_count} need review`} tone="amber" />
                      ) : null}
                    </View>
                  </View>
                  {open ? <ChevronRight size={20} color={colors.muted} /> : null}
                </View>
              </Card>
            </Pressable>
          );
        }}
      />
    </Screen>
  );
}
