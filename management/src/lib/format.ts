export type DocStatus = "none" | "queued" | "processing" | "rejected" | "pending_review" | "approved";
export type TaskStatus = "pending" | "completed" | "taken_late" | "missed";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${formatDate(d.toISOString())} ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export function hoursSince(iso?: string | null): number | null {
  return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000) : null;
}

/** Badge colours from design-carebridge.md §4. */
export const DOC_STATUS: Record<DocStatus, { label: string; className: string }> = {
  none: { label: "No upload", className: "bg-gray-100 text-gray-600" },
  queued: { label: "Queued", className: "bg-gray-100 text-gray-600" },
  processing: { label: "Processing", className: "bg-gray-100 text-gray-600" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-700" },
  pending_review: { label: "Awaiting approval", className: "bg-amber-100 text-amber-800" },
  approved: { label: "Approved", className: "bg-green-100 text-green-700" },
};

export const TASK_STATUS: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-gray-100 text-gray-600" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  taken_late: { label: "Taken late", className: "bg-amber-100 text-amber-800" },
  missed: { label: "Missed", className: "bg-red-100 text-red-700" },
};

export const ROLE_LABEL: Record<string, string> = { patient: "Patient", hub_manager: "Hub Manager" };

export const TYPE_LABEL: Record<string, string> = {
  med: "Medicine", appointment: "Appointment", test: "Test", referral: "Referral", care: "Care", warning: "Warning sign",
};

/** Plan item headline: drug + dose as written, or the descriptive text. */
export function itemTitle(type: string, f: Record<string, unknown>): string {
  const s = (k: string) => (typeof f[k] === "string" ? (f[k] as string) : "");
  if (type === "med") {
    const drug = s("drug"), dose = s("dose");
    return dose && !drug.includes(dose) ? `${drug} ${dose}` : drug || "(drug missing)";
  }
  if (type === "appointment") return s("with") || s("specialty") || "Appointment";
  if (type === "test") return s("name") || "Test";
  if (type === "referral") return [s("specialty"), s("to")].filter(Boolean).join(" · ") || "Referral";
  return s("text");
}
