/**
 * Flat anatomical CX circuit: addressable dots as data (not a 3D brain mesh).
 * Layout mirrors prompt_3: Ring circle → PFN handlebar → PFL columns + relay arch.
 */

export type DotGroup = "ring" | "pfn" | "pfl" | "relay";

export interface CircuitDot {
  id: string;
  group: DotGroup;
  x: number;
  y: number;
  /** 0–1 activity for live spike highlight; undefined = idle dim */
  activity?: number;
}

function ringDots(cx: number, cy: number, r: number, n: number, prefix: string): CircuitDot[] {
  const out: CircuitDot[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    out.push({
      id: `${prefix}-${i}`,
      group: "ring",
      x: cx + Math.cos(a) * r,
      y: cy + Math.sin(a) * r,
    });
  }
  return out;
}

/** PFN “handlebar”: arched columns of dots. */
function pfnHandlebar(
  cx: number,
  cy: number,
  width: number,
  cols: number,
  rows: number,
): CircuitDot[] {
  const out: CircuitDot[] = [];
  for (let c = 0; c < cols; c++) {
    const t = cols === 1 ? 0.5 : c / (cols - 1);
    const x = cx - width / 2 + t * width;
    // Slight upward arch in the middle
    const arch = -Math.sin(t * Math.PI) * 18;
    for (let r = 0; r < rows; r++) {
      out.push({
        id: `pfn-${c}-${r}`,
        group: "pfn",
        x: x + (r % 2) * 1.2,
        y: cy + arch + r * 4.2,
      });
    }
  }
  return out;
}

function pflColumns(x0: number, y0: number, cols: number, rows: number): CircuitDot[] {
  const out: CircuitDot[] = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r++) {
      out.push({
        id: `pfl-${c}-${r}`,
        group: "pfl",
        x: x0 + c * 10,
        y: y0 + r * 4.5,
      });
    }
  }
  return out;
}

function relayArch(cx: number, cy: number, width: number, n: number): CircuitDot[] {
  const out: CircuitDot[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = cx - width / 2 + t * width;
    const y = cy - Math.sin(t * Math.PI) * 22;
    out.push({ id: `relay-${i}`, group: "relay", x, y });
  }
  // Second faint row
  for (let i = 0; i < Math.floor(n * 0.7); i++) {
    const t = i / (Math.floor(n * 0.7) - 1);
    const x = cx - width / 2.4 + t * (width * 0.85);
    const y = cy + 8 - Math.sin(t * Math.PI) * 14;
    out.push({ id: `relay-b-${i}`, group: "relay", x, y });
  }
  return out;
}

/** Static CX layout used by BrainPanel + picker mini-schematic. */
export function buildCxCircuitDots(): CircuitDot[] {
  return [
    ...ringDots(72, 118, 38, 36, "ring"),
    ...pfnHandlebar(160, 42, 110, 14, 5),
    ...pflColumns(248, 88, 2, 14),
    ...relayArch(160, 100, 90, 28),
  ];
}

export const STAGE_COLOR: Record<DotGroup, string> = {
  ring: "var(--ring)",
  pfn: "var(--pfn)",
  pfl: "var(--pfl)",
  relay: "var(--relay)",
};

/** Apply live stage spike intensity to a fraction of each group’s dots. */
export function withSpikeActivity(
  dots: CircuitDot[],
  stageSpikes: Record<string, number> | undefined,
): CircuitDot[] {
  if (!stageSpikes) return dots;
  const totals: Record<string, number> = { ring: 0, pfn: 0, pfl: 0 };
  for (const d of dots) {
    if (d.group in totals) totals[d.group]++;
  }
  const lit = (group: string, spikes: number) => {
    const n = totals[group] || 1;
    // Map spike count → how many dots glow (capped).
    return Math.min(n, Math.max(0, Math.round(spikes / 8)));
  };
  const budget = {
    ring: lit("ring", stageSpikes.ring ?? 0),
    pfn: lit("pfn", stageSpikes.pfn ?? 0),
    pfl: lit("pfl", stageSpikes.pfl ?? 0),
  };
  const used = { ring: 0, pfn: 0, pfl: 0 };
  return dots.map((d) => {
    if (d.group === "relay") return d;
    const g = d.group as "ring" | "pfn" | "pfl";
    const on = used[g] < budget[g];
    if (on) used[g]++;
    return { ...d, activity: on ? 1 : 0 };
  });
}
