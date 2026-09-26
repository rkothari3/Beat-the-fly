/**
 * Live brain panel — real MaleCNS soma atlas particle connectome
 * (cyan/gold glitter, lab visualizer language) plus action probs / honesty /
 * anatomy links. Flex layout: header/viz/decision/science stay visible at 1080p.
 */

import React, { useEffect } from "react";
import { motion, useReducedMotion, useSpring, useTransform } from "motion/react";
import { RegionKey, StepResult } from "../brain/LifEngine";
import { PROOF } from "./ProofCard";
import { WhereItLivesStill } from "./schematics/WhereItLivesStill";
import { MaleCnsBrainViz } from "./MaleCnsBrainViz";
import { NEUROGLANCER_FULL_URL, neuroglancerRegionUrl } from "./neuroglancerLinks";

const READOUT_SPRING = { stiffness: 260, damping: 28, mass: 0.6 };

/** Display order matches the mock: forward → left → stay → right */
const MOVE_ROWS: { name: string; action: number }[] = [
  { name: "forward", action: 1 },
  { name: "left", action: 2 },
  { name: "stay", action: 0 },
  { name: "right", action: 3 },
];

const REGION_BLURB: Record<RegionKey, string> = {
  central_complex: "The fly's navigation & steering center",
  mushroom_body: "The fly's learning & memory center",
  antennal_lobe: "The fly's smell / sensory relay center",
};

const PATHWAY_BLURB =
  "Soft AL→MB→CX cascade of frozen MaleCNS wiring (+ look-ahead when live)";

/**
 * External anatomy explorers (open in a new tab).
 * The in-panel particle cloud is a real MaleCNS brain soma atlas (CC BY 4.0)
 * with lab-style additive glow — brain-only activity display (no VNC cord),
 * not the controller. Pitch owns the “display vs controller” nuance.
 */
const CEREBRA_URL = "https://complete-3d-brain.higgsfield.app/";
const CELLTYPE_HOME =
  "https://reiserlab.github.io/celltype-explorer-drosophila-male-cns/";

/** One official Cell Type Explorer page per playable region (landmark type). */
const REGION_CELLTYPE_URL: Record<RegionKey, { href: string; tip: string }> = {
  // PFL3 = CX steering output we read for moves — better than a random CX type.
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

/**
 * Hero CTA into the real EM dataset. Why a link and not an iframe:
 * Neuroglancer streams gigabytes of EM chunks and needs its own full GPU
 * context — embedded in the sidebar it would be slow, cramped, and could
 * never show our live LIF spikes. A curated deep-link keeps the jobs
 * separate: our glitter brain = live activity, Neuroglancer = real anatomy.
 */
const ngCtaStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.05em",
  color: "#052a2a",
  background: "linear-gradient(90deg, var(--accent-teal), #7ad7ff)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "7px 10px",
  textDecoration: "none",
  lineHeight: 1.2,
  marginBottom: 6,
};

/** Visible anatomy deep-links — judges often missed the 9px footer row. */
const anatomyBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 600,
  color: "var(--accent-teal)",
  background: "var(--bg-elevated)",
  border: "1px solid rgba(45,212,191,0.35)",
  borderRadius: "var(--radius-sm)",
  padding: "5px 8px",
  textDecoration: "none",
  lineHeight: 1.2,
};

export const REGION_STATS: Record<
  RegionKey,
  { neurons: number; connections: number; matchPct: number }
> = {
  // Real numbers: manifest.n + W_vals.bin float count; match from manifest.val_acc
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

function useSpringedValue(value: number) {
  const reduce = useReducedMotion();
  const spring = useSpring(0, READOUT_SPRING);
  useEffect(() => {
    if (reduce) spring.jump(value);
    else spring.set(value);
  }, [value, reduce, spring]);
  return spring;
}

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpringedValue(value);
  const text = useTransform(spring, (v) => `${Math.round(v)}`);
  return <motion.span>{text}</motion.span>;
}

function SpikeCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: "var(--bg-card)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)",
        borderTop: `3px solid ${color}`,
        padding: "5px 6px 4px",
        textAlign: "center",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-mono-sm)",
          color,
          fontWeight: 700,
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--text-primary)",
          lineHeight: 1.1,
          marginTop: 1,
        }}
      >
        <AnimatedNumber value={value} />
      </div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--text-muted)",
        }}
      >
        spikes
      </div>
    </div>
  );
}

function DecisionBar({
  name,
  prob,
  chosen,
}: {
  name: string;
  prob: number;
  chosen: boolean;
}) {
  const reduce = useReducedMotion();
  const spring = useSpringedValue(prob);
  const pct = useTransform(spring, (v) => `${Math.round(v * 100)}%`);
  const barColor = chosen ? "var(--accent-pink)" : "var(--accent-blue)";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "52px 1fr 36px auto",
        alignItems: "center",
        gap: 6,
        marginBottom: 3,
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
        <motion.div
          initial={false}
          animate={{ backgroundColor: barColor }}
          transition={{ duration: reduce ? 0 : 0.2 }}
          style={{
            width: "100%",
            height: "100%",
            scaleX: spring,
            transformOrigin: "left center",
            borderRadius: "var(--radius-pill)",
          }}
        />
      </div>
      <motion.div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-mono)",
          textAlign: "right",
          color: "var(--text-secondary)",
        }}
      >
        {pct}
      </motion.div>
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
            chosen
          </span>
        )}
      </div>
    </div>
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
}) {
  const {
    regionKey,
    label,
    diag,
    nSteps = 6,
    liveBrain = false,
    pathwayMode = false,
  } = props;
  const stats = pathwayMode ? PATHWAY_STATS : REGION_STATS[regionKey];
  const spikes = diag?.stageSpikes;
  const headerBlurb = pathwayMode ? PATHWAY_BLURB : REGION_BLURB[regionKey];
  const headerTitle = pathwayMode ? "Full pathway" : label;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
        padding: "6px 10px 4px",
        background: "var(--bg-panel)",
        boxShadow: "var(--shadow-panel)",
      }}
    >
      {/* Header — fixed */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-label)",
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            Brain mode
          </div>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: "var(--text-primary)",
              marginTop: 1,
              lineHeight: 1.15,
            }}
          >
            {headerTitle}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>
            {headerBlurb}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-mono-sm)",
              color: "var(--accent-teal)",
              border: "1px solid rgba(45,212,191,0.35)",
              borderRadius: "var(--radius-pill)",
              padding: "2px 7px",
              marginBottom: 4,
              // Flat pill — glow is reserved for the selected region card.
            }}
          >
            <span aria-hidden>🔒</span> Frozen wiring
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--text-muted)",
            }}
          >
            {stats.neurons.toLocaleString()} neurons · {stats.connections.toLocaleString()}{" "}
            connections
          </div>
        </div>
      </header>

      {/* Real MaleCNS soma atlas — cyan/gold lab particle look (flexible middle) */}
      <section
        style={{
          flex: "2.4 1 0",
          minHeight: 300,
          maxHeight: 480,
          background: "var(--bg-inset)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-subtle)",
          padding: "4px 6px 6px",
          boxShadow: "var(--shadow-inset)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--text-muted)",
            letterSpacing: "0.08em",
            padding: "0 2px 3px",
            flexShrink: 0,
          }}
        >
          <span>MALE CNS · BRAIN ATLAS</span>
          <span
            style={{
              color: liveBrain ? "var(--accent-teal)" : "var(--text-secondary)",
              fontWeight: 700,
            }}
          >
            {liveBrain ? "LIVE" : diag ? "DISPLAY" : "IDLE"}
          </span>
        </div>
        <div style={{ flex: "1 1 0", minHeight: 300, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            {/* region lights CX / MB / AL blobs; why pass it: selection must glitter that carving */}
            <MaleCnsBrainViz
              diag={diag}
              liveBrain={liveBrain}
              region={regionKey}
              pathwayMode={pathwayMode}
              idleAnim
            />
          </div>
        </div>
        {/* Legend — cyan optic / gold central-motor + carved CX / MB / AL accents */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "2px 7px",
            marginTop: 4,
            fontFamily: "var(--font-mono)",
            fontSize: 7,
            color: "var(--text-secondary)",
            fontWeight: 600,
            flexShrink: 0,
            lineHeight: 1.25,
          }}
        >
          <LegendDot color="#ff59bf" label="Spiking" />
          <LegendDot color="#0dd4ff" label="Optic" />
          <LegendDot color="#ffb82e" label="Central" />
          <LegendDot color="#73ebff" label="CX" hot={pathwayMode || regionKey === "central_complex"} />
          <LegendDot
            color="#ff6bf2"
            label="Mushroom body"
            hot={pathwayMode || regionKey === "mushroom_body"}
          />
          <LegendDot
            color="#8cff59"
            label="Antennal lobe"
            hot={pathwayMode || regionKey === "antennal_lobe"}
          />
          <LegendDot color="#59f2d9" label="Sensory" />
          <LegendDot color="#ff8c1f" label="Motor / descending" />
        </div>
      </section>

      {/* Spike cards when we have stage diagnostics (any region) */}
      {spikes && (
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <SpikeCard label="RING" value={spikes.ring ?? 0} color="var(--ring)" />
            <SpikeCard label="PFN" value={spikes.pfn ?? 0} color="var(--pfn)" />
            <SpikeCard label="PFL" value={spikes.pfl ?? 0} color="var(--pfl)" />
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--text-muted)",
              marginTop: 3,
            }}
          >
            this decision · {nSteps} simulation steps
            {!liveBrain ? " · viz from LIF (bot chooses moves)" : ""}
          </div>
        </div>
      )}

      {/* PFL output — fixed */}
      <section style={{ flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            marginBottom: 4,
          }}
        >
          PFL OUTPUT → MOVE
        </div>
        {diag
          ? MOVE_ROWS.map((row) => (
              <DecisionBar
                key={row.name}
                name={row.name}
                prob={diag.probs[row.action] ?? 0}
                chosen={diag.action === row.action}
              />
            ))
          : MOVE_ROWS.map((row) => (
              <DecisionBar key={row.name} name={row.name} prob={0} chosen={false} />
            ))}
      </section>

      {/* Science cards — fixed */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "6px 6px 4px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.1em",
              color: "var(--text-muted)",
              marginBottom: 2,
            }}
          >
            WHERE IT LIVES
          </div>
          <WhereItLivesStill region={regionKey} compact />
        </div>
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "6px 8px 4px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              marginBottom: 4,
            }}
          >
            DOES THE WIRING MATTER?
          </div>
          <WiringRows />
        </div>
      </div>

      {/*
        Anatomy section — intentional and clickable. Previous footer links were 9px and
        easy to miss; this is still compact (not a dashboard) and honest: explorers ≠ controller.
      */}
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
            marginBottom: 4,
          }}
        >
          ANATOMY (opens in new tab)
        </div>
        <p
          style={{
            margin: "0 0 6px",
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--text-secondary)",
            lineHeight: 1.35,
          }}
        >
          Real MaleCNS brain soma positions (CC BY 4.0) — optic / central /
          descending only; VNC cord cropped because CX / MB / AL live in the
          brain. Glow maps LIF activity (
          {stats.neurons.toLocaleString()} neurons
          {pathwayMode ? " across AL+MB+CX" : ""}
          ). Live pathway: soft cascade + look-ahead search. Ablations: one region
          LIF only. Neuroglancer below is anatomy reference, not the live controller.
        </p>
        {/* Region-aware hero link: curated camera + only this region's neuropils */}
        <a
          href={neuroglancerRegionUrl(regionKey)}
          target="_blank"
          rel="noopener noreferrer"
          style={ngCtaStyle}
          title="Opens Neuroglancer (new tab): real MaleCNS EM dataset, camera parked on this region, its neuropil meshes highlighted in the legend color"
        >
          <span aria-hidden>🔬</span>
          <span>
            EXPLORE {pathwayMode ? "CENTRAL COMPLEX" : label.toUpperCase()} IN
            NEUROGLANCER — REAL EM, REGION
            HIGHLIGHTED
          </span>
        </a>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
          }}
        >
          <a
            href={CEREBRA_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={anatomyBtnStyle}
          >
            Cerebra 3D atlas
          </a>
          <a
            href={REGION_CELLTYPE_URL[regionKey].href}
            target="_blank"
            rel="noopener noreferrer"
            style={anatomyBtnStyle}
            title={REGION_CELLTYPE_URL[regionKey].tip}
          >
            Cell types
          </a>
          <a
            href={NEUROGLANCER_FULL_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={anatomyBtnStyle}
            title="Official full-dataset Neuroglancer demo (all layers, whole CNS)"
          >
            Full dataset
          </a>
          <a
            href="https://male-cns.janelia.org/"
            target="_blank"
            rel="noopener noreferrer"
            style={anatomyBtnStyle}
          >
            MaleCNS home
          </a>
        </div>
      </section>

      <footer
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--text-muted)",
          textAlign: "center",
          flexShrink: 0,
          paddingTop: 1,
          lineHeight: 1.3,
        }}
      >
        Wiring frozen from MaleCNS · encoder/decoder trained · soma atlas viz
        (CC BY 4.0 · Janelia FlyEM et al.)
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
  /** Selected region — brighten this legend chip so it matches the lit blob */
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
          width: hot ? 8 : 6,
          height: hot ? 8 : 6,
          borderRadius: "50%",
          background: color,
          boxShadow: hot ? `0 0 10px ${color}` : `0 0 5px ${color}`,
        }}
      />
      {label}
    </span>
  );
}

function WiringRows() {
  const rows = [
    { label: "real wiring", value: PROOF.intact, strong: true },
    { label: "shuffled", value: PROOF.shuffled, strong: false },
    { label: "zeroed", value: PROOF.zeroed, strong: false },
  ];
  return (
    <div>
      {rows.map((r) => (
        <div
          key={r.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            marginBottom: 2,
            color: r.strong ? "var(--text-primary)" : "var(--text-secondary)",
            fontWeight: r.strong ? 700 : 500,
          }}
        >
          <span>{r.label}</span>
          <span>{r.value != null ? `${(r.value * 100).toFixed(1)}%` : "—"}</span>
        </div>
      ))}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 8,
          color: "var(--text-muted)",
          marginTop: 3,
        }}
      >
        match to teacher moves
      </div>
    </div>
  );
}
