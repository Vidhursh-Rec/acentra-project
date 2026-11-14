// Sidebar navigation (design-carebridge.md §9: sidebar, not bottom bar).
// Laptop and up: the sidebar is always visible. Below 1024px: a top bar with a menu button that slides the
// same sidebar in from the left (drawer), so phones and tablets keep one navigation model.
import { HeartPulse, LogOut, Map, Menu, Stethoscope, Users, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";

import { getAdmin, setAdmin } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/patients", label: "Patients", Icon: Users },
  { to: "/doctors", label: "Doctors", Icon: Stethoscope },
  { to: "/map", label: "Hospital map", Icon: Map },
];

const DRAWER = { type: "tween", ease: [0.32, 0.72, 0, 1], duration: 0.3 } as const;

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex size-9 items-center justify-center rounded-full bg-green-100">
        <HeartPulse className="size-5 text-brand" />
      </span>
      <div>
        <div className="text-lg font-bold leading-tight">CareBridge</div>
        <div className="text-xs text-muted-text">Management</div>
      </div>
    </div>
  );
}

function SidebarBody({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const admin = getAdmin();
  return (
    <>
      <div className="mb-8 flex items-center justify-between px-2">
        <Brand />
        {onClose ? (
          <button onClick={onClose} aria-label="Close menu"
            className="flex size-11 items-center justify-center rounded-full text-muted-text hover:bg-surface hover:text-ink">
            <X className="size-5" />
          </button>
        ) : null}
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors pointer-coarse:py-3.5",
                isActive ? "bg-green-50 text-brand-dark" : "text-muted-text hover:bg-surface hover:text-ink",
              )
            }
          >
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto border-t border-line pt-4">
        <div className="px-2 text-sm font-semibold">{admin?.name}</div>
        <div className="px-2 text-xs text-muted-text">{admin?.id}</div>
        <button
          onClick={() => { setAdmin(null); navigate("/login"); }}
          className="mt-3 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-muted-text hover:bg-surface hover:text-ink pointer-coarse:py-3"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </div>
    </>
  );
}

export function Layout() {
  const reduced = useReducedMotion();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const drawer = useRef<HTMLElement>(null);

  // Close on navigation; Escape closes and returns focus to the menu button.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    const page = pathname.startsWith("/patients/") ? `Patient ${pathname.split("/")[2]}`
      : NAV.find((n) => pathname.startsWith(n.to))?.label;
    document.title = page ? `${page} · CareBridge Management` : "CareBridge Management";
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    drawer.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); menuButton.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = overflow; };
  }, [open]);

  return (
    <div className="flex min-h-screen bg-white text-ink">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-white px-4 py-6 lg:flex">
        <SidebarBody />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-white/90 px-4 backdrop-blur lg:hidden">
          <Brand />
          <button ref={menuButton} onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}
            className="flex size-11 items-center justify-center rounded-full text-ink hover:bg-surface active:scale-[0.96]">
            <Menu className="size-5" />
          </button>
        </header>

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            <motion.aside ref={drawer} role="dialog" aria-modal="true" aria-label="Menu"
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white px-4 py-4 shadow-xl"
              initial={reduced ? { opacity: 0 } : { transform: "translateX(-100%)" }}
              animate={reduced ? { opacity: 1 } : { transform: "translateX(0%)" }}
              exit={reduced ? { opacity: 0 } : { transform: "translateX(-100%)" }}
              transition={reduced ? { duration: 0.15 } : DRAWER}>
              <SidebarBody onClose={() => { setOpen(false); menuButton.current?.focus(); }} />
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
