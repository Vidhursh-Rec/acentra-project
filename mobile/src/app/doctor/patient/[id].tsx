// Doctor Screen 3 — Plan approval. Phone: Summary | Plan switch. Wide screen: side by side.
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ArrowLeft, CheckCircle2, ExternalLink, Info } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Badge, Button, Card, Field, Notice, Screen, SectionHeader, Segmented, Spinner } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import {
  EDIT_FIELDS, formatDate, itemDetails, itemTitle, PlanItem, toFieldValue, toFormText, TYPE_LABELS,
} from "@/lib/format";
import { colors } from "@/lib/theme";

type Plan = {
  doc_id: string;
  status: "pending_review" | "approved";
  discharge_date: string | null;
  approved_at: string | null;
  needs_review_count: number;
  items: PlanItem[];
};
type Discharge = { file_type: string; file_url: string; raw_text: string | null };

const ORDER: PlanItem["type"][] = ["med", "appointment", "test", "referral", "care", "warning"];
const TIMED = /\b(after|in|within) \d+ (day|week|month)s?\b/i;

export default function PlanApproval() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 768;

  const [view, setView] = useState<"summary" | "plan">("plan");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [discharge, setDischarge] = useState<Discharge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [approvedMsg, setApprovedMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, d] = await Promise.all([
        api<Plan>(`/doctor/patient/${id}/plan`),
        api<Discharge>(`/doctor/patient/${id}/discharge`),
      ]);
      setPlan(p);
      setDischarge(d);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError && e.status === 404 ? "No plan for this patient." : "Could not load the plan.");
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function onItemSaved(updated: PlanItem) {
    setPlan((p) => {
      if (!p) return p;
      const items = p.items.map((i) => (i.id === updated.id ? updated : i));
      return { ...p, items, needs_review_count: items.filter((i) => i.needs_review && !i.removed).length };
    });
  }

  function approve() {
    Alert.alert("Approve plan?", "Reminders and calendar entries will be created for the patient.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          setApproving(true);
          try {
            const r = await api(`/doctor/patient/${id}/approve`, { method: "POST" });
            setApprovedMsg(`Plan approved. ${r.tasks_created} reminders created.`);
            await load();
          } catch (e) {
            setError(e instanceof ApiError ? e.message : "Could not approve.");
          } finally {
            setApproving(false);
          }
        },
      },
    ]);
  }

  async function openOriginal() {
    try {
      const d = await api<Discharge>(`/doctor/patient/${id}/discharge`); // fresh signed link
      await WebBrowser.openBrowserAsync(d.file_url);
    } catch {
      setError("Could not open the original file.");
    }
  }

  const header = (
    <View className="flex-row items-center gap-3 border-b border-line px-4 py-3">
      <Pressable onPress={() => router.back()} className="p-1">
        <ArrowLeft size={22} color={colors.ink} />
      </Pressable>
      <View className="flex-1">
        <AppText weight="bold" className="text-lg" numberOfLines={1}>{name ?? id}</AppText>
        <AppText className="text-xs text-muted">
          {id}{plan?.discharge_date ? ` · Discharged ${formatDate(plan.discharge_date)}` : ""}
        </AppText>
      </View>
      {plan ? <Badge label={plan.status === "approved" ? "Approved" : "Awaiting approval"} tone={plan.status === "approved" ? "green" : "amber"} /> : null}
    </View>
  );

  if (!plan || !discharge) {
    return <Screen header={header}>{error ? <View className="p-5"><Notice tone="red">{error}</Notice></View> : <Spinner />}</Screen>;
  }

  const summaryPanel = (
    <ScrollView className={wide ? "flex-1 border-r border-line bg-surface" : "flex-1 bg-surface"} contentContainerClassName="p-5">
      <View className="mb-3 flex-row items-center justify-between">
        <AppText weight="semibold" className="text-sm uppercase tracking-wide text-muted">Discharge summary</AppText>
        <Button small variant="secondary" title="Open original" onPress={openOriginal} icon={<ExternalLink size={14} color={colors.ink} />} />
      </View>
      <AppText className="text-sm leading-6">{discharge.raw_text ?? "(no text)"}</AppText>
    </ScrollView>
  );

  const approved = plan.status === "approved";
  const planPanel = (
    <ScrollView className="flex-1" contentContainerClassName="p-5 pb-32">
      {error ? <View className="mb-3"><Notice tone="red">{error}</Notice></View> : null}
      {approvedMsg ? <View className="mb-3"><Notice tone="green" icon={<CheckCircle2 size={18} color={colors.brand} />}>{approvedMsg}</Notice></View> : null}
      {approved && plan.approved_at ? (
        <Notice tone="gray">{`Approved on ${formatDate(plan.approved_at)}. Editing an item replaces its future reminders.`}</Notice>
      ) : plan.needs_review_count > 0 ? (
        <Notice tone="amber" title="Needs Review" icon={<Info size={18} color={colors.warn} />}>
          {`${plan.needs_review_count} item(s) must be edited, removed or marked reviewed before approval.`}
        </Notice>
      ) : null}

      {ORDER.map((type) => {
        const items = plan.items.filter((i) => i.type === type);
        if (!items.length) return null;
        return (
          <View key={type}>
            <SectionHeader>{TYPE_LABELS[type]}</SectionHeader>
            {items.map((i) => <ItemCard key={i.id} item={i} patientId={id} onSaved={onItemSaved} />)}
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <Screen header={header}>
      {!wide ? (
        <View className="px-5 pb-2 pt-3">
          <Segmented value={view} onChange={setView} options={[{ value: "summary", label: "Summary" }, { value: "plan", label: "Plan" }]} />
        </View>
      ) : null}

      {wide ? <View className="flex-1 flex-row">{summaryPanel}{planPanel}</View> : view === "summary" ? summaryPanel : planPanel}

      {!approved ? (
        <View className="absolute bottom-0 left-0 right-0 border-t border-line bg-white px-5 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          <Button
            title={plan.needs_review_count > 0 ? `Resolve ${plan.needs_review_count} item(s) to approve` : "Approve Plan"}
            disabled={plan.needs_review_count > 0}
            loading={approving}
            onPress={approve}
          />
        </View>
      ) : null}
    </Screen>
  );
}

// ------------------------------------------------------------------ one plan item

function ItemCard({ item, patientId, onSaved }: { item: PlanItem; patientId: string; onSaved: (i: PlanItem) => void }) {
  const [mode, setMode] = useState<"view" | "edit" | "convert">("view");
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: object) {
    setBusy(true);
    setError(null);
    try {
      onSaved(await api<PlanItem>(`/doctor/patient/${patientId}/plan/${item.id}`, { method: "PATCH", body }));
      setMode("view");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit() {
    const f: Record<string, string> = {};
    for (const { key } of EDIT_FIELDS[item.type]) f[key] = toFormText(key, item.fields[key]);
    setForm(f);
    setMode("edit");
  }

  function saveEdit() {
    const changed: Record<string, unknown> = {};
    for (const { key } of EDIT_FIELDS[item.type]) {
      if (form[key] !== toFormText(key, item.fields[key])) changed[key] = toFieldValue(key, form[key]);
    }
    // No change = the doctor confirmed it as written.
    patch(Object.keys(changed).length ? { fields: changed } : { reviewed: true });
  }

  const flagged = item.needs_review && !item.removed;
  const details = itemDetails(item);

  return (
    <View className="mb-3">
      {flagged ? (
        <View className="mb-1.5">
          <Notice tone="amber" title="Needs Review" icon={<Info size={18} color={colors.warn} />}>
            {item.review_reason ?? "Please verify."}
          </Notice>
        </View>
      ) : null}

      <Card className={item.removed ? "opacity-60" : ""}>
        <View className="flex-row items-start justify-between gap-2">
          <AppText weight="semibold" className={`flex-1 text-base ${item.removed ? "line-through text-muted" : ""}`}>
            {itemTitle(item)}
          </AppText>
          {item.removed ? <Badge label="Removed" tone="gray" /> : null}
        </View>
        {details.length ? <AppText className="mt-1 text-sm text-muted">{details.join(" · ")}</AppText> : null}
        <AppText className="mt-2 text-xs italic text-muted">“{item.source_quote}”</AppText>

        {mode === "edit" ? (
          <View className="mt-4">
            {EDIT_FIELDS[item.type].map(({ key, label, hint }) => (
              <Field
                key={key}
                label={label}
                placeholder={hint}
                value={form[key]}
                onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                autoCapitalize="none"
                keyboardType={key === "duration_days" ? "number-pad" : "default"}
                multiline={key === "text"}
              />
            ))}
          </View>
        ) : null}

        {mode === "convert" ? (
          <View className="mt-4">
            <AppText className="mb-2 text-sm text-muted">Move this line to the calendar as an appointment.</AppText>
            <Field label="Date" placeholder="YYYY-MM-DD" value={form.resolved_date ?? ""}
              onChangeText={(v) => setForm({ resolved_date: v })} autoCapitalize="none" />
          </View>
        ) : null}

        {error ? <View className="mt-3"><Notice tone="red">{error}</Notice></View> : null}

        <View className="mt-3 flex-row flex-wrap gap-2">
          {mode !== "view" ? (
            <>
              <Button small title="Save" loading={busy}
                onPress={() => mode === "edit" ? saveEdit() : patch({ type: "appointment", fields: { resolved_date: form.resolved_date || null } })} />
              <Button small variant="secondary" title="Cancel" onPress={() => { setMode("view"); setError(null); }} />
            </>
          ) : item.removed ? (
            <Button small variant="secondary" title="Restore" loading={busy} onPress={() => patch({ removed: false })} />
          ) : (
            <>
              <Button small variant="secondary" title="Edit" onPress={startEdit} />
              {flagged ? <Button small variant="green" title="Mark reviewed" loading={busy} onPress={() => patch({ reviewed: true })} /> : null}
              {item.type === "care" && TIMED.test(item.source_quote) ? (
                <Button small variant="secondary" title="Make appointment" onPress={() => { setForm({ resolved_date: "" }); setMode("convert"); }} />
              ) : null}
              <Button small variant="danger" title="Remove" loading={busy} onPress={() => patch({ removed: true })} />
            </>
          )}
        </View>
      </Card>
    </View>
  );
}
