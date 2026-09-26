/**
 * Brain-region picker overlay (prompt_2).
 * Full-bleed centered cards over dimmed match — not a side panel.
 * Selection → Start round keeps the existing onPick → startRound flow.
 */

import React from "react";
import { motion, useReducedMotion, type Transition, type Variants } from "motion/react";
import { RegionKey } from "../brain/LifEngine";
import { REGION_STATS } from "./BrainPanel";
import {
  AlCircuitSchematic,
  CxCircuitSchematic,
  MbCircuitSchematic,
} from "./schematics/CircuitSchematic";

/**
 * Who decides the fly's hops.
 * Default "bot" = one look-ahead scripted opponent (no Strong/Hard picker).
 * Optional "brain" = live region LIF for the science demo (often easier to beat).
 */
export type FlyOpponent = "bot" | "brain";

export const REGIONS: {
  key: RegionKey;
  label: string;
  short: string;
  category: string;
  blurb: string;
  hero?: boolean;
}[] = [
  {
    key: "central_complex",
    label: "Central Complex",
    short: "CX",
    category: "NAVIGATION & STEERING",
    blurb: "Real navigation/steering center. Ring → PFN → PFL pipeline on frozen MaleCNS wiring.",
    hero: true,
  },
  {
    key: "mushroom_body",
    label: "Mushroom Body",
    short: "MB",
    category: "LEARNING & MEMORY",
    blurb: "Real learning/memory center. Kenyon cells → MBONs — associative pathways.",
  },
  {
    key: "antennal_lobe",
    label: "Antennal Lobe",
    short: "AL",
    category: "SENSORY / SMELL",
    blurb: "Real smell center. Fast ORN → PN pathway — twitchy sensory relay.",
  },
];

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

function SchematicFor({ region }: { region: RegionKey }) {
  if (region === "central_complex") return <CxCircuitSchematic compact />;
  if (region === "mushroom_body") return <MbCircuitSchematic />;
  return <AlCircuitSchematic />;
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
  opponent = "bot",
  onOpponent,
  stats = [],
}: {
  onPick: (k: RegionKey, opponent: FlyOpponent) => void;
  onSelect?: (k: RegionKey) => void;
  headline?: string;
  selected?: RegionKey;
  opponent?: FlyOpponent;
  onOpponent?: (o: FlyOpponent) => void;
  stats?: { region: string; matches: number; fly_wins: number }[];
}) {
  const reduce = useReducedMotion() ?? false;
  const variants = cardVariants(reduce);
  const current = selected ?? "central_complex";
  const currentMeta = REGIONS.find((r) => r.key === current)!;
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
          {headline ?? "Which real brain region plays?"}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 12,
            color: "var(--text-secondary)",
            maxWidth: 560,
            marginInline: "auto",
            lineHeight: 1.4,
          }}
        >
          Pick which real MaleCNS region the fly uses. By default the fly plays as a strong
          look-ahead bot — tough match, no retrain needed.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 14,
          flex: "1 1 auto",
          minHeight: 0,
          alignContent: "center",
        }}
      >
        {REGIONS.map((r) => {
          const isSelected = r.key === current;
          const st = REGION_STATS[r.key];
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
                <SchematicFor region={r.key} />
              </div>

              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--text-muted)",
                }}
              >
                {st.neurons.toLocaleString()} neurons · {st.connections.toLocaleString()} connections
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
                  match to teacher moves
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
                ? "Live brain (region LIF)"
                : "Look-ahead bot"}
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
                Demo mode: Live brain (region LIF)
              </span>
              <br />
              <span id="live-brain-hint">
                Science story — real wiring decides hops. Often easier than the look-ahead bot
                (imitates a teacher; not whole-brain).
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
            // Solid primary CTA (Linear-style): one filled button per screen
            // tells judges exactly where to click. Dark text on teal passes
            // contrast at projector distance.
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
          {currentOpponent === "brain" ? " · Live brain" : " · Look-ahead fly"}
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
          Only the region you pick is simulated — never the whole brain.
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
