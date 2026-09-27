/**
 * Start screen: title → play | summary → Learn strip → AL|MB|CX → leaderboard.
 */

import React from "react";
import { motion, useReducedMotion, type Transition, type Variants } from "motion/react";
import { RegionKey } from "../brain/LifEngine";
import { PlayMode } from "../brain/PathwayEngine";
import { PATHWAY_STATS } from "./BrainPanel";
import {
  AlCircuitSchematic,
  CxCircuitSchematic,
  MbCircuitSchematic,
  PathwayCircuitSchematic,
} from "./schematics/CircuitSchematic";
import { LeaderEntry, randomPlayerName } from "./leaderboard";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { LearnStrip } from "./LearnStrip";

export type FlyOpponent = "bot" | "brain";

export const PLAY_MODES: {
  key: PlayMode;
  label: string;
  short: string;
  category: string;
  blurb: string;
  hero?: boolean;
}[] = [
  {
    key: "pathway",
    label: "Full pathway AL→MB→CX",
    short: "PATH",
    category: "MALECNS PATHWAY",
    blurb:
      "Three frozen MaleCNS regions score each hop; look-ahead search picks the legal move.",
    hero: true,
  },
];

export const REGIONS: {
  key: RegionKey;
  label: string;
  short: string;
  category: string;
  blurb: string;
}[] = [
  {
    key: "central_complex",
    label: "Central Complex",
    short: "CX",
    category: "CX",
    blurb: "Navigation / steering",
  },
  {
    key: "mushroom_body",
    label: "Mushroom Body",
    short: "MB",
    category: "MB",
    blurb: "Learning / memory",
  },
  {
    key: "antennal_lobe",
    label: "Antennal Lobe",
    short: "AL",
    category: "AL",
    blurb: "Smell relay",
  },
];

const STAGE_DIAGRAMS: {
  key: string;
  color: string;
  caption: string;
  schematic: React.ReactNode;
}[] = [
  {
    key: "AL",
    color: "var(--ring)",
    caption: "Smell relay · ORN→PN",
    schematic: <AlCircuitSchematic />,
  },
  {
    key: "MB",
    color: "var(--pfn)",
    caption: "Memory · Kenyon→MBON",
    schematic: <MbCircuitSchematic />,
  },
  {
    key: "CX",
    color: "#73ebff",
    caption: "Steering · Ring→PFN→PFL",
    schematic: <CxCircuitSchematic compact />,
  },
];

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
    selected: { y: lift(-4), scale: 1, boxShadow: SHADOW.selected },
    hover: (selected: boolean) => ({
      y: lift(selected ? -5 : -3),
      boxShadow: selected ? SHADOW.selectedHover : SHADOW.hover,
    }),
    tap: { scale: reduce ? 1 : 0.98 },
  };
}

function StageDiagramCard({
  label,
  color,
  caption,
  children,
}: {
  label: string;
  color: string;
  caption: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "8px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.08em",
          color,
        }}
      >
        {label}
      </div>
      <div
        style={{
          background: "var(--bg-inset)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-subtle)",
          aspectRatio: "280 / 86",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--text-muted)",
          lineHeight: 1.3,
        }}
      >
        {caption}
      </div>
    </div>
  );
}

export function RegionPicker({
  onPick,
  onLearn,
  playerName,
  onPlayerName,
  board = [],
  boardSource = "local",
}: {
  onPick: (k: PlayMode, opponent: FlyOpponent) => void;
  /** Deep-dive into full Learn overlay from the in-page Learn strip. */
  onLearn?: (beatIndex?: number) => void;
  playerName: string;
  onPlayerName: (name: string) => void;
  board?: LeaderEntry[];
  boardSource?: "remote" | "local";
  headline?: string;
  stats?: { region: string; matches: number; fly_wins: number }[];
}) {
  const reduce = useReducedMotion() ?? false;
  const variants = cardVariants(reduce);
  const mode = PLAY_MODES[0];
  const st = PATHWAY_STATS;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 980,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 0,
        maxHeight: "100%",
        overflow: "hidden",
        padding: "0 4px",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-label)",
            letterSpacing: "0.14em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          Beat the Fly
        </div>
        <h2
          style={{
            margin: "4px 0 0",
            fontSize: 26,
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.2,
          }}
        >
          Outscore a real fly brain
        </h2>
      </div>

      {/* Play | summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
          gap: 14,
          minHeight: 0,
          flex: "0 1 auto",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.08em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              Name
            </span>
            <input
              type="text"
              value={playerName}
              maxLength={24}
              placeholder="Anonymous"
              onChange={(e) => onPlayerName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onPick("pathway", "brain");
              }}
              style={{
                flex: 1,
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--text-primary)",
                background: "var(--bg-inset)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                padding: "8px 10px",
                outline: "none",
                minWidth: 0,
              }}
            />
            <button
              type="button"
              title="Random name"
              aria-label="Generate a random player name"
              onClick={() => onPlayerName(randomPlayerName())}
              style={{
                flexShrink: 0,
                width: 36,
                height: 36,
                display: "grid",
                placeItems: "center",
                fontSize: 16,
                lineHeight: 1,
                color: "var(--text-primary)",
                background: "var(--bg-inset)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {/* Dice / shuffle — small logo-style control next to the name field */}
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <rect
                  x="3"
                  y="3"
                  width="18"
                  height="18"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.75"
                />
                <circle cx="8" cy="8" r="1.4" fill="currentColor" />
                <circle cx="12" cy="12" r="1.4" fill="currentColor" />
                <circle cx="16" cy="16" r="1.4" fill="currentColor" />
              </svg>
            </button>
          </label>

          <motion.button
            type="button"
            onClick={() => onPick("pathway", "brain")}
            aria-label="Play full pathway AL to MB to CX"
            custom={true}
            variants={variants}
            initial={false}
            animate="selected"
            whileHover="hover"
            whileFocus="hover"
            whileTap="tap"
            transition={reduce ? REDUCED_TRANSITION : SPRING_TRANSITION}
            style={{
              textAlign: "left",
              padding: 14,
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-accent)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              cursor: "pointer",
              outline: "none",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: 0,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "var(--text-muted)",
              }}
            >
              {mode.category}
            </div>

            <div style={{ fontWeight: 700, fontSize: 18 }}>{mode.label}</div>

            <div
              style={{
                background: "var(--bg-inset)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                aspectRatio: "280 / 86",
                width: "100%",
                maxHeight: 100,
                boxSizing: "border-box",
                overflow: "hidden",
                boxShadow: "var(--shadow-inset)",
              }}
            >
              <PathwayCircuitSchematic />
            </div>

            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--text-muted)",
              }}
            >
              {st.neurons.toLocaleString()} neurons · {st.connections.toLocaleString()} connections
            </div>

            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.04em",
                color: "#052e28",
                background: "var(--accent-teal)",
                borderRadius: "var(--radius-pill)",
                padding: "10px 16px",
                textAlign: "center",
                boxShadow: "0 6px 20px rgba(45,212,191,0.25)",
              }}
            >
              Play
            </div>
          </motion.button>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            minWidth: 0,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            What this is
          </div>
          <ul
            style={{
              margin: 0,
              padding: "0 0 0 18px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.4,
            }}
          >
            <li>Split-screen Crossy Road: you vs a frozen MaleCNS pathway.</li>
            <li>Soft AL→MB→CX scores hops; look-ahead picks a legal move.</li>
            <li>~30s · outscore the fly · atlas lights AL, MB, and CX live.</li>
          </ul>
          <div
            style={{
              marginTop: "auto",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--text-secondary)",
              letterSpacing: "0.06em",
              paddingTop: 8,
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            ← ↑ → &nbsp;|&nbsp; 30s
          </div>
        </div>
      </div>

      {/* Learn curriculum — above AL|MB|CX so education sits in the start flow */}
      <LearnStrip onExplore={onLearn} />

      {/* AL | MB | CX diagram row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 10,
          flexShrink: 0,
        }}
      >
        {STAGE_DIAGRAMS.map((d) => (
          <StageDiagramCard key={d.key} label={d.key} color={d.color} caption={d.caption}>
            {d.schematic}
          </StageDiagramCard>
        ))}
      </div>

      {/* Full-width leaderboard */}
      <div style={{ flexShrink: 0, minHeight: 0, maxHeight: 160, overflow: "auto" }}>
        <LeaderboardPanel entries={board} source={boardSource} compact />
      </div>
    </div>
  );
}
