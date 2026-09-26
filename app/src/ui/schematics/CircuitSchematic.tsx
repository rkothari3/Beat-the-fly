import React, { useMemo } from "react";
import {
  CircuitDot,
  DotGroup,
  STAGE_COLOR,
  buildCxCircuitDots,
  withSpikeActivity,
} from "./cxCircuit";

/**
 * Picker-card circuit diagrams — one job: show the region's cell pipeline
 * (Ring→PFN→PFL, KC→MBON, ORN→PN) as a tiny readable flow. Not anatomy.
 * Fixed 280×86 viewBox with margins so labels never clip in the card slot.
 */

const VIEW_W = 280;
const VIEW_H = 86;

const GROUP_LABELS: {
  group: DotGroup;
  title: string;
  lines: string[];
  anchor: { x: number; y: number; align: "start" | "middle" | "end" };
}[] = [
  {
    group: "ring",
    title: "Ring neurons",
    lines: ["fly: heading & landmarks", "here: lane-danger input"],
    anchor: { x: 8, y: 156, align: "start" },
  },
  {
    group: "pfn",
    title: "PFN cells",
    lines: ["fly: combine heading + self-motion"],
    anchor: { x: 160, y: 12, align: "middle" },
  },
  {
    group: "pfl",
    title: "PFL neurons",
    lines: ["fly: steering command out"],
    anchor: { x: 292, y: 156, align: "end" },
  },
  {
    group: "relay",
    title: "other CX relay cells · 2,136",
    lines: [],
    anchor: { x: 160, y: 124, align: "middle" },
  },
];

function FlowArrow({ x1, x2, y }: { x1: number; x2: number; y: number }) {
  const mid = (x1 + x2) / 2;
  return (
    <g aria-hidden>
      <line
        x1={x1}
        y1={y}
        x2={x2 - 5}
        y2={y}
        stroke="rgba(148,163,184,0.45)"
        strokeWidth={1.25}
        strokeLinecap="round"
      />
      <path
        d={`M ${x2 - 7} ${y - 3.5} L ${x2} ${y} L ${x2 - 7} ${y + 3.5}`}
        fill="none"
        stroke="rgba(148,163,184,0.55)"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={mid} cy={y} r={1.2} fill="rgba(148,163,184,0.35)" />
    </g>
  );
}

function StageLabel({
  x,
  y,
  color,
  children,
}: {
  x: number;
  y: number;
  color: string;
  children: string;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill={color}
      fontSize={9}
      fontFamily="var(--font-mono)"
      fontWeight={600}
      letterSpacing="0.04em"
    >
      {children}
    </text>
  );
}

/** Compact CX for picker: three stages in a clear left→right flow. */
function CxCompactFlow() {
  const ring: { x: number; y: number }[] = [];
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 - Math.PI / 2;
    ring.push({ x: 42 + Math.cos(a) * 16, y: 36 + Math.sin(a) * 16 });
  }
  const pfn: { x: number; y: number }[] = [];
  for (let c = 0; c < 7; c++) {
    for (let r = 0; r < 4; r++) {
      pfn.push({ x: 108 + c * 5.2, y: 24 + r * 6 + (c % 2) * 2 });
    }
  }
  const pfl: { x: number; y: number }[] = [];
  for (let c = 0; c < 3; c++) {
    for (let r = 0; r < 6; r++) {
      pfl.push({ x: 192 + c * 6.5, y: 22 + r * 5.2 });
    }
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Central Complex circuit: Ring to PFN to PFL"
      style={{ display: "block" }}
    >
      <FlowArrow x1={64} x2={100} y={36} />
      <FlowArrow x1={150} x2={184} y={36} />

      {ring.map((p, i) => (
        <circle key={`r${i}`} cx={p.x} cy={p.y} r={2} fill="var(--ring)" opacity={0.9} />
      ))}
      {pfn.map((p, i) => (
        <circle key={`p${i}`} cx={p.x} cy={p.y} r={1.7} fill="var(--pfn)" opacity={0.9} />
      ))}
      {pfl.map((p, i) => (
        <circle key={`f${i}`} cx={p.x} cy={p.y} r={1.8} fill="var(--pfl)" opacity={0.92} />
      ))}

      <StageLabel x={42} y={76} color="var(--ring)">
        Ring
      </StageLabel>
      <StageLabel x={126} y={76} color="var(--pfn)">
        PFN
      </StageLabel>
      <StageLabel x={205} y={76} color="var(--pfl)">
        PFL
      </StageLabel>
    </svg>
  );
}

export function CxCircuitSchematic({
  stageSpikes,
  compact = false,
  panel = false,
}: {
  stageSpikes?: Record<string, number>;
  /** Picker-card mini diagram */
  compact?: boolean;
  /** Brain-panel stage: fill parent height so flex can shrink it */
  panel?: boolean;
}) {
  const dots = useMemo(() => {
    const base = buildCxCircuitDots();
    return withSpikeActivity(base, stageSpikes);
  }, [stageSpikes]);

  if (compact) {
    return <CxCompactFlow />;
  }

  const viewH = 178;

  return (
    <svg
      width="100%"
      height={panel ? "100%" : undefined}
      viewBox={`0 0 300 ${viewH}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Flat Central Complex circuit: ring, PFN, PFL, relay"
      style={{ display: "block", maxHeight: panel ? "100%" : undefined }}
    >
      <path
        d="M 95 95 C 120 70, 130 55, 145 50"
        fill="none"
        stroke="rgba(148,163,184,0.28)"
        strokeWidth={1}
      />
      <path
        d="M 175 55 C 200 70, 220 90, 245 105"
        fill="none"
        stroke="rgba(148,163,184,0.28)"
        strokeWidth={1}
      />
      <path
        d="M 100 125 C 140 110, 200 110, 245 120"
        fill="none"
        stroke="rgba(148,163,184,0.18)"
        strokeWidth={1}
      />

      {dots.map((d) => (
        <Dot key={d.id} d={d} />
      ))}

      {GROUP_LABELS.map((g) => (
        <g key={g.group}>
          <text
            x={g.anchor.x}
            y={g.anchor.y}
            textAnchor={g.anchor.align}
            fill={g.group === "relay" ? "var(--text-muted)" : STAGE_COLOR[g.group]}
            fontSize={panel ? 8 : 9}
            fontFamily="var(--font-mono)"
            fontWeight={600}
          >
            {g.title}
          </text>
          {(panel ? g.lines.slice(0, 1) : g.lines).map((line) => (
            <text
              key={line}
              x={g.anchor.x}
              y={g.anchor.y + 11}
              textAnchor={g.anchor.align}
              fill="var(--text-muted)"
              fontSize={panel ? 7 : 8}
              fontFamily="var(--font-mono)"
            >
              {line}
            </text>
          ))}
        </g>
      ))}
    </svg>
  );
}

function Dot({ d }: { d: CircuitDot }) {
  const on = (d.activity ?? 0) > 0.5;
  const idle = d.group === "relay";
  const fill = idle
    ? "var(--relay)"
    : on
      ? STAGE_COLOR[d.group]
      : "rgba(100,116,139,0.55)";
  return (
    <circle
      cx={d.x}
      cy={d.y}
      r={on ? 2.4 : idle ? 1.2 : 1.6}
      fill={fill}
      opacity={idle ? 0.45 : on ? 1 : 0.55}
    />
  );
}

/** Soft AL → MB → CX strip for the pathway picker card. */
export function PathwayCircuitSchematic() {
  const al: { x: number; y: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    al.push({ x: 36 + Math.cos(a) * 12, y: 36 + Math.sin(a) * 12 });
  }
  const mb: { x: number; y: number }[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6; c++) {
      mb.push({ x: 100 + c * 6, y: 24 + r * 6 });
    }
  }
  const cx: { x: number; y: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    cx.push({ x: 210 + Math.cos(a) * 14, y: 36 + Math.sin(a) * 14 });
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Pathway: Antennal Lobe to Mushroom Body to Central Complex"
      style={{ display: "block" }}
    >
      <FlowArrow x1={54} x2={94} y={36} />
      <FlowArrow x1={142} x2={188} y={36} />
      {al.map((p, i) => (
        <circle key={`a${i}`} cx={p.x} cy={p.y} r={1.8} fill="var(--ring)" opacity={0.9} />
      ))}
      {mb.map((p, i) => (
        <circle key={`m${i}`} cx={p.x} cy={p.y} r={1.7} fill="var(--pfn)" opacity={0.9} />
      ))}
      {cx.map((p, i) => (
        <circle key={`c${i}`} cx={p.x} cy={p.y} r={1.9} fill="#73ebff" opacity={0.95} />
      ))}
      <StageLabel x={36} y={76} color="var(--ring)">
        AL
      </StageLabel>
      <StageLabel x={118} y={76} color="var(--pfn)">
        MB
      </StageLabel>
      <StageLabel x={210} y={76} color="#73ebff">
        CX
      </StageLabel>
    </svg>
  );
}

/** Kenyon cells → MBONs — associative memory pipeline. */
export function MbCircuitSchematic() {
  const kc: { x: number; y: number }[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 11; c++) {
      kc.push({ x: 24 + c * 7, y: 20 + r * 7 });
    }
  }
  const mbons: { x: number; y: number }[] = [];
  for (let i = 0; i < 8; i++) {
    mbons.push({ x: 176 + (i % 4) * 11, y: 26 + Math.floor(i / 4) * 14 });
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Mushroom Body circuit: Kenyon cells to MBONs"
      style={{ display: "block" }}
    >
      <FlowArrow x1={108} x2={166} y={36} />

      {kc.map((p, i) => (
        <circle key={`k${i}`} cx={p.x} cy={p.y} r={1.9} fill="var(--pfn)" opacity={0.88} />
      ))}
      {mbons.map((p, i) => (
        <circle key={`m${i}`} cx={p.x} cy={p.y} r={2.5} fill="var(--pfl)" opacity={0.95} />
      ))}

      <StageLabel x={60} y={76} color="var(--pfn)">
        Kenyon cells
      </StageLabel>
      <StageLabel x={198} y={76} color="var(--pfl)">
        MBONs
      </StageLabel>
    </svg>
  );
}

/** ORNs → PNs — smell relay. */
export function AlCircuitSchematic() {
  const ornClusters = [
    { cx: 34, cy: 32, color: "var(--ring)", n: 11 },
    { cx: 62, cy: 26, color: "var(--pfn)", n: 10 },
    { cx: 36, cy: 54, color: "var(--accent-fly)", n: 10 },
    { cx: 64, cy: 50, color: "#68d391", n: 10 },
  ];
  const orns: { x: number; y: number; color: string }[] = [];
  ornClusters.forEach((cl) => {
    for (let i = 0; i < cl.n; i++) {
      const a = (i / cl.n) * Math.PI * 2;
      const r = 6.5 + (i % 3) * 2;
      orns.push({
        x: cl.cx + Math.cos(a) * r,
        y: cl.cy + Math.sin(a) * r,
        color: cl.color,
      });
    }
  });
  const pns: { x: number; y: number; color: string }[] = [];
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    const r = 9 + (i % 4) * 2.2;
    pns.push({
      x: 196 + Math.cos(a) * r,
      y: 38 + Math.sin(a) * r,
      color: i % 2 ? "var(--pfn)" : "var(--pfl)",
    });
  }

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Antennal Lobe circuit: ORNs to PNs"
      style={{ display: "block" }}
    >
      <FlowArrow x1={84} x2={172} y={38} />

      {orns.map((p, i) => (
        <circle key={`o${i}`} cx={p.x} cy={p.y} r={1.8} fill={p.color} opacity={0.9} />
      ))}
      {pns.map((p, i) => (
        <circle key={`n${i}`} cx={p.x} cy={p.y} r={1.9} fill={p.color} opacity={0.92} />
      ))}

      <StageLabel x={50} y={76} color="var(--text-secondary)">
        ORNs
      </StageLabel>
      <StageLabel x={196} y={76} color="var(--text-secondary)">
        PNs
      </StageLabel>
    </svg>
  );
}

/** Tiny whole-brain outline with CX highlighted (legacy; WHERE IT LIVES stills preferred). */
export function WhereItLivesSvg({ compact = false }: { compact?: boolean }) {
  const viewH = compact ? 72 : 90;
  return (
    <svg
      width="100%"
      viewBox={`0 0 160 ${viewH}`}
      aria-label="Central Complex location in fly brain"
      style={{ display: "block" }}
    >
      <ellipse
        cx={38}
        cy={compact ? 34 : 44}
        rx={28}
        ry={compact ? 22 : 26}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={1.2}
      />
      <ellipse
        cx={122}
        cy={compact ? 34 : 44}
        rx={28}
        ry={compact ? 22 : 26}
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={1.2}
      />
      <path
        d={
          compact
            ? "M52 22 C60 12, 100 12, 108 22 C112 30, 110 44, 100 50 C90 55, 70 55, 60 50 C50 44, 48 30, 52 22 Z"
            : "M52 30 C60 18, 100 18, 108 30 C112 40, 110 58, 100 64 C90 70, 70 70, 60 64 C50 58, 48 40, 52 30 Z"
        }
        fill="none"
        stroke="var(--text-muted)"
        strokeWidth={1.2}
      />
      <ellipse
        cx={80}
        cy={compact ? 34 : 42}
        rx={12}
        ry={compact ? 14 : 18}
        fill="var(--accent-teal)"
        opacity={0.9}
      />
      <text
        x={80}
        y={compact ? 68 : 86}
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize={7}
        fontFamily="var(--font-mono)"
      >
        grey = not simulated
      </text>
    </svg>
  );
}
