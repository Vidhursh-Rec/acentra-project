// Screen 2 — doctors: availability (admin toggle), workload, overdue approvals, reassign.
// Marking a doctor unavailable moves all their pending plans automatically (server side, one transaction).
import { AlertTriangle, ArrowRightLeft, CalendarClock, CheckCheck, Clock, Stethoscope, UserCheck, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { RefreshButton } from "@/components/RefreshButton";
import { OverdueBadge, Pill } from "@/components/StatusBadge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { api, ApiError } from "@/lib/api";
import { hoursSince } from "@/lib/format";
import { LIFT, rise, stagger } from "@/lib/motion";
import { useLoad } from "@/lib/useLoad";
import { cn } from "@/lib/utils";

type Pending = { approval_id: string; patient_id: string; patient_name: string; assigned_at: string; overdue: boolean };
type Doctor = {
  id: string; name: string; specialty: string; available: boolean; active_load: number;
  schedule: Record<string, [string, string]>; pending: Pending[]; overdue_count: number;
  approved_7d: number; patients: number;
};
type Suggestion = { id: string; name: string; specialty: string; active_load: number };
type Moved = { patient_id: string; from_doctor: string; to_doctor: string; to_doctor_name: string };

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const TODAY = DAYS[(new Date().getDay() + 6) % 7];
const BUSY_AT = 5; // pending plans that fill the workload bar

export default function Doctors() {
  const reduced = useReducedMotion();
  const { data, error, reload } = useLoad(() => api<Doctor[]>("/mgmt/doctors"), 30_000);
  const stats = useMemo(() => {
    const all = data ?? [];
    return [
      { label: "Available doctors", value: `${all.filter((d) => d.available).length} / ${all.length}`, Icon: UserCheck, tint: "bg-green-100 text-brand" },
      { label: "Plans waiting", value: all.reduce((n, d) => n + d.pending.length, 0), Icon: Clock, tint: "bg-amber-100 text-amber-700" },
      { label: "Overdue (> 12 h)", value: all.reduce((n, d) => n + d.overdue_count, 0), Icon: AlertTriangle, tint: "bg-red-100 text-red-700" },
      { label: "Approved this week", value: all.reduce((n, d) => n + d.approved_7d, 0), Icon: CheckCheck, tint: "bg-green-100 text-brand" },
    ];
  }, [data]);
  const [confirmOff, setConfirmOff] = useState<Doctor | null>(null);
  const [reassigning, setReassigning] = useState<{ doctor: Doctor; p: Pending } | null>(null);
  const [options, setOptions] = useState<Suggestion[] | "error" | null>(null);
  const [choice, setChoice] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ tone: "ok" | "err"; title: string; lines: string[] } | null>(null);

  async function setAvailable(d: Doctor, available: boolean) {
    setBusy(true);
    try {
      const r = await api<{ moved: Moved[]; not_moved: { reason: string }[] }>(`/mgmt/doctors/${d.id}/availability`, {
        method: "PATCH", body: { available },
      });
      setResult({
        tone: r.not_moved.length ? "err" : "ok",
        title: available ? `${d.name} is available again` : `${d.name} marked unavailable`,
        lines: [
          ...r.moved.map((m) => `${d.pending.find((p) => p.patient_id === m.patient_id)?.patient_name ?? m.patient_id} moved to ${m.to_doctor_name}`),
          ...r.not_moved.map((n) => `Not moved: ${n.reason}`),
          ...(!available && !r.moved.length && !r.not_moved.length ? ["No pending plans to move."] : []),
        ],
      });
      await reload();
    } catch (e) {
      setResult({ tone: "err", title: "Could not change availability", lines: [e instanceof ApiError ? e.message : ""] });
    } finally {
      setBusy(false);
      setConfirmOff(null);
    }
  }

  async function openReassign(doctor: Doctor, p: Pending) {
    setReassigning({ doctor, p });
    setOptions(null);
    setChoice("");
    try {
      const s = await api<Suggestion[]>(`/mgmt/approval/${p.approval_id}/suggestions`);
      setOptions(s);
      setChoice(s[0]?.id ?? "");
    } catch {
      setOptions("error"); // an outage must not read as "no doctor is available"
    }
  }

  async function doReassign() {
    if (!reassigning) return;
    setBusy(true);
    try {
      const r = await api<Moved>(`/mgmt/approval/${reassigning.p.approval_id}/reassign`, {
        method: "PATCH", body: { doctor_id: choice || null },
      });
      setResult({ tone: "ok", title: "Plan reassigned", lines: [`${reassigning.p.patient_name} moved from ${reassigning.doctor.name} to ${r.to_doctor_name}`] });
      setReassigning(null);
      await reload();
    } catch (e) {
      // 409: the doctor approved it a moment ago, or it was already moved — exactly one action wins.
      setResult({ tone: "err", title: "Could not reassign", lines: [e instanceof ApiError ? e.message : ""] });
      setReassigning(null);
      await reload();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-balance sm:text-3xl">Doctors</h1>
          <p className="max-w-[65ch] text-pretty text-muted-text">Availability, workload and overdue approvals (over 12 hours).</p>
        </div>
        <RefreshButton onRefresh={reload} />
      </div>

      {error ? <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert> : null}
      {result ? (
        <Alert className={`relative mb-4 pr-12 ${result.tone === "ok" ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
          <button onClick={() => setResult(null)} aria-label="Dismiss"
            className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full text-muted-text hover:bg-white/70 hover:text-ink">
            <X className="size-4" />
          </button>
          <AlertTitle className={result.tone === "ok" ? "text-green-700" : "text-amber-800"}>{result.title}</AlertTitle>
          <AlertDescription>{result.lines.map((l, i) => <div key={i}>{l}</div>)}</AlertDescription>
        </Alert>
      ) : null}

      <motion.div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4" variants={stagger(4, reduced)} initial="hidden" animate="show">
        {stats.map(({ label, value, Icon, tint }) => (
          <motion.div key={label} variants={rise(reduced)} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:gap-4 sm:p-4">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full sm:size-11", tint)}><Icon className="size-5" /></span>
            <div>
              <div className="text-sm text-muted-text">{label}</div>
              <div className="text-2xl font-bold tabular-nums tracking-[-0.01em]">{data ? value : "–"}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {!data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}</div>
      ) : (
      <motion.div className="grid gap-4 pb-24 md:grid-cols-2 xl:grid-cols-3" variants={stagger(data.length, reduced)} initial="hidden" animate="show">
        {data.map((d) => (
          <motion.div key={d.id} variants={rise(reduced)} {...(reduced ? {} : LIFT)}
            className={cn("flex flex-col rounded-2xl border bg-surface p-5 shadow-sm transition-shadow hover:shadow-md", d.overdue_count ? "border-red-200" : "border-line")}>
            <div className="flex items-start gap-3">
              <span className="flex size-10 items-center justify-center rounded-full bg-green-100">
                <Stethoscope className="size-5 text-brand" />
              </span>
              <div className="flex-1">
                <div className="text-lg font-semibold tracking-[-0.01em]">{d.name}</div>
                <div className="text-sm text-muted-text">{d.specialty} · {d.id}</div>
              </div>
              {d.overdue_count ? <OverdueBadge /> : null}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-white px-3 py-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className={`size-2.5 rounded-full ${d.available ? "bg-brand" : "bg-red-600"}`} />
                {d.available ? "Available" : "Unavailable"}
              </span>
              <Switch checked={d.available} disabled={busy}
                onCheckedChange={(v) => (v ? setAvailable(d, true) : setConfirmOff(d))}
                aria-label={`${d.name} availability`} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { n: d.patients, label: "Patients" },
                { n: d.active_load, label: "Pending", warn: d.overdue_count > 0 },
                { n: d.approved_7d, label: "Approved 7d" },
              ].map((x) => (
                <div key={x.label} className="rounded-xl bg-white py-2 ring-1 ring-line">
                  <div className={cn("text-lg font-bold tabular-nums", x.warn ? "text-red-700" : "text-ink")}>{x.n}</div>
                  <div className="text-xs text-muted-text">{x.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs tabular-nums text-muted-text">
                <span id={`load-${d.id}`}>Workload</span><span>{d.active_load} / {BUSY_AT}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white ring-1 ring-line" role="progressbar"
                aria-labelledby={`load-${d.id}`} aria-valuemin={0} aria-valuemax={BUSY_AT} aria-valuenow={Math.min(d.active_load, BUSY_AT)}>
                <div className={cn("h-full w-full origin-left rounded-full transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]", d.active_load >= BUSY_AT ? "bg-red-500" : d.active_load >= 3 ? "bg-amber-500" : "bg-brand")}
                  style={{ transform: `scaleX(${Math.min(1, d.active_load / BUSY_AT)})` }} />
              </div>
            </div>

            <div className="mt-3 text-xs text-muted-text">
              Today: <b className="text-ink">{d.schedule[TODAY] ? d.schedule[TODAY].join("–") : "Off"}</b>
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {DAYS.map((day) => (
                <span key={day} title={d.schedule[day] ? d.schedule[day].join("–") : "Off"} aria-current={day === TODAY ? "date" : undefined}
                  className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold uppercase", d.schedule[day] ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600", day === TODAY && "ring-2 ring-brand-dark")}>
                  {day.slice(0, 2)}
                  <span className="sr-only">{day === TODAY ? " (today)" : ""}: {d.schedule[day] ? d.schedule[day].join("–") : "off"}</span>
                </span>
              ))}
              <CalendarClock className="ml-1 size-4 text-muted-text" />
            </div>

            <div className="mt-4 flex-1 space-y-2">
              {d.pending.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-line bg-white px-3 py-2.5 text-sm text-muted-text">
                  <CheckCheck className="size-4 text-brand-dark" /> No plans waiting for review
                </div>
              ) : d.pending.map((p) => (
                <div key={p.approval_id} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
                  <div className="flex-1">
                    <Link to={`/patients/${p.patient_id}`} className="text-sm font-semibold hover:underline">{p.patient_name}</Link>
                    <div className="text-xs text-muted-text">{p.patient_id} · waiting {hoursSince(p.assigned_at)} h</div>
                  </div>
                  {p.overdue ? <Pill className="bg-red-100 text-red-700">Overdue</Pill> : null}
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => openReassign(d, p)}>
                    <ArrowRightLeft /> Reassign
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>
      )}

      {/* Confirm: unavailable moves pending plans automatically */}
      <Dialog open={!!confirmOff} onOpenChange={(o) => !o && setConfirmOff(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {confirmOff?.name} unavailable?</DialogTitle>
            <DialogDescription>
              {confirmOff?.pending.length
                ? `Their ${confirmOff.pending.length} pending plan(s) will move automatically to the best available doctor (same specialty first, then lowest workload).`
                : "They have no pending plans right now."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setConfirmOff(null)}>Cancel</Button>
            <Button className="rounded-full" disabled={busy} onClick={() => confirmOff && setAvailable(confirmOff, false)}>
              {busy ? <Spinner /> : null} Mark unavailable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual reassign with suggestions */}
      <Dialog open={!!reassigning} onOpenChange={(o) => !o && setReassigning(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign {reassigning?.p.patient_name}'s plan</DialogTitle>
            <DialogDescription>Currently with {reassigning?.doctor.name}. The new doctor sees the full plan with source quotes.</DialogDescription>
          </DialogHeader>
          {options === null ? <Skeleton className="h-10 w-full" /> : options.length === 0 ? (
            <p className="text-sm text-red-700">No other doctor is available.</p>
          ) : options === "error" ? (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              Couldn't load the doctor list.
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => reassigning && openReassign(reassigning.doctor, reassigning.p)}>Try again</Button>
            </div>
          ) : (<>
            <Select value={choice} onValueChange={setChoice}>
              <SelectTrigger className="w-full" aria-label="New doctor"><SelectValue /></SelectTrigger>
              <SelectContent>
                {options.map((o, i) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name} · {o.specialty} · {o.active_load} pending{i === 0 ? " (best match)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(() => {
              const picked = options.find((o) => o.id === choice);
              return picked && reassigning && picked.specialty !== reassigning.doctor.specialty ? (
                <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  Different specialty: {picked.specialty}, not {reassigning.doctor.specialty}.
                </p>
              ) : null;
            })()}
          </>)}
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setReassigning(null)}>Cancel</Button>
            <Button className="rounded-full" disabled={busy || !choice} onClick={doReassign}>
              {busy ? <Spinner /> : null} Reassign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
