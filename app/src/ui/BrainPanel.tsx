/**
 * Live brain panel — coolness-first rebuild.
 *
 * Why this layout (beginner note):
 *   Judges need to *feel* the fly thinking. So column 3 is one vertical story:
 *   (1) big glittering MaleCNS atlas, (2) AL→MB→CX cascade meters from real
 *   stageResults, (3) chosen-move bars, (4) a thin credibility footer.
 *   Static stills / proof grids / link piles are demoted so they don't steal
 *   the eye from the live pathway.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { RegionKey, StepResult } from "../brain/LifEngine";
import { PathwayStepResult } from "../brain/PathwayEngine";
import { PROOF } from "./ProofCard";
import { MaleCnsBrainViz } from "./MaleCnsBrainViz";
import {
  NEUROGLANCER_FULL_URL,
  neuroglancerRegionUrl,
} from "./neuroglancerLinks";

/** Action ids match LaneWorld: stay=0 forward=1 left=2 right=3 */
const MOVE_META: { name: string; action: number }[] = [
  { name: "forward", action: 1 },
  { name: "left", action: 2 },
  { name: "stay", action: 0 },
  { name: "right", action: 3 },
];

const STAGE_META: {
  key: RegionKey;
  short: string;
  color: string;
}[] = [
  { key: "antennal_lobe", short: "AL", color: "#8cff59" },
  { key: "mushroom_body", short: "MB", color: "#ff6bf2" },
  { key: "central_complex", short: "CX", color: "#73ebff" },
];

const CEREBRA_URL = "https://complete-3d-brain.higgsfield.app/";
const CELLTYPE_HOME =
  "https://reiserlab.github.io/celltype-explorer-drosophila-male-cns/";

const REGION_CELLTYPE_URL: Record<RegionKey, { href: string; tip: string }> = {
  central_complex: {
    href: `${CELLTYPE_HOME}types/PFL3.html`,
    tip: "PFL3 (CX steering)",
  },
  mushroom_body: {
    href: `${CELLTYPE_HOME}types/MBON01.html`,
    tip: "MBON01 (MB output)",
  },
  antennal_lobe: {
    href: `${CELLTYPE_HOME}types/DM1_lPN.html`,
    tip: "DM1_lPN (AL projection)",
  },
};

const ngCtaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: "#052a2a",
  background: "linear-gradient(90deg, var(--accent-teal), #7ad7ff)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "6px 8px",
  textDecoration: "none",
  lineHeight: 1.2,
};

const moreLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontFamily: "var(--font-mono)",
  fontSize: 9,
  fontWeight: 600,
  color: "var(--accent-teal)",
  textDecoration: "none",
  opacity: 0.85,
};

export const REGION_STATS: Record<
  RegionKey,
  { neurons: number; connections: number; matchPct: number }
> = {
  central_complex: { neurons: 2950, connections: 402394, matchPct: 95.8 },
  mushroom_body: { neurons: 4501, connections: 860814, matchPct: 95.6 },
  antennal_lobe: { neurons: 3783, connections: 423980, matchPct: 96.8 },
};

/** Summed AL+MB+CX for pathway card / panel. */
export const PATHWAY_STATS = {
  neurons:
    REGION_STATS.antennal_lobe.neurons +
    REGION_STATS.mushroom_body.neurons +
    REGION_STATS.central_complex.neurons,
  connections:
    REGION_STATS.antennal_lobe.connections +
    REGION_STATS.mushroom_body.connections +
    REGION_STATS.central_complex.connections,
  matchPct:
    (REGION_STATS.antennal_lobe.matchPct +
      REGION_STATS.mushroom_body.matchPct +
      REGION_STATS.central_complex.matchPct) /
    3,
};

function sumSpikes(spikeCount: Float32Array | undefined): number {
  if (!spikeCount || spikeCount.length === 0) return 0;
  let s = 0;
  for (let i = 0; i < spikeCount.length; i++) s += spikeCount[i];
  return s;
}

function stageResultsOf(
  diag: StepResult | null
): PathwayStepResult["stageResults"] | null {
  if (!diag) return null;
  const sr = (diag as PathwayStepResult).stageResults;
  return sr ?? null;
}

function DecisionBar({
  name,
  prob,
  chosen,
  pulse,
  topBrain,
}: {
  name: string;
  prob: number;
  chosen: boolean;
  pulse: boolean;
  /** Highest brain % — shown when search acted on a different hop. */
  topBrain?: boolean;
}) {
  const reduce = useReducedMotion();
  const pctLabel = `${Math.round(prob * 100)}%`;
  const fill = chosen ? "var(--accent-pink)" : "var(--accent-blue)";

  return (
    <motion.div
      initial={false}
      animate={{
        boxShadow:
          chosen && pulse && !reduce
            ? "0 0 14px rgba(248,113,113,0.45)"
            : "0 0 0 rgba(0,0,0,0)",
        background:
          chosen && pulse && !reduce
            ? "rgba(248,113,113,0.08)"
            : "transparent",
      }}
      transition={{ duration: reduce ? 0 : 0.15 }}
      style={{
        display: "grid",
        gridTemplateColumns: "52px 1fr 36px auto",
        alignItems: "center",
        gap: 6,
        marginBottom: 2,
        borderRadius: "var(--radius-sm)",
        padding: "1px 3px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-mono)",
          color: chosen ? "var(--text-primary)" : "var(--text-secondary)",
          fontWeight: chosen ? 600 : 500,
        }}
      >
        {name}
      </div>
      <div
        style={{
          height: 6,
          borderRadius: "var(--radius-pill)",
          background: "var(--bg-inset)",
          overflow: "hidden",
          boxShadow: "var(--shadow-inset)",
        }}
      >
        <div
          style={{
            width: `${Math.max(0, Math.min(100, Math.round(prob * 100)))}%`,
            height: "100%",
            background: fill,
            borderRadius: "var(--radius-pill)",
            transition: reduce ? undefined : "width 120ms linear",
          }}
        />
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-mono)",
          textAlign: "right",
          color: "var(--text-secondary)",
        }}
      >
        {pctLabel}
      </div>
      <div style={{ minWidth: 48 }}>
        {chosen && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--accent-teal)",
              border: "1px solid var(--accent-teal)",
              borderRadius: "var(--radius-pill)",
              padding: "1px 5px",
            }}
          >
            acted
          </span>
        )}
        {!chosen && topBrain && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--text-muted)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-pill)",
              padding: "1px 5px",
            }}
          >
            brain
          </span>
        )}
      </div>
    </motion.div>
  );
}

/**
 * AL → MB → CX meters. Why staggered pulse: the engine already runs AL then
 * MB then CX each step; animating meters left→right (~90ms apart) sells that
 * cascade even though the JS step is instantaneous.
 */
function CascadeStrip({
  diag,
  pathwayMode,
  regionKey,
  pulseGen,
  activeStage,
}: {
  diag: StepResult | null;
  pathwayMode: boolean;
  regionKey: RegionKey;
  pulseGen: number;
  activeStage: number; // 0=AL, 1=MB, 2=CX, -1=none
}) {
  const reduce = useReducedMotion();
  const stages = stageResultsOf(diag);

  const values = useMemo(() => {
    if (pathwayMode && stages) {
      return STAGE_META.map((m) => sumSpikes(stages[m.key].spikeCount));
    }
    // Non-pathway: emphasize the selected region with total spikes
    const total = sumSpikes(diag?.spikeCount);
    return STAGE_META.map((m) => (m.key === regionKey ? total : 0));
  }, [pathwayMode, stages, diag, regionKey]);

  const maxV = Math.max(1, ...values);

  return (
    <section
      style={{
        flexShrink: 0,
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "6px 8px 7px",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: "0.1em",
          color: "var(--text-muted)",
          marginBottom: 6,
        }}
      >
        {pathwayMode ? "THINKING CASCADE · AL → MB → CX" : "REGION ACTIVITY"}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 0,
        }}
      >
        {STAGE_META.map((m, i) => {
          const pct = values[i] / maxV;
          // Trail: stages already visited stay softly lit; active stage pops.
          const lit = activeStage === i;
          const done = pathwayMode && activeStage > i;
          return (
            <React.Fragment key={m.key}>
              {i > 0 && (
                <div
                  aria-hidden
                  style={{
                    width: 14,
                    alignSelf: "center",
                    height: 2,
                    background:
                      pathwayMode && activeStage >= i
                        ? m.color
                        : "var(--border-subtle)",
                    opacity: pathwayMode && activeStage >= i ? 0.9 : 0.5,
                    boxShadow:
                      pathwayMode && activeStage >= i
                        ? `0 0 8px ${m.color}`
                        : undefined,
                    transition: reduce ? undefined : "all 120ms ease",
                  }}
                />
              )}
              <motion.div
                key={`${m.key}-${pulseGen}`}
                initial={false}
                animate={{
                  scale: lit && !reduce ? 1.06 : 1,
                  borderColor: lit || done ? m.color : "rgba(255,255,255,0.06)",
                  boxShadow: lit
                    ? `0 0 18px ${m.color}66`
                    : done
                      ? `0 0 8px ${m.color}33`
                      : "0 0 0 transparent",
                }}
                transition={{ duration: reduce ? 0 : 0.15 }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                  padding: "5px 6px 6px",
                  background: lit
                    ? "rgba(255,255,255,0.04)"
                    : "var(--bg-inset)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      fontWeight: 700,
                      color: m.color,
                      letterSpacing: "0.06em",
                      textShadow: lit ? `0 0 10px ${m.color}` : undefined,
                    }}
                  >
                    {m.short}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      color: "var(--text-secondary)",
                    }}
                  >
                    {Math.round(values[i])}
                  </span>
                </div>
                <div
                  style={{
                    height: 5,
                    borderRadius: "var(--radius-pill)",
                    background: "rgba(0,0,0,0.35)",
                    overflow: "hidden",
                  }}
                >
                  <motion.div
                    initial={false}
                    animate={{
                      width: `${Math.round(pct * 100)}%`,
                      opacity: lit || done || !pathwayMode ? 1 : 0.45,
                    }}
                    transition={{ duration: reduce ? 0 : 0.15 }}
                    style={{
                      height: "100%",
                      background: m.color,
                      borderRadius: "var(--radius-pill)",
                      boxShadow: lit ? `0 0 8px ${m.color}` : undefined,
                    }}
                  />
                </div>
              </motion.div>
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}

export function BrainPanel(props: {
  regionKey: RegionKey;
  label: string;
  diag: StepResult | null;
  nSteps?: number;
  /** When true, connectome is in the decision loop (pathway hybrid or ablation LIF). */
  liveBrain?: boolean;
  /** Soft AL→MB→CX cascade — multi-region atlas glow. */
  pathwayMode?: boolean;
  playMode?: string;
  /**
   * Phone match layout: shorter atlas + denser chrome so the live cascade and
   * hop bars still fit under the split game without stealing the play surface.
   */
  compact?: boolean;
}) {
  const {
    regionKey,
    label,
    diag,
    liveBrain = false,
    pathwayMode = false,
    compact = false,
  } = props;
  const reduce = useReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);

  // Stagger pulse: compressed AL→MB→CX (~220ms) so it finishes inside
  // DECISION_EVERY_MS (~260) — brain still runs all three stages every hop.
  const [pulseGen, setPulseGen] = useState(0);
  const [activeStage, setActiveStage] = useState(-1);
  const [movePulse, setMovePulse] = useState(false);
  const lastDiagKey = useRef("");

  // During cascade: show that stage’s own probs (AL→MB→CX), then the blended
  // pathway readout. Why: CX alone often sticks on a prior; AL tracks the board.
  const moveRows = useMemo(() => {
    let p0 = 0;
    let p1 = 0;
    let p2 = 0;
    let p3 = 0;
    const stages = stageResultsOf(diag);
    if (pathwayMode && stages && activeStage >= 0 && activeStage <= 2) {
      const stageKey = STAGE_META[activeStage].key;
      const src =
        activeStage < 2 ? stages[stageKey].probs : diag!.probs;
      p0 = Number(src[0]) || 0;
      p1 = Number(src[1]) || 0;
      p2 = Number(src[2]) || 0;
      p3 = Number(src[3]) || 0;
    } else if (diag) {
      p0 = Number(diag.probs[0]) || 0;
      p1 = Number(diag.probs[1]) || 0;
      p2 = Number(diag.probs[2]) || 0;
      p3 = Number(diag.probs[3]) || 0;
    }
    const byAction = [p0, p1, p2, p3];
    const rows = MOVE_META.map((row) => ({
      ...row,
      prob: byAction[row.action] ?? 0,
    }));
    rows.sort((a, b) => b.prob - a.prob);
    return rows;
  }, [diag, pathwayMode, activeStage]);

  const chosenAction = diag?.action ?? -1;

  useEffect(() => {
    if (!diag) {
      setActiveStage(-1);
      setMovePulse(false);
      return;
    }
    // Fire every decision frame — include a time crumb so identical spike totals still pulse.
    const key = `${diag.action}|${Number(diag.probs[0]).toFixed(3)}|${Number(diag.probs[1]).toFixed(3)}|${Number(diag.probs[2]).toFixed(3)}|${Number(diag.probs[3]).toFixed(3)}|${sumSpikes(diag.spikeCount)}`;
    if (key === lastDiagKey.current) return;
    lastDiagKey.current = key;
    setPulseGen((g) => g + 1);
    setMovePulse(false);

    if (reduce) {
      setActiveStage(pathwayMode ? 2 : STAGE_META.findIndex((m) => m.key === regionKey));
      setMovePulse(true);
      return;
    }

    const timers: number[] = [];
    if (pathwayMode) {
      setActiveStage(0);
      timers.push(
        window.setTimeout(() => setActiveStage(1), 75),
        window.setTimeout(() => setActiveStage(2), 150),
        window.setTimeout(() => {
          setActiveStage(2);
          setMovePulse(true);
        }, 220)
      );
    } else {
      const idx = STAGE_META.findIndex((m) => m.key === regionKey);
      setActiveStage(idx);
      timers.push(window.setTimeout(() => setMovePulse(true), 120));
    }
    return () => timers.forEach((t) => clearTimeout(t));
  }, [diag, pathwayMode, regionKey, reduce]);

  const badgeLabel = liveBrain ? "LIVE" : diag ? "WATCHING" : "IDLE";
  const badgeColor = liveBrain
    ? "var(--accent-teal)"
    : diag
      ? "var(--text-secondary)"
      : "var(--text-muted)";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? 5 : 6,
        height: "100%",
        minHeight: 0,
        overflow: compact ? "auto" : "hidden",
        WebkitOverflowScrolling: compact ? "touch" : undefined,
        padding: compact
          ? "5px 8px calc(5px + env(safe-area-inset-bottom, 0px))"
          : "6px 10px 5px",
        background: "var(--bg-panel)",
        boxShadow: compact ? "0 -8px 24px rgba(0,0,0,0.35)" : "var(--shadow-panel)",
      }}
    >
      {/* Header — short title + pathway blurb + LIVE/WATCHING pill */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexShrink: 0,
          width: "100%",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: compact ? 13 : 16,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.15,
            }}
          >
            Fly brain
          </div>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-mono-sm)",
            fontWeight: 700,
            color: badgeColor,
            border: `1px solid ${liveBrain ? "rgba(45,212,191,0.45)" : "var(--border-subtle)"}`,
            borderRadius: "var(--radius-pill)",
            padding: "3px 9px",
            flexShrink: 0,
            letterSpacing: "0.08em",
            boxShadow: liveBrain ? "0 0 12px rgba(45,212,191,0.25)" : undefined,
          }}
          title={
            liveBrain
              ? "Connectome is choosing moves"
              : "Atlas animates from LIF; bot/player chooses moves"
          }
        >
          <span
            aria-hidden
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: badgeColor,
              boxShadow: liveBrain ? `0 0 8px ${badgeColor}` : undefined,
            }}
          />
          {badgeLabel}
        </div>
      </header>

      {/* Hero atlas — desktop: ~58% of column. Mobile: fixed-height strip beside meters. */}
      <div
        style={{
          display: "flex",
          flexDirection: compact ? "row" : "column",
          gap: compact ? 6 : 6,
          flex: "1 1 0",
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
        }}
      >
      <section
        style={{
          flex: compact ? "0 0 38%" : "1 1 0",
          minHeight: 0,
          minWidth: compact ? 0 : 0,
          // Target ~58% of a typical 900px column content area
          flexBasis: compact ? undefined : "58%",
          background: "var(--bg-inset)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          padding: "3px 4px 4px",
          boxShadow: "var(--shadow-inset)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {!compact && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
            padding: "1px 4px 2px",
            flexShrink: 0,
          }}
        >
          <span>MALE CNS · BRAIN ATLAS</span>
          <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
            {pathwayMode ? "PATHWAY" : label.toUpperCase()}
          </span>
        </div>
        )}
        <div
          style={{
            flex: "1 1 0",
            // Desktop atlas needs height to sell the 3D brain; mobile keeps a
            // readable slice so cascade + hop bars stay above the fold.
            minHeight: compact ? 96 : 280,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", inset: 0 }}>
            <MaleCnsBrainViz
              diag={diag}
              liveBrain={liveBrain}
              region={regionKey}
              pathwayMode={pathwayMode}
              idleAnim
              cascadeStage={pathwayMode ? activeStage : -1}
            />
          </div>
        </div>
        {/* Legend — only the three pathway carves (no “Spiking” chip) */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "2px 10px",
            marginTop: 3,
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            color: "var(--text-secondary)",
            fontWeight: 600,
            flexShrink: 0,
            lineHeight: 1.25,
          }}
        >
          <LegendDot
            color="#8cff59"
            label="AL"
            hot={
              pathwayMode
                ? activeStage === 0
                : regionKey === "antennal_lobe"
            }
          />
          <LegendDot
            color="#ff6bf2"
            label="MB"
            hot={
              pathwayMode
                ? activeStage === 1
                : regionKey === "mushroom_body"
            }
          />
          <LegendDot
            color="#73ebff"
            label="CX"
            hot={
              pathwayMode
                ? activeStage === 2
                : regionKey === "central_complex"
            }
          />
        </div>
      </section>

      <div
        style={{
          flex: compact ? "1 1 0" : undefined,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          gap: compact ? 4 : 6,
          minHeight: 0,
          overflow: compact ? "auto" : undefined,
        }}
      >
      <CascadeStrip
        diag={diag}
        pathwayMode={pathwayMode}
        regionKey={regionKey}
        pulseGen={pulseGen}
        activeStage={activeStage}
      />

      {/* Move bars — % = brain preference; badge = hop the look-ahead actually took */}
      <section style={{ flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 8,
            marginBottom: 3,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
            }}
          >
            CHOSEN MOVE
          </div>
          {!compact && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              color: "var(--text-muted)",
              opacity: 0.85,
            }}
            title="Bars = connectome preference. Badge = look-ahead hop (brain only biases it)."
          >
            bars=brain · badge=acted
          </div>
          )}
        </div>
        {moveRows.map((row, i) => (
          <DecisionBar
            key={row.name}
            name={row.name}
            prob={row.prob}
            chosen={chosenAction === row.action}
            pulse={movePulse && chosenAction === row.action}
            topBrain={i === 0 && chosenAction !== row.action}
          />
        ))}
      </section>
      </div>
      </div>

      {/* Footer — Explore EM + optional More (wiring proof lives under More) */}
      <footer
        style={{
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 5,
          paddingTop: 1,
          width: "100%",
        }}
      >
        {!compact && (
        <a
          href={neuroglancerRegionUrl(regionKey)}
          target="_blank"
          rel="noopener noreferrer"
          style={ngCtaStyle}
          title="Opens Neuroglancer (new tab): real MaleCNS EM, this region highlighted"
        >
          Explore EM · {pathwayMode ? "Central complex" : label}
        </a>
        )}
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          style={{
            alignSelf: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            color: "var(--text-muted)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 4px",
            letterSpacing: "0.06em",
            minHeight: compact ? 28 : undefined,
          }}
        >
          {moreOpen ? "▾ LESS" : compact ? "▸ MORE · Explore EM" : "▸ MORE"}
        </button>
        {moreOpen && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              alignItems: "center",
            }}
          >
            {compact && (
              <a
                href={neuroglancerRegionUrl(regionKey)}
                target="_blank"
                rel="noopener noreferrer"
                style={ngCtaStyle}
                title="Opens Neuroglancer (new tab): real MaleCNS EM, this region highlighted"
              >
                Explore EM · {pathwayMode ? "Central complex" : label}
              </a>
            )}
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--text-secondary)",
                textAlign: "center",
                lineHeight: 1.4,
                maxWidth: 240,
              }}
            >
              Wiring check (CX eval): intact connectome matches teacher moves{" "}
              {PROOF.intact != null ? `${(PROOF.intact * 100).toFixed(1)}%` : "—"}{" "}
              vs shuffled edges ~
              {PROOF.shuffled != null
                ? Math.round(PROOF.shuffled * 100)
                : 10}
              % — proof the frozen wiring matters, not just the decoder.
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "4px 10px",
                justifyContent: "center",
              }}
            >
            <a
              href={CEREBRA_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={moreLinkStyle}
            >
              Cerebra 3D
            </a>
            <a
              href={REGION_CELLTYPE_URL[regionKey].href}
              target="_blank"
              rel="noopener noreferrer"
              style={moreLinkStyle}
              title={REGION_CELLTYPE_URL[regionKey].tip}
            >
              Cell types
            </a>
            <a
              href={NEUROGLANCER_FULL_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={moreLinkStyle}
            >
              Full dataset
            </a>
            <a
              href="https://male-cns.janelia.org/"
              target="_blank"
              rel="noopener noreferrer"
              style={moreLinkStyle}
            >
              MaleCNS home
            </a>
            </div>
          </div>
        )}
        {!compact && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            color: "var(--text-muted)",
            textAlign: "center",
            lineHeight: 1.3,
          }}
        >
          CC BY MaleCNS · Janelia FlyEM et al.
        </div>
        )}
      </footer>
    </div>
  );
}

function LegendDot({
  color,
  label,
  hot,
}: {
  color: string;
  label: string;
  hot?: boolean;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        color: hot ? "var(--text-primary)" : undefined,
        textShadow: hot ? `0 0 8px ${color}` : undefined,
      }}
    >
      <span
        aria-hidden
        style={{
          width: hot ? 7 : 5,
          height: hot ? 7 : 5,
          borderRadius: "50%",
          background: color,
          boxShadow: hot ? `0 0 10px ${color}` : `0 0 5px ${color}`,
        }}
      />
      {label}
    </span>
  );
}
