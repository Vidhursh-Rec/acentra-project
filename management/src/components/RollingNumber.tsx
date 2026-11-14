// A number that rolls like a meter when its value changes (up = rolls up, down = rolls down), so a count
// that changes on the 30 s refresh is noticed instead of silently swapped. No motion on first render.
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRef } from "react";

const ROLL = { type: "spring", bounce: 0, duration: 0.35 } as const;

export function RollingNumber({ value, className }: { value: number; className?: string }) {
  const reduced = useReducedMotion();
  const prev = useRef(value);
  const dir = value >= prev.current ? 1 : -1;
  if (prev.current !== value) prev.current = value;

  return (
    <span className={`relative inline-flex overflow-hidden tabular-nums ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span
          key={value}
          custom={dir}
          variants={{
            enter: (d: number) => (reduced ? { opacity: 0 } : { opacity: 0, transform: `translateY(${d * 60}%)`, filter: "blur(2px)" }),
            center: { opacity: 1, transform: "translateY(0%)", filter: "blur(0px)" },
            exit: (d: number) => (reduced ? { opacity: 0 } : { opacity: 0, transform: `translateY(${d * -60}%)`, filter: "blur(2px)" }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={reduced ? { duration: 0.2 } : ROLL}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
