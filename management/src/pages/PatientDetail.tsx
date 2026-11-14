// Patient detail, all as cards: profile + family hub, discharge summary, approved plan (grouped,
// with edit history), approval timeline, appointments, and the day-by-day follow-up checklist.
import {
  ArrowLeft, Bell, BellOff, CalendarDays, CheckCircle2, Circle, ExternalLink, FileText,
  History, Info, Pill as PillIcon, Stethoscope, UserRound, Users, XCircle,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { type ReactNode, useMemo, useState } from "react";
import { Link, useParams } from "react-router";

import { Pill } from "@/components/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { CATEGORY } from "@/lib/category";
import {
  DOC_STATUS, type DocStatus, formatDate, formatDateTime, formatTime, itemTitle, ROLE_LABEL, TASK_STATUS,
  type TaskStatus, TYPE_LABEL,
} from "@/lib/format";
import { rise, stagger } from "@/lib/motion";
import { useLoad } from "@/lib/useLoad";
import { cn } from "@/lib/utils";

type Profile = {
  patient_id: string; name: string; language: string;
  doctor: { id: string; name: string; specialty: string };
  family: { name: string; role: string; language: string; push: boolean }[];
};
type Discharge = { status: DocStatus; file_url: string; raw_text: string | null; discharge_date: string | null };
type Snapshot = { type: string; fields: Record<string, unknown>; removed: boolean };
type Edit = { doctor: string; at: string; before: Snapshot; after: Snapshot };
type Item = {
  id: string; type: string; fields: Record<string, unknown>; source_quote: string; needs_review: boolean;
  review_reason: string | null; removed: boolean; history: Edit[];
};
type ApprovalStep = { doctor: string; assigned_at: string; approved_at: string | null; reassigned_from: string | null; reassigned_by: string | null };
type Plan = { status: DocStatus; items: Item[]; approvals: ApprovalStep[] };
type Task = {
  id: string; type: string; title: string; date: string; time: string; status: TaskStatus;
  marked_by: string | null; marked_by_role: string | null;
};
type Cal = { events: Task[]; tasks: Task[] };

const GROUPS = ["warning", "med", "appointment", "test", "referral", "care"].map((type) => ({ type, ...CATEGORY[type] }));
const LANG = { en: "English", ta: "Tamil", hi: "Hindi" } as Record<string, string>;

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function changeText(e: Edit): string {
  if (e.before.removed !== e.after.removed) return e.after.removed ? "Removed" : "Restored";
  if (e.before.type !== e.after.type) return `Changed ${TYPE_LABEL[e.before.type]} → ${TYPE_LABEL[e.after.type]}`;
  const changed = Object.keys({ ...e.before.fields, ...e.after.fields })
    .filter((k) => JSON.stringify(e.before.fields[k]) !== JSON.stringify(e.after.fields[k]))
    .map((k) => `${k}: ${JSON.stringify(e.before.fields[k] ?? null)} → ${JSON.stringify(e.after.fields[k] ?? null)}`);
  return changed.length ? changed.join(" · ") : "Marked reviewed";
}

function Section({ title, Icon, action, children, className }: {
  title: string; Icon: typeof PillIcon; action?: ReactNode; children: ReactNode; className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.section variants={rise(reduced)} className={cn("min-w-0 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5", className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-lg font-semibold tracking-[-0.01em] text-balance">
          <span className="flex size-8 items-center justify-center rounded-full bg-green-100"><Icon className="size-4 text-brand" /></span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

export default function PatientDetail() {
  const { id = "" } = useParams();
  const reduced = useReducedMotion();
  const profile = useLoad(() => api<Profile>(`/mgmt/patient/${id}`));
  const discharge = useLoad(() => api<Discharge>(`/mgmt/patient/${id}/discharge`));
  const plan = useLoad(() => api<Plan>(`/mgmt/patient/${id}/plan`), 30_000);
  const cal = useLoad(() => api<Cal>(`/mgmt/patient/${id}/calendar`), 30_000);

  const days = useMemo(() => [...new Set((cal.data?.tasks ?? []).map((t) => t.date))].sort(), [cal.data]);
  const [day, setDay] = useState<string | null>(null);
  const shownDay = day ?? (days.includes(todayIso()) ? todayIso() : days[0] ?? null);
  const dayTasks = (cal.data?.tasks ?? []).filter((t) => t.date === shownDay);
  const doneCount = dayTasks.filter((t) => t.status === "completed" || t.status === "taken_late").length;

  const status = plan.data?.status ?? discharge.data?.status;
  const p = profile.data;

  return (
    <motion.div className="pb-24" variants={stagger(8, reduced)} initial="hidden" animate="show">
      <Link to="/patients" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-text hover:text-ink">
        <ArrowLeft className="size-4" /> All patients
      </Link>

      {/* Profile */}
      <motion.section variants={rise(reduced)} className="mb-6 grid gap-5 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6 lg:grid-cols-[1.4fr_1fr_1.4fr]">
        <div className="flex items-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-brand-dark">
            {p ? p.name.split(/\s+/).map((x) => x[0]).slice(0, 2).join("") : ""}
          </span>
          <div>
            {p ? <h1 className="text-2xl font-bold tracking-[-0.02em] text-balance sm:text-3xl">{p.name}</h1> : <Skeleton className="h-7 w-48" />}
            <div className="text-sm text-muted-text">{id}{p ? ` · ${LANG[p.language] ?? p.language}` : ""}</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {status ? <Pill className={DOC_STATUS[status].className}>{DOC_STATUS[status].label}</Pill> : null}
              {discharge.data?.discharge_date ? <Pill className="bg-white text-muted-text ring-1 ring-line">Discharged {formatDate(discharge.data.discharge_date)}</Pill> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-green-100"><Stethoscope className="size-5 text-brand" /></span>
          <div>
            <div className="label-caps">Doctor</div>
            <div className="font-semibold">{p?.doctor.name ?? "—"}</div>
            <div className="text-xs text-muted-text">{p?.doctor.specialty}</div>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <div className="mb-2 flex items-center gap-2 label-caps"><Users className="size-4" /> Family hub</div>
          {!p?.family.length ? <div className="text-sm text-muted-text">No family members have joined yet.</div> : (
            <div className="flex flex-wrap gap-2">
              {p.family.map((f, i) => (
                <span key={i} className="flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-sm ring-1 ring-line"
                  title={f.push ? "Gets missed-dose alerts" : "No push on this device"}>
                  {f.push ? <Bell className="size-3.5 text-brand" /> : <BellOff className="size-3.5 text-muted-text" />}
                  <b>{f.name}</b><span className="text-muted-text">{ROLE_LABEL[f.role] ?? "Viewer"}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.section>

      {discharge.error ? <Alert variant="destructive" className="mb-4"><AlertDescription>{discharge.error}</AlertDescription></Alert> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Discharge summary" Icon={FileText} className="self-start"
          action={discharge.data ? (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a href={discharge.data.file_url} target="_blank" rel="noreferrer"><ExternalLink /> Open original</a>
            </Button>
          ) : null}>
          {!discharge.data ? <Skeleton className="h-96 w-full" /> : (
            <pre className="max-h-[44rem] overflow-auto whitespace-pre-wrap rounded-xl bg-surface p-4 font-sans text-sm leading-6">
              {discharge.data.raw_text ?? "(no text)"}
            </pre>
          )}
        </Section>

        <Section title={status === "approved" ? "Doctor-approved plan" : "Plan (awaiting approval)"} Icon={CheckCircle2}>
          {!plan.data ? <Skeleton className="h-96 w-full" /> : (
            <div className="space-y-5">
              {GROUPS.map((g) => {
                const items = plan.data!.items.filter((i) => i.type === g.type);
                if (!items.length) return null;
                return (
                  <div key={g.type}>
                    <div className="mb-2 flex items-center gap-2 label-caps">
                      <span className={cn("flex size-6 items-center justify-center rounded-full", g.chip)}><g.Icon className="size-3.5" /></span>
                      {g.label} <span className="font-normal">· {items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {items.map((i) => (
                        <div key={i.id} className={cn("rounded-xl border bg-surface p-3.5", i.needs_review && !i.removed ? "border-amber-200" : "border-line", i.removed && "opacity-60")}>
                          {i.needs_review && !i.removed ? (
                            <Alert className="mb-2 border-amber-200 bg-amber-50 py-2">
                              <Info className="text-amber-600" />
                              <AlertTitle className="text-amber-700">Needs Review</AlertTitle>
                              <AlertDescription className="text-amber-600">{i.review_reason}</AlertDescription>
                            </Alert>
                          ) : null}
                          <div className="flex items-start justify-between gap-2">
                            <div className={cn("font-semibold", i.removed && "line-through")}>{itemTitle(i.type, i.fields)}</div>
                            {i.removed ? <Pill className="bg-gray-100 text-gray-600">Removed</Pill> : null}
                          </div>
                          <p className="mt-1.5 text-sm leading-relaxed text-pretty text-muted-text">“{i.source_quote}”</p>
                          {i.history.length ? (
                            <div className="mt-2.5 space-y-1 border-t border-line pt-2">
                              {i.history.map((h, n) => (
                                <div key={n} className="flex gap-2 text-xs text-muted-text">
                                  <History className="mt-0.5 size-3.5 shrink-0" />
                                  <span><b className="text-ink">{h.doctor}</b> · {formatDateTime(h.at)} · {changeText(h)}</span>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Section title="Approval timeline" Icon={UserRound}>
          {!plan.data?.approvals.length ? <p className="text-sm text-muted-text">Not routed to a doctor yet.</p> : (
            <ol className="relative space-y-4 border-l border-line pl-5">
              {plan.data.approvals.map((a, n) => (
                <li key={n} className="relative">
                  <span className={cn("absolute -left-[26px] top-1 size-3 rounded-full ring-4 ring-white", a.approved_at ? "bg-brand" : "bg-amber-500")} />
                  <div className="font-semibold">{a.doctor}</div>
                  <div className="text-xs text-muted-text">Assigned {formatDateTime(a.assigned_at)}</div>
                  {a.reassigned_from ? <div className="text-xs text-muted-text">Reassigned from {a.reassigned_from} by {a.reassigned_by === "system" ? "system (doctor unavailable)" : a.reassigned_by}</div> : null}
                  {a.approved_at ? <div className="text-xs font-semibold text-green-700">Approved {formatDateTime(a.approved_at)}</div> : null}
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Appointments & tests" Icon={CalendarDays}>
          {!cal.data?.events.length ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CalendarDays className="mb-2 size-8 text-line" />
              <p className="text-sm text-muted-text">Nothing scheduled.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cal.data.events.map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
                  {(() => { const c = CATEGORY[e.type] ?? CATEGORY.appointment; return (
                    <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", c.chip)}><c.Icon className="size-4" /></span>
                  ); })()}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold break-words">{e.title}</div>
                    <div className="text-xs text-muted-text">{TYPE_LABEL[e.type]} · {formatDate(e.date)}</div>
                  </div>
                  <Pill className={TASK_STATUS[e.status].className}>{TASK_STATUS[e.status].label}</Pill>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Follow-up checklist" Icon={CheckCircle2}
          action={days.length ? (
            <Select value={shownDay ?? undefined} onValueChange={setDay}>
              <SelectTrigger className="w-auto min-w-40 rounded-full" aria-label="Checklist day"><SelectValue /></SelectTrigger>
              <SelectContent>
                {days.map((d) => <SelectItem key={d} value={d}>{formatDate(d)}{d === todayIso() ? " (today)" : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : null}>
          {!dayTasks.length ? (
            <div className="flex flex-col items-center py-6 text-center">
              <CheckCircle2 className="mb-2 size-8 text-line" />
              <p className="text-sm text-muted-text">No reminders — the plan isn't approved or nothing is due.</p>
            </div>
          ) : (
            <>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-label="Done this day" aria-valuemin={0} aria-valuemax={dayTasks.length} aria-valuenow={doneCount}>
                <div className="h-full w-full origin-left rounded-full bg-brand transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]" style={{ transform: `scaleX(${doneCount / dayTasks.length})` }} />
              </div>
              <div className="mb-2 text-xs tabular-nums text-muted-text">{doneCount} of {dayTasks.length} done</div>
              <div className="divide-y divide-line">
                {dayTasks.map((t) => {
                  const done = t.status === "completed" || t.status === "taken_late";
                  return (
                    <div key={t.id} className="flex items-center gap-3 py-2.5">
                      {done ? <CheckCircle2 className="size-5 shrink-0 text-brand-dark" aria-hidden />
                        : t.status === "missed" ? <XCircle className="size-5 shrink-0 text-red-600" aria-hidden />
                        : <Circle className="size-5 shrink-0 text-gray-300" aria-hidden />}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold break-words">{t.title}</div>
                        <div className="text-xs text-muted-text">{formatTime(t.time)}</div>
                      </div>
                      <div className="text-right">
                        <Pill className={TASK_STATUS[t.status].className}>{TASK_STATUS[t.status].label}</Pill>
                        {t.marked_by ? <div className="mt-1 text-xs text-muted-text">by {t.marked_by} ({ROLE_LABEL[t.marked_by_role ?? ""] ?? t.marked_by_role})</div>
                          : t.status === "missed" ? <div className="mt-1 text-xs text-muted-text">flagged by system</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Section>
      </div>
    </motion.div>
  );
}
