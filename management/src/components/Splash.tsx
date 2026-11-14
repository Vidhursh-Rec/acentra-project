// Web splash: same pattern as the app (design-carebridge.md §14) — the only dark screen.
// Logo materialises (fade + scale 0.92 → 1, critically damped), then the whole splash fades away.
// Shown once per browser session, ~1.4 s.
import { HeartPulse, Pill } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";

import { SPRING } from "@/lib/motion";

const KEY = "carebridge.splashShown";
const SPLASH_MS = 1400;

function alreadyShown(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function SplashGate({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const [show, setShow] = useState(() => !alreadyShown());

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => {
      setShow(false);
      try { sessionStorage.setItem(KEY, "1"); } catch { /* private mode: show again next time */ }
    }, SPLASH_MS);
    return () => clearTimeout(t);
  }, [show]);

  return (
    <>
      {children}
      <AnimatePresence>
        {show ? (
          <motion.div
            key="splash"
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-black to-ink"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            aria-label="CareBridge is loading"
          >
            <motion.div
              className="flex flex-col items-center"
              initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "scale(0.92)" }}
              animate={{ opacity: 1, transform: "scale(1)" }}
              transition={reduced ? { duration: 0.2 } : SPRING}
            >
              <div className="relative mb-6 flex size-24 items-center justify-center">
                {/* pill fades out with a slight blur while the heart fades in from blur: reads as one shape changing */}
                <motion.span
                  className="absolute"
                  animate={{ opacity: [1, 0], filter: ["blur(0px)", "blur(2px)"] }}
                  transition={{ delay: 0.55, duration: 0.3 }}
                >
                  <Pill className="size-20 text-white" strokeWidth={1.25} />
                </motion.span>
                <motion.span
                  className="absolute"
                  initial={{ opacity: 0, filter: "blur(2px)" }}
                  animate={{ opacity: [0, 1], filter: ["blur(2px)", "blur(0px)"] }}
                  transition={{ delay: 0.55, duration: 0.3 }}
                >
                  <span className="flex size-24 items-center justify-center">
                    <HeartPulse className="size-16 text-white" strokeWidth={1.25} />
                  </span>
                </motion.span>
              </div>
              <div className="text-4xl font-bold tracking-[-0.02em] text-white">CareBridge</div>
              <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
                <span className="size-1.5 rounded-full bg-brand" /> Management · From Discharge to Recovery
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
