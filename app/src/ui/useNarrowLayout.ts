/**
 * Shared layout breakpoint for Beat the Fly.
 *
 * Why 900px: desktop chrome is a 2/3 + 1/3 side-by-side match. Below ~900px
 * that third column starves each game half. One hook keeps TopBar, match
 * shell, home, and brain panel flipping together — no mismatched "half mobile".
 */
import { useEffect, useState } from "react";

export const NARROW_LAYOUT_MQ = "(max-width: 899px)";

export function useNarrowLayout(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(NARROW_LAYOUT_MQ).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(NARROW_LAYOUT_MQ);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return narrow;
}
