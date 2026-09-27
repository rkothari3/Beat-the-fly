/**
 * SVG diagrams for each Learn curriculum beat.
 * Match existing CSS vars (teal / ring / pfn / muted) — no purple-AI look.
 */

import React from "react";

const mono = "var(--font-mono)";
const muted = "var(--text-muted)";
const secondary = "var(--text-secondary)";
const primary = "var(--text-primary)";
const teal = "var(--accent-teal)";
const ring = "var(--ring)";
const pfn = "var(--pfn)";
const pfl = "var(--pfl)";
const inset = "var(--bg-inset)";
const border = "var(--border-subtle)";

function Frame({
  children,
  viewBox = "0 0 320 140",
  label,
}: {
  children: React.ReactNode;
  viewBox?: string;
  label: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      width="100%"
      height="100%"
      role="img"
      aria-label={label}
      style={{ display: "block", background: inset, borderRadius: "var(--radius-md)" }}
    >
      <rect x="0" y="0" width="100%" height="100%" fill={inset} />
      {children}
    </svg>
  );
}

function Box({
  x,
  y,
  w,
  h,
  fill,
  stroke,
  label,
  sub,
  locked,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  stroke: string;
  label: string;
  sub?: string;
  locked?: boolean;
}) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={6} fill={fill} stroke={stroke} strokeWidth={1.25} />
      {locked ? (
        <text x={x + w - 8} y={y + 12} textAnchor="end" fill={teal} fontSize={8} fontFamily={mono}>
          lock
        </text>
      ) : null}
      <text
        x={x + w / 2}
        y={y + h / 2 - (sub ? 4 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={primary}
        fontSize={10}
        fontFamily={mono}
        fontWeight={600}
      >
        {label}
      </text>
      {sub ? (
        <text
          x={x + w / 2}
          y={y + h / 2 + 10}
          textAnchor="middle"
          fill={muted}
          fontSize={8}
          fontFamily={mono}
        >
          {sub}
        </text>
      ) : null}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g aria-hidden>
      <line
        x1={x1}
        y1={y1}
        x2={x2 - 4}
        y2={y2}
        stroke="rgba(148,163,184,0.5)"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path
        d={`M ${x2 - 7} ${y2 - 3.5} L ${x2} ${y2} L ${x2 - 7} ${y2 + 3.5}`}
        fill="none"
        stroke="rgba(148,163,184,0.55)"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}

/** Beat 1 — freeze wiring, train thin adapters. */
export function RecipeDiagram() {
  return (
    <Frame label="Frozen MaleCNS wiring with thin encoder and decoder">
      <Box x={8} y={42} w={70} h={56} fill="#121820" stroke={teal} label="MaleCNS W" sub="frozen" locked />
      <Arrow x1={82} y1={70} x2={98} y2={70} />
      <Box x={98} y={48} w={48} h={44} fill="#151a23" stroke={border} label="enc" sub="tiny" />
      <Arrow x1={150} y1={70} x2={166} y2={70} />
      <Box x={166} y={42} w={52} h={56} fill="#121820" stroke={pfn} label="LIF" sub="spikes" />
      <Arrow x1={222} y1={70} x2={238} y2={70} />
      <Box x={238} y={48} w={48} h={44} fill="#151a23" stroke={border} label="dec" sub="tiny" />
      <Arrow x1={290} y1={70} x2={306} y2={70} />
      <text x={312} y={74} fill={teal} fontSize={10} fontFamily={mono} fontWeight={700}>
        hops
      </text>
      <text x={160} y={22} textAnchor="middle" fill={muted} fontSize={9} fontFamily={mono}>
        train edges only · middle stays biology
      </text>
    </Frame>
  );
}

/** Beat 2 — AL/MB/CX lit on a simple brain silhouette. */
export function WhyThreeDiagram() {
  return (
    <Frame label="Three lit regions on a dim brain outline">
      {/* Dim whole-brain blob */}
      <ellipse cx={110} cy={72} rx={78} ry={48} fill="#0f131a" stroke={border} strokeWidth={1.2} />
      <ellipse cx={110} cy={72} rx={78} ry={48} fill="rgba(95,111,134,0.12)" />
      {/* Lit regions */}
      <ellipse cx={68} cy={78} rx={22} ry={16} fill="rgba(45,212,191,0.35)" stroke={ring} strokeWidth={1.5} />
      <ellipse cx={110} cy={58} rx={24} ry={18} fill="rgba(91,156,245,0.35)" stroke={pfn} strokeWidth={1.5} />
      <ellipse cx={150} cy={80} rx={20} ry={15} fill="rgba(248,113,113,0.3)" stroke={pfl} strokeWidth={1.5} />
      <text x={68} y={82} textAnchor="middle" fill={primary} fontSize={10} fontFamily={mono} fontWeight={700}>
        AL
      </text>
      <text x={110} y={62} textAnchor="middle" fill={primary} fontSize={10} fontFamily={mono} fontWeight={700}>
        MB
      </text>
      <text x={150} y={84} textAnchor="middle" fill={primary} fontSize={10} fontFamily={mono} fontWeight={700}>
        CX
      </text>
      {/* Legend flow */}
      <text x={220} y={40} fill={ring} fontSize={10} fontFamily={mono} fontWeight={600}>
        sense
      </text>
      <text x={232} y={56} fill={muted} fontSize={9} fontFamily={mono}>
        ↓
      </text>
      <text x={214} y={72} fill={pfn} fontSize={10} fontFamily={mono} fontWeight={600}>
        memory
      </text>
      <text x={232} y={88} fill={muted} fontSize={9} fontFamily={mono}>
        ↓
      </text>
      <text x={218} y={104} fill={pfl} fontSize={10} fontFamily={mono} fontWeight={600}>
        steer
      </text>
      <text x={110} y={132} textAnchor="middle" fill={muted} fontSize={8} fontFamily={mono}>
        rest of MaleCNS stays dim on purpose
      </text>
    </Frame>
  );
}

/** Beat 3 — soft cascade → bars → brain-heavy search → badge. */
export function CascadeSearchDiagram() {
  const barH = [28, 48, 18, 34];
  const labels = ["↑", "←", "→", "·"];
  return (
    <Frame label="Soft cascade into brain-weighted look-ahead search">
      <text x={36} y={28} textAnchor="middle" fill={ring} fontSize={10} fontFamily={mono} fontWeight={700}>
        AL
      </text>
      <Arrow x1={50} y1={24} x2={72} y2={24} />
      <text x={90} y={28} textAnchor="middle" fill={pfn} fontSize={10} fontFamily={mono} fontWeight={700}>
        MB
      </text>
      <Arrow x1={104} y1={24} x2={126} y2={24} />
      <text x={144} y={28} textAnchor="middle" fill={pfl} fontSize={10} fontFamily={mono} fontWeight={700}>
        CX
      </text>
      <Arrow x1={158} y1={24} x2={178} y2={24} />
      <text x={210} y={28} textAnchor="middle" fill={secondary} fontSize={9} fontFamily={mono}>
        bars = brain
      </text>

      {barH.map((h, i) => {
        const x = 178 + i * 22;
        const y = 110 - h;
        const chosen = i === 1;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={14}
              height={h}
              rx={2}
              fill={chosen ? teal : "rgba(91,156,245,0.45)"}
            />
            <text x={x + 7} y={122} textAnchor="middle" fill={muted} fontSize={9} fontFamily={mono}>
              {labels[i]}
            </text>
          </g>
        );
      })}

      <Arrow x1={268} y1={70} x2={288} y2={70} />
      <rect x={290} y={52} width={22} height={36} rx={11} fill="rgba(45,212,191,0.2)" stroke={teal} strokeWidth={1.5} />
      <text x={301} y={74} textAnchor="middle" fill={teal} fontSize={11} fontFamily={mono} fontWeight={700}>
        ←
      </text>
      <text x={160} y={138} textAnchor="middle" fill={muted} fontSize={8} fontFamily={mono}>
        priorStrength 10 · badge = acted
      </text>
    </Frame>
  );
}

/** Beat 4 — intact vs shuffled accuracy bars. */
export function ProofWiringDiagram() {
  return (
    <Frame label="Intact wiring accuracy versus shuffled collapse">
      <text x={90} y={24} textAnchor="middle" fill={secondary} fontSize={10} fontFamily={mono}>
        Intact W
      </text>
      <text x={230} y={24} textAnchor="middle" fill={secondary} fontSize={10} fontFamily={mono}>
        Shuffled W
      </text>
      {/* Intact tall bar */}
      <rect x={55} y={36} width={70} height={78} rx={6} fill="rgba(45,212,191,0.25)" stroke={teal} strokeWidth={1.5} />
      <text x={90} y={78} textAnchor="middle" fill={teal} fontSize={22} fontFamily={mono} fontWeight={700}>
        ~95%
      </text>
      <text x={90} y={98} textAnchor="middle" fill={muted} fontSize={8} fontFamily={mono}>
        teacher match
      </text>
      {/* Shuffled tiny bar */}
      <rect x={195} y={92} width={70} height={22} rx={6} fill="rgba(248,113,113,0.2)" stroke={pfl} strokeWidth={1.5} />
      <text x={230} y={108} textAnchor="middle" fill={pfl} fontSize={16} fontFamily={mono} fontWeight={700}>
        ~10%
      </text>
      <text x={160} y={132} textAnchor="middle" fill={muted} fontSize={8} fontFamily={mono}>
        same train recipe · only W changes
      </text>
    </Frame>
  );
}

/** Beat 5 — three why-map columns. */
export function WhyMapDiagram() {
  const cols: { title: string; line: string; color: string }[] = [
    { title: "Discover", line: "which circuits\ndo which jobs", color: ring },
    { title: "Inspire AI", line: "compact, inspectable\ncontrollers", color: pfn },
    { title: "Medicine", line: "disease & repair\npaths later", color: teal },
  ];
  return (
    <Frame label="Three reasons to map brains">
      {cols.map((c, i) => {
        const x = 18 + i * 102;
        return (
          <g key={c.title}>
            <rect
              x={x}
              y={28}
              width={90}
              height={84}
              rx={8}
              fill="#121820"
              stroke={c.color}
              strokeWidth={1.25}
            />
            <circle cx={x + 45} cy={48} r={10} fill="rgba(45,212,191,0.12)" stroke={c.color} strokeWidth={1.25} />
            <text
              x={x + 45}
              y={52}
              textAnchor="middle"
              fill={c.color}
              fontSize={11}
              fontFamily={mono}
              fontWeight={700}
            >
              {i + 1}
            </text>
            <text
              x={x + 45}
              y={74}
              textAnchor="middle"
              fill={primary}
              fontSize={11}
              fontFamily={mono}
              fontWeight={700}
            >
              {c.title}
            </text>
            {c.line.split("\n").map((ln, li) => (
              <text
                key={li}
                x={x + 45}
                y={90 + li * 12}
                textAnchor="middle"
                fill={muted}
                fontSize={8}
                fontFamily={mono}
              >
                {ln}
              </text>
            ))}
          </g>
        );
      })}
    </Frame>
  );
}
