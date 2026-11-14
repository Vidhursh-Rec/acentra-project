// Display helpers for plan items (doctor screens, English).

export type PlanItem = {
  id: string;
  type: "med" | "appointment" | "test" | "referral" | "care" | "warning";
  fields: Record<string, any>;
  source_quote: string;
  needs_review: boolean;
  review_reason: string | null;
  removed: boolean;
};

export const TYPE_LABELS: Record<PlanItem["type"], string> = {
  med: "Medicines",
  appointment: "Appointments",
  test: "Tests",
  referral: "Referrals",
  care: "Care instructions",
  warning: "Warning signs",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "20:00" -> "8:00 PM" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "2026-10-22" -> "22 Oct 2026" */
export function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Drug name + dose exactly as written; dose not repeated if already in the name. */
export function medName(f: Record<string, any>): string {
  const drug = f.drug ?? "(drug missing)";
  return f.dose && !String(drug).includes(f.dose) ? `${drug} ${f.dose}` : drug;
}

export function itemTitle(i: PlanItem): string {
  const f = i.fields;
  switch (i.type) {
    case "med": return medName(f);
    case "appointment": return f.with ?? "Appointment";
    case "test": return f.name ?? "Test";
    case "referral": return [f.specialty, f.to].filter(Boolean).join(" · ") || "Referral";
    default: return f.text ?? i.source_quote;
  }
}

export function itemDetails(i: PlanItem): string[] {
  const f = i.fields;
  if (i.type === "med") {
    return [
      f.frequency,
      (f.times ?? []).length ? (f.times as string[]).map(formatTime).join(", ") : null,
      f.food,
      f.duration_days ? `${f.duration_days} days` : null,
    ].filter(Boolean);
  }
  if (["appointment", "test", "referral"].includes(i.type)) {
    return [f.resolved_date ? formatDate(f.resolved_date) : "No date", f.specialty && i.type === "appointment" ? f.specialty : null].filter(Boolean);
  }
  return [];
}

/** Fields the doctor can edit, per type (must match backend EDITABLE). */
export const EDIT_FIELDS: Record<PlanItem["type"], { key: string; label: string; hint?: string }[]> = {
  med: [
    { key: "drug", label: "Drug" },
    { key: "dose", label: "Dose" },
    { key: "frequency", label: "Frequency" },
    { key: "times", label: "Times (24h)", hint: "08:00, 20:00" },
    { key: "duration_days", label: "Duration (days)", hint: "empty = ongoing" },
    { key: "food", label: "Food" },
  ],
  appointment: [
    { key: "with", label: "With" },
    { key: "specialty", label: "Specialty" },
    { key: "resolved_date", label: "Date", hint: "YYYY-MM-DD" },
    { key: "provider_name", label: "Provider" },
    { key: "provider_address", label: "Address" },
  ],
  test: [
    { key: "name", label: "Test" },
    { key: "resolved_date", label: "Date", hint: "YYYY-MM-DD" },
  ],
  referral: [
    { key: "specialty", label: "Specialty" },
    { key: "to", label: "To" },
    { key: "resolved_date", label: "Date", hint: "YYYY-MM-DD" },
  ],
  care: [{ key: "text", label: "Instruction" }],
  warning: [{ key: "text", label: "Warning sign" }],
};

/** Form strings -> API values. */
export function toFieldValue(key: string, text: string): unknown {
  const v = text.trim();
  if (key === "times") return v ? v.split(/[,\s]+/).filter(Boolean) : [];
  if (key === "duration_days") return v ? Number(v) : null;
  return v || null;
}

export function toFormText(key: string, value: unknown): string {
  if (value == null) return "";
  if (key === "times") return (value as string[]).join(", ");
  return String(value);
}
