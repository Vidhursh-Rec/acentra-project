// Plan-item category colours (design-carebridge.md §1 "Category colours"): one hue per plan type so a plan
// scans by type. Category hue lives only in the small icon chip — never on status pills, which keep their
// own green / amber / red meaning. Warning signs stay red because they are an alert, not a category.
import { AlertTriangle, CalendarCheck, FlaskConical, HeartHandshake, Pill, Send } from "lucide-react";

export const CATEGORY: Record<string, { label: string; Icon: typeof Pill; chip: string }> = {
  warning: { label: "Warning signs", Icon: AlertTriangle, chip: "bg-red-100 text-red-700" },
  med: { label: "Medicines", Icon: Pill, chip: "bg-green-100 text-green-700" },
  appointment: { label: "Appointments", Icon: CalendarCheck, chip: "bg-blue-100 text-blue-700" },
  test: { label: "Tests", Icon: FlaskConical, chip: "bg-violet-100 text-violet-700" },
  referral: { label: "Referrals", Icon: Send, chip: "bg-teal-100 text-teal-700" },
  care: { label: "Care instructions", Icon: HeartHandshake, chip: "bg-rose-100 text-rose-700" },
};
