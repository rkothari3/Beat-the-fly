/**
 * Brain-mode picker overlay.
 * Primary: Full pathway AL→MB→CX (hybrid with look-ahead).
 * Secondary: single-region ablations.
 */

import React from "react";
import { motion, useReducedMotion, type Transition, type Variants } from "motion/react";
import { RegionKey } from "../brain/LifEngine";
import { PlayMode } from "../brain/PathwayEngine";
import { REGION_STATS, PATHWAY_STATS } from "./BrainPanel";
import {
  AlCircuitSchematic,
  CxCircuitSchematic,
  MbCircuitSchematic,
  PathwayCircuitSchematic,
} from "./schematics/CircuitSchematic";

/**
 * Who decides the fly's hops.
 * "brain" = pathway hybrid (or single-region LIF ablation).
 * "bot" = look-ahead only (atlas still glows).
 */
export type FlyOpponent = "bot" | "brain";

export const PLAY_MODES: {
  key: PlayMode;
  label: string;
  short: string;
  category: string;
  blurb: string;
  hero?: boolean;
  ablation?: boolean;
}[] = [
  {
    key: "pathway",
    label: "Full pathway AL→MB→CX",
    short: "PATH",
    category: "MALECNS PATHWAY",
    blurb:
      "Soft cascade of three frozen MaleCNS regions. Live mode: pathway scores moves, look-ahead search picks the hop.",
    hero: true,
  },
  {
    key: "central_complex",
    label: "Central Complex",
    short: "CX",
    category: "ABLATION · CX ONLY",
    blurb: "Single-region LIF only (no search). Science contrast vs the full pathway.",
    ablation: true,
  },
  {
    key: "mushroom_body",
    label: "Mushroom Body",
    short: "MB",
    category: "ABLATION · MB ONLY",
    blurb: "Single-region LIF only (no search). Kenyon cells → MBONs.",
    ablation: true,
  },
  {
    key: "antennal_lobe",
    label: "Antennal Lobe",
    short: "AL",
    category: "ABLATION · AL ONLY",
    blurb: "Single-region LIF only (no search). ORN → PN smell relay.",
    ablation: true,
  },
];

/** @deprecated use PLAY_MODES — kept for stats lookups */
export const REGIONS = PLAY_MODES.filter((m) => m.key !== "pathway") as {
  key: RegionKey;
  label: string;
  short: string;
  category: string;
  blurb: string;
  hero?: boolean;
}[];

/** Why CSS vars: keep picker elevation in sync with BrainPanel / tokens. */
const SHADOW = {
  rest: "var(--shadow-card)",
  hover:
    "0 1px 0 rgba(255,255,255,0.07) inset, 0 2px 4px rgba(0,0,0,0.4), 0 14px 32px rgba(0,0,0,0.5)",
  selected: "var(--shadow-selected)",
  selectedHover:
    "0 0 0 1.5px var(--border-accent), 0 1px 0 rgba(255,255,255,0.08) inset, 0 10px 32px rgba(45,212,191,0.2), 0 18px 44px rgba(0,0,0,0.45)",
};

const SPRING: Transition = { type: "spring", stiffness: 520, damping: 36, mass: 0.7 };
const SPRING_TRANSITION: Transition = {
  ...SPRING,
  boxShadow: { duration: 0.18, ease: "easeOut" },
};
const REDUCED_TRANSITION: Transition = { duration: 0.12, ease: "easeOut" };

function cardVariants(reduce: boolean): Variants {
  const lift = (px: number) => (reduce ? 0 : px);
  return {
    rest: { y: 0, scale: 1, boxShadow: SHADOW.rest },
    selected: { y: lift(-6), scale: 1, boxShadow: SHADOW.selected },
    hover: (selected: boolean) => ({
      y: lift(selected ? -7 : -5),
      boxShadow: selected ? SHADOW.selectedHover : SHADOW.hover,
    }),
    tap: { scale: reduce ? 1 : 0.98 },
  };
}

function SchematicFor({ mode }: { mode: PlayMode }) {
  if (mode === "pathway") return <PathwayCircuitSchematic />;
  if (mode === "central_complex") return <CxCircuitSchematic compact />;
  if (mode === "mushroom_body") return <MbCircuitSchematic />;
  return <AlCircuitSchematic />;
}

function statsFor(mode: PlayMode) {
  if (mode === "pathway") return PATHWAY_STATS;
  return REGION_STATS[mode];
}

function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 28,
        height: 28,
        padding: "0 6px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-strong)",
        background: "var(--bg-elevated)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
        color: "var(--text-secondary)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {children}
    </span>
  );
}

export function RegionPicker({
  onPick,
  onSelect,
  headline,
  selected,
  opponent = "brain",
  onOpponent,
  stats = [],
}: {
  onPick: (k: PlayMode, opponent: FlyOpponent) => void;
  onSelect?: (k: PlayMode) => void;
  headline?: string;
  selected?: PlayMode;
  opponent?: FlyOpponent;
  onOpponent?: (o: FlyOpponent) => void;
  stats?: { region: string; matches: number; fly_wins: number }[];
}) {
  const reduce = useReducedMotion() ?? false;
  const variants = cardVariants(reduce);
  const current = selected ?? "pathway";
  const currentMeta = PLAY_MODES.find((r) => r.key === current)!;
  const currentOpponent = opponent;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1040,
        height: "100%",
        maxHeight: "100%",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div style={{ textAlign: "center", flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-label)",
            letterSpacing: "0.14em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          Choose the fly&apos;s brain
        </div>
        <h2
          style={{
            margin: "4px 0 4px",
            fontSize: headline && headline.length > 40 ? 20 : "var(--text-hero)",
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.25,
          }}
        >
          {headline ?? "How should the fly think?"}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--text-secondary)",
            maxWidth: 600,
            marginInline: "auto",
            lineHeight: 1.4,
          }}
        >
          Default: soft AL→MB→CX cascade of real MaleCNS wiring, with look-ahead search
          picking legal hops (Fly Chess–style hybrid). Single regions are ablations.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          flex: "1 1 auto",
          minHeight: 0,
          alignContent: "center",
        }}
      >
        {PLAY_MODES.map((r) => {
          const isSelected = r.key === current;
          const st = statsFor(r.key);
          const isPathwayCard = r.key === "pathway";
          return (
            <motion.button
              key={r.key}
              type="button"
              onClick={() => onSelect?.(r.key)}
              aria-pressed={isSelected}
              custom={isSelected}
              variants={variants}
              initial={false}
              animate={isSelected ? "selected" : "rest"}
              whileHover="hover"
              whileFocus="hover"
              whileTap="tap"
              transition={reduce ? REDUCED_TRANSITION : SPRING_TRANSITION}
              style={{
                textAlign: "left",
                padding: 12,
                borderRadius: "var(--radius-lg)",
                border: isSelected
                  ? "1px solid var(--border-accent)"
                  : "1px solid var(--border-subtle)",
                background: isSelected ? "var(--bg-elevated)" : "var(--bg-card)",
                color: "var(--text-primary)",
                cursor: "pointer",
                outline: "none",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                position: "relative",
                minHeight: 0,
                maxHeight: "100%",
                overflow: "hidden",
                gridColumn: isPathwayCard ? "1 / -1" : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    color: "var(--text-muted)",
                  }}
                >
                  {r.category}
                </div>
                {r.hero && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: "0.04em",
                      color: "var(--accent-teal)",
                      border: "1px solid rgba(45,212,191,0.4)",
                      borderRadius: "var(--radius-pill)",
                      padding: "2px 7px",
                      // Flat badge — glow reserved for the selected card only.
                    }}
                  >
                    Recommended
                  </span>
                )}
              </div>

              <div style={{ fontWeight: 700, fontSize: 16 }}>{r.label}</div>

              <div
                style={{
                  background: "var(--bg-inset)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  // Aspect matches SVG viewBox; no padding so meet never clips.
                  aspectRatio: "280 / 86",
                  width: "100%",
                  boxSizing: "border-box",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-inset)",
                  flex: "0 0 auto",
                }}
              >
                <SchematicFor mode={r.key} />
              </div>

              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--text-muted)",
                }}
              >
                {st.neurons.toLocaleString()} neurons · {st.connections.toLocaleString()}{" "}
                connections
              </div>

              <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.35 }}>
                {r.blurb}
              </div>

              <div style={{ marginTop: "auto" }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 22,
                    fontWeight: 700,
                  }}
                >
                  {st.matchPct.toFixed(1)}%
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: "var(--text-muted)",
                  }}
                >
                  {isPathwayCard ? "avg region match · + look-ahead" : "match to teacher moves"}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
        }}
      >
        {/*
          Primary path = look-ahead bot. Live brain is a labeled demo toggle —
          not a second bot-difficulty button (we deleted Strong/Hard tiers).
        */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
            maxWidth: 420,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-secondary)",
              textAlign: "center",
            }}
          >
            Fly opponent:{" "}
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {currentOpponent === "brain"
                ? current === "pathway"
                  ? "Pathway hybrid (LIF + search)"
                  : "Ablation LIF (no search)"
                : "Look-ahead only"}
            </span>
          </div>
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-muted)",
              lineHeight: 1.35,
              textAlign: "left",
              background: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              padding: "8px 12px",
            }}
          >
            <input
              type="checkbox"
              checked={currentOpponent === "brain"}
              onChange={(e) => onOpponent?.(e.target.checked ? "brain" : "bot")}
              style={{ marginTop: 2, accentColor: "var(--accent-teal)" }}
              aria-describedby="live-brain-hint"
            />
            <span>
              <span style={{ color: "var(--text-secondary)" }}>
                Demo mode: Live connectome in the loop
              </span>
              <br />
              <span id="live-brain-hint">
                Pathway scores hops, then look-ahead picks a legal move. Uncheck for pure
                look-ahead (still strong).
              </span>
            </span>
          </label>
        </div>

        <motion.button
          type="button"
          onClick={() => onPick(current, currentOpponent)}
          whileHover={reduce ? undefined : { scale: 1.02 }}
          whileTap={reduce ? undefined : { scale: 0.98 }}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: "#052e28",
            background: "var(--accent-teal)",
            border: "none",
            borderRadius: "var(--radius-pill)",
            padding: "11px 28px",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(45,212,191,0.25), 0 2px 6px rgba(0,0,0,0.4)",
          }}
        >
          Start round · {currentMeta.label}
          {currentOpponent === "brain"
            ? current === "pathway"
              ? " · Pathway hybrid"
              : " · Ablation LIF"
            : " · Look-ahead fly"}
        </motion.button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-secondary)",
          }}
        >
          {/* No ↓ — hop-back is disabled; only forward / left / right. */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, auto)", gap: 4, justifyItems: "center" }}>
            <span style={{ gridColumn: 2 }}>
              <Keycap>↑</Keycap>
            </span>
            <Keycap>←</Keycap>
            <span />
            <Keycap>→</Keycap>
          </div>
          <span>to hop · no back · outscore the fly in 45 s</span>
        </div>

        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-muted)",
            textAlign: "center",
          }}
        >
          Soft AL→MB→CX cascade of frozen MaleCNS regions (+ look-ahead). Single
          cards are ablations — one region LIF, no search.
        </p>
      </div>

      {/* Today strip — pinned bottom of overlay stack */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "8px 14px",
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--text-secondary)",
          boxShadow: "var(--shadow-card)",
          flexShrink: 0,
          marginTop: "auto",
        }}
      >
        <span style={{ letterSpacing: "0.12em", color: "var(--text-muted)" }}>TODAY</span>
        <div style={{ flex: 1, display: "flex", gap: 12, flexWrap: "wrap" }}>
          {REGIONS.map((r) => {
            const s = stats.find((x) => x.region === r.key || x.region === r.short);
            const matches = s?.matches ?? 0;
            const flyWins = s?.fly_wins ?? 0;
            return (
              <span key={r.key}>
                {r.label} {matches} · fly won {flyWins}
              </span>
            );
          })}
          {stats.length === 0 && (
            <span style={{ color: "var(--text-muted)" }}>no matches logged yet</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 12, marginLeft: "auto" }}>
          <span style={{ color: "var(--text-muted)" }}>match log</span>
          <span style={{ color: "var(--text-muted)" }}>Tiger Data</span>
        </div>
      </div>
    </div>
  );
}
