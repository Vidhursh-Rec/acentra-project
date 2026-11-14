// Screen 1 — patients as a card grid; click a card for the detail view.
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Search, Stethoscope } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { RefreshButton } from "@/components/RefreshButton";
import { RollingNumber } from "@/components/RollingNumber";
import { OverdueBadge, Pill } from "@/components/StatusBadge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { DOC_STATUS, type DocStatus, formatDate } from "@/lib/format";
import { PRESSABLE, rise, stagger } from "@/lib/motion";
import { useLoad } from "@/lib/useLoad";
import { cn } from "@/lib/utils";

type Row = {
  patient_id: string; name: string; language: string; status: DocStatus; discharge_date: string | null;
  doctor_id: string | null; doctor_name: string | null; overdue: boolean; family: number; missed: number;
};
type Filter = "all" | "waiting" | "overdue" | "approved" | "missed";

const FILTERS: { key: Filter; label: string; test: (r: Row) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "waiting", label: "Awaiting approval", test: (r) => r.status === "pending_review" },
  { key: "overdue", label: "Overdue", test: (r) => r.overdue },
  { key: "approved", label: "Approved", test: (r) => r.status === "approved" },
  { key: "missed", label: "Missed doses", test: (r) => r.missed > 0 },
];
const MotionLink = motion.create(Link);
const LANG = { en: "English", ta: "Tamil", hi: "Hindi" } as Record<string, string>;

function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function Patients() {
  const reduced = useReducedMotion();
  const { data, error, reload } = useLoad(() => api<Row[]>("/mgmt/patients"), 30_000);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const test = FILTERS.find((f) => f.key === filter)!.test;
    return (data ?? []).filter((r) => test(r) && (!needle || `${r.patient_id} ${r.name} ${r.doctor_name ?? ""}`.toLowerCase().includes(needle)));
  }, [data, q, filter]);

  const stats = useMemo(() => {
    const all = data ?? [];
    return [
      { label: "Patients", value: all.length },
      { label: "Awaiting approval", value: all.filter((r) => r.status === "pending_review").length },
      { label: "Overdue approvals", value: all.filter((r) => r.overdue).length },
      { label: "Missed doses", value: all.reduce((n, r) => n + r.missed, 0) },
    ];
  }, [data]);

  // The one thing that needs the admin now: overdue plans first, then plans waiting for a doctor.
  const focus = useMemo(() => {
    const all = data ?? [];
    const overdue = all.filter((r) => r.overdue);
    const waiting = all.filter((r) => r.status === "pending_review");
    if (overdue.length) return { kind: "overdue" as const, rows: overdue, filter: "overdue" as Filter };
    if (waiting.length) return { kind: "waiting" as const, rows: waiting, filter: "waiting" as Filter };
    return { kind: "clear" as const, rows: [], filter: "all" as Filter };
  }, [data]);

  return (
    <div className="pb-24">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-balance sm:text-3xl">Patients</h1>
          <p className="max-w-[65ch] text-pretty text-muted-text">Discharge plans and follow-up status. Refreshes every 30 seconds.</p>
        </div>
        <RefreshButton onRefresh={reload} />
      </div>

      {!data ? (
        <Skeleton className="mb-6 h-56 rounded-2xl lg:h-44" />
      ) : (
        <motion.section variants={rise(reduced)} initial="hidden" animate="show"
          className="mb-6 grid overflow-hidden rounded-2xl border border-line bg-surface shadow-sm lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div key={focus.kind} className="grid"
              initial={reduced ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={reduced ? { opacity: 0 } : { opacity: 0, filter: "blur(4px)" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
              <FocusPanel focus={focus} onShow={() => setFilter(focus.filter)} />
            </motion.div>
          </AnimatePresence>
          <dl className="grid grid-cols-2 gap-px border-t border-line bg-line sm:grid-cols-4 lg:grid-cols-2 lg:border-l lg:border-t-0">
            {stats.map(({ label, value }) => (
              <div key={label} className="flex flex-col justify-center bg-surface px-5 py-4">
                <dt className="text-sm text-muted-text">{label}</dt>
                <dd className="text-2xl font-bold tracking-[-0.01em] text-ink"><RollingNumber value={value} /></dd>
              </div>
            ))}
          </dl>
        </motion.section>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-text" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient, ID or doctor" className="h-10 rounded-full pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const n = (data ?? []).filter(f.test).length;
            return (
              <button key={f.key} onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}
                className={cn("rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors active:scale-[0.97] pointer-coarse:py-2.5",
                  filter === f.key ? "border-brand-dark bg-brand-dark text-white" : "border-line bg-white text-ink hover:bg-surface")}>
                {f.label}{data ? <span className={cn("tabular-nums", filter === f.key ? "font-medium text-white" : "text-muted-text")}> {n}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {error ? <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert> : null}

      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-52 rounded-2xl" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line py-16 text-center">
          <span className="mb-3 flex size-14 items-center justify-center rounded-full bg-green-100"><ClipboardList className="size-7 text-brand" /></span>
          <div className="text-lg font-semibold">No patients here</div>
          <div className="text-sm text-muted-text">Try another filter or search.</div>
        </div>
      ) : (
        <motion.div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
          variants={stagger(rows.length, reduced)} initial="hidden" animate="show">
          <AnimatePresence mode="popLayout" initial={false}>
          {rows.map((r) => {
            const status = DOC_STATUS[r.status];
            return (
              // Outer: position (FLIP on filter change) + enter/leave. Inner: press/hover feedback.
              <motion.div key={r.patient_id} className="grid" layout={reduced ? false : "position"} variants={rise(reduced)}
                exit={reduced ? { opacity: 0, transition: { duration: 0.12 } } : { opacity: 0, transform: "scale(0.96)", transition: { duration: 0.15 } }}
                transition={{ layout: { type: "spring", bounce: 0, duration: 0.35 } }}>
              <MotionLink to={`/patients/${r.patient_id}`} {...(reduced ? {} : PRESSABLE)}
                aria-label={`${r.name}, ${r.patient_id}, ${status.label}${r.overdue ? ", overdue" : ""}`}
                className={cn("flex flex-col rounded-2xl border bg-surface p-5 text-left shadow-sm transition-shadow hover:shadow-md",
                  r.overdue ? "border-red-200" : r.status === "pending_review" ? "border-amber-200" : "border-line")}>
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-brand-dark">
                    {initials(r.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{r.name}</div>
                    <div className="text-xs text-muted-text">{r.patient_id} · {LANG[r.language] ?? r.language}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Pill className={status.className}>{status.label}</Pill>
                  {r.overdue ? <OverdueBadge /> : null}
                </div>
                <div className="mt-4 space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-text"><Stethoscope className="size-4" /> <span className="truncate text-ink">{r.doctor_name ?? "—"}</span></div>
                  <div className="flex items-center gap-2 text-muted-text"><CalendarDays className="size-4" /> Discharged {formatDate(r.discharge_date)}</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-3 text-center">
                  <div>
                    <div className={cn("text-lg font-bold tabular-nums", r.missed ? "text-red-700" : "text-ink")}>{r.missed}</div>
                    <div className="text-xs text-muted-text">Missed doses</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold tabular-nums">{r.family}</div>
                    <div className="text-xs text-muted-text">Family</div>
                  </div>
                </div>
              </MotionLink>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

const FOCUS = {
  overdue: { label: "Needs you now", one: "plan is overdue for a doctor's approval", many: "plans are overdue for a doctor's approval",
    note: "Waiting over 12 hours", action: "Show overdue", panel: "bg-red-50", number: "text-red-700" },
  waiting: { label: "Waiting for a doctor", one: "plan is waiting for a doctor's approval", many: "plans are waiting for a doctor's approval",
    note: "Not yet approved", action: "Show waiting", panel: "bg-amber-50", number: "text-amber-700" },
};

function FocusPanel({ focus, onShow }: {
  focus: { kind: "overdue" | "waiting" | "clear"; rows: Row[] }; onShow: () => void;
}) {
  if (focus.kind === "clear") {
    return (
      <div className="flex items-center gap-4 bg-green-50 p-6 sm:p-8">
        <CheckCircle2 className="size-12 shrink-0 text-brand-dark" strokeWidth={1.75} />
        <div>
          <div className="label-caps">All clear</div>
          <div className="text-2xl font-bold tracking-[-0.02em] text-balance">Every plan is approved</div>
          <div className="text-muted-text">Nothing is waiting for a doctor right now.</div>
        </div>
      </div>
    );
  }
  const f = FOCUS[focus.kind];
  const n = focus.rows.length;
  const names = focus.rows.slice(0, 3).map((r) => r.name).join(", ") + (n > 3 ? ` and ${n - 3} more` : "");
  return (
    <div className={cn("flex flex-col gap-5 p-6 sm:flex-row sm:items-end sm:justify-between sm:p-8 lg:flex-col lg:items-start xl:flex-row xl:items-end", f.panel)}>
      <div className="min-w-0">
        <div className="label-caps">{f.label}</div>
        <div className="mt-1 flex items-baseline gap-3">
          <RollingNumber value={n} className={cn("text-6xl font-bold leading-none tracking-[-0.03em]", f.number)} />
          <span className="text-lg font-semibold text-balance">{n === 1 ? f.one : f.many}</span>
        </div>
        <div className="mt-3 text-sm text-muted-text">{f.note}: <span className="font-semibold text-ink">{names}</span></div>
      </div>
      <Button className="shrink-0 self-start rounded-full sm:self-auto lg:self-start xl:self-auto" onClick={onShow}>
        {f.action} <ArrowRight />
      </Button>
    </div>
  );
}
