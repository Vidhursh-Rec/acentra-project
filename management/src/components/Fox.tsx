// The CareBridge fox — an original SVG mascot fixed in the bottom-right corner of every page.
// Idle: an occasional blink (no slow looping sway). Hover: ears twitch, tail wags.
// Click: a small hop (bounce is earned by the click) and a tip for the current page.
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";

import { CAN_HOVER, SPRING, SPRING_BOUNCY } from "@/lib/motion";

const TIPS: [RegExp, string][] = [
  [/^\/patients\/.+/, "The plan on the right is exactly what the doctor approved. Edits keep their history."],
  [/^\/patients/, "Amber cards are waiting for a doctor. Red means overdue — check the Doctors page."],
  [/^\/doctors/, "Switch a doctor off and their pending plans move to the best available doctor."],
  [/^\/map/, "Every pin is a suggestion only. Filter by specialty to check coverage."],
  [/^\/login/, "Hi! I'm Kit. Log in to see how your patients are doing."],
];

function FoxSvg({ blink, perk, wag }: { blink: boolean; perk: boolean; wag: boolean }) {
  const ear = { rotate: perk ? [0, -12, 0] : 0, transition: { duration: 0.35 } };
  return (
    <svg viewBox="0 0 120 120" className="size-full drop-shadow-sm" aria-hidden>
      {/* tail */}
      <motion.g style={{ originX: "88px", originY: "96px" }}
        animate={{ rotate: wag ? [0, 14, -6, 10, 0] : 0 }} transition={{ duration: 0.7 }}>
        <path d="M86 98 C112 96 116 70 104 58 C100 76 92 84 80 88 Z" fill="#ea580c" />
        <path d="M104 58 C110 66 110 76 106 82 C102 76 100 66 104 58 Z" fill="#ffffff" />
      </motion.g>
      {/* body */}
      <path d="M38 104 C34 82 44 70 60 70 C76 70 86 82 82 104 Z" fill="#f97316" />
      <path d="M50 104 C49 90 54 82 60 82 C66 82 71 90 70 104 Z" fill="#fff7ed" />
      {/* ears */}
      <motion.path d="M33 40 L38 12 L54 30 Z" fill="#ea580c" style={{ originX: "44px", originY: "34px" }} animate={ear} />
      <motion.path d="M87 40 L82 12 L66 30 Z" fill="#ea580c" style={{ originX: "76px", originY: "34px" }} animate={ear} />
      <path d="M38 34 L40 20 L48 30 Z" fill="#1f2937" opacity="0.85" />
      <path d="M82 34 L80 20 L72 30 Z" fill="#1f2937" opacity="0.85" />
      {/* head */}
      <path d="M28 44 C28 30 44 24 60 24 C76 24 92 30 92 44 C92 60 76 74 60 76 C44 74 28 60 28 44 Z" fill="#f97316" />
      <path d="M28 46 C38 50 48 58 60 74 C44 74 30 62 28 46 Z" fill="#fff7ed" />
      <path d="M92 46 C82 50 72 58 60 74 C76 74 90 62 92 46 Z" fill="#fff7ed" />
      {/* eyes (blink = squash on Y) */}
      <motion.g style={{ originY: "47px" }} animate={{ scaleY: blink ? 0.1 : 1 }} transition={{ duration: 0.09 }}>
        <ellipse cx="47" cy="47" rx="4" ry="5" fill="#111827" />
        <ellipse cx="73" cy="47" rx="4" ry="5" fill="#111827" />
        <circle cx="48.4" cy="45.4" r="1.3" fill="#ffffff" />
        <circle cx="74.4" cy="45.4" r="1.3" fill="#ffffff" />
      </motion.g>
      {/* nose + cheeks */}
      <path d="M56 62 C56 59 64 59 64 62 C64 65 60 67 60 67 C60 67 56 65 56 62 Z" fill="#111827" />
      <circle cx="40" cy="57" r="3.5" fill="#fda4af" opacity="0.6" />
      <circle cx="80" cy="57" r="3.5" fill="#fda4af" opacity="0.6" />
      {/* tiny stethoscope: CareBridge's fox */}
      <path d="M50 80 C50 92 70 92 70 80" stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="60" cy="92" r="3.2" fill="#16a34a" />
    </svg>
  );
}

export function Fox() {
  const reduced = useReducedMotion();
  const { pathname } = useLocation();
  const [blink, setBlink] = useState(false);
  const [hover, setHover] = useState(false);
  const [hop, setHop] = useState(0);
  const [tip, setTip] = useState(false);

  // Occasional blink every ~4–6 s (skipped with reduced motion).
  useEffect(() => {
    if (reduced) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 140); loop(); }, 4000 + Math.random() * 2000);
    };
    loop();
    return () => clearTimeout(t);
  }, [reduced]);

  useEffect(() => { setTip(false); }, [pathname]);

  const text = TIPS.find(([re]) => re.test(pathname))?.[1] ?? "Hi! I'm Kit, the CareBridge fox.";

  return (
    <div className="pointer-events-none fixed bottom-3 right-3 z-40 flex items-end gap-2 sm:bottom-5 sm:right-5">
      {tip ? (
        <motion.div
          key={pathname}
          initial={reduced ? { opacity: 0 } : { opacity: 0, transform: "translateY(6px) scale(0.96)" }}
          animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
          transition={reduced ? { duration: 0.15 } : SPRING}
          style={{ originX: 1, originY: 1 }}
          className="pointer-events-auto mb-14 max-w-60 rounded-2xl rounded-br-sm border border-line bg-white/90 px-3.5 py-2.5 text-sm text-ink shadow-md backdrop-blur"
          role="status"
        >
          {text}
        </motion.div>
      ) : null}
      <motion.button
        type="button"
        aria-label="Kit the CareBridge fox — show a tip"
        className="pointer-events-auto size-16 cursor-pointer sm:size-20 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-brand"
        onHoverStart={() => CAN_HOVER && setHover(true)}
        onHoverEnd={() => setHover(false)}
        onClick={() => { setTip((v) => !v); setHop((n) => n + 1); }}
        whileTap={reduced ? undefined : { transform: "scale(0.94)" }}
        animate={reduced ? {} : { transform: hop ? ["translateY(0px)", "translateY(-14px)", "translateY(0px)"] : "translateY(0px)" }}
        transition={hop ? SPRING_BOUNCY : SPRING}
        key={hop /* restart the hop on every click */}
      >
        <FoxSvg blink={blink} perk={hover && !reduced} wag={hover && !reduced} />
      </motion.button>
    </div>
  );
}
