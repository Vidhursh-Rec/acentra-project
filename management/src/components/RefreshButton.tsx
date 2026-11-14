// Refresh with feedback: the icon turns once on every click, so the click is acknowledged even when the
// data comes back instantly. With Reduce Motion the icon dims briefly instead of turning.
import { RefreshCw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function RefreshButton({ onRefresh }: { onRefresh: () => void }) {
  const reduced = useReducedMotion();
  const [turns, setTurns] = useState(0);
  return (
    <Button variant="outline" className="self-start rounded-full sm:self-auto"
      onClick={() => { setTurns((t) => t + 1); onRefresh(); }}>
      <motion.span className="inline-flex"
        animate={reduced ? { opacity: turns ? [0.4, 1] : 1 } : { transform: `rotate(${turns * 360}deg)` }}
        transition={reduced ? { duration: 0.3 } : { type: "spring", bounce: 0, duration: 0.6 }}
        key={reduced ? turns : undefined}>
        <RefreshCw />
      </motion.span>
      Refresh
    </Button>
  );
}
