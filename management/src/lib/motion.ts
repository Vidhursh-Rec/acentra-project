// Motion presets (apple-design + emil-design-eng): critically-damped springs by default,
// full transform strings (GPU, not main-thread x/y shorthands), bounce only after a user action,
// hover only on real pointers, cross-fades when the user prefers reduced motion.
import type { Transition, Variants } from "motion/react";

/** Default UI spring: damping 1.0 (no overshoot), response ~0.35 s. */
export const SPRING: Transition = { type: "spring", bounce: 0, duration: 0.35 };
/** Only after a user action that carries intent (e.g. clicking the fox). */
export const SPRING_BOUNCY: Transition = { type: "spring", bounce: 0.35, duration: 0.45 };

/** True on devices with a real hover pointer (mouse/trackpad). Taps on touch screens are not hovers. */
export const CAN_HOVER =
  typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

/** Container that staggers its children's entrance (capped so long grids don't drag). */
export function stagger(count: number, reduced: boolean | null): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : Math.min(0.035, 0.4 / Math.max(count, 1)) } },
  };
}

/** Child: fade + rise 8 px (or a plain fade with reduced motion). */
export function rise(reduced: boolean | null): Variants {
  return reduced
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2 } } }
    : {
        hidden: { opacity: 0, transform: "translateY(8px)" },
        show: { opacity: 1, transform: "translateY(0px)", transition: SPRING },
      };
}

const PRESS: Transition = { type: "spring", bounce: 0, duration: 0.2 };

/** Press feedback on pointer-down (everywhere); lift on hover only with a real pointer. */
export const PRESSABLE = {
  ...(CAN_HOVER ? { whileHover: { transform: "translateY(-2px)" } } : {}),
  whileTap: { transform: "scale(0.98)" },
  transition: PRESS,
};

/** Hover lift only (cards that aren't pressable). */
export const LIFT = CAN_HOVER ? { whileHover: { transform: "translateY(-2px)" }, transition: PRESS } : {};
