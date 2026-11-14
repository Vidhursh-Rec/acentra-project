import { cn } from "@/lib/utils";

/** Pill badge from design-carebridge.md §4. */
export function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}

export function OverdueBadge() {
  return <Pill className="bg-red-100 text-red-700">Overdue</Pill>;
}
