/**
 * Home-screen Learn — tabbed steps (click 1–5; only one panel visible).
 */

import React, { useState } from "react";
import {
  AlCircuitSchematic,
  CxCircuitSchematic,
  MbCircuitSchematic,
} from "./schematics/CircuitSchematic";
import { NEUROGLANCER_PATHWAY_URL } from "./neuroglancerLinks";
import { useNarrowLayout } from "./useNarrowLayout";

const card: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-subtle)",
  borderRadius: "var(--radius-lg)",
  padding: "14px 16px",
  boxShadow: "var(--shadow-card)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
  minWidth: 0,
};

const body: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "var(--text-secondary)",
  lineHeight: 1.45,
};

const bullets: React.CSSProperties = {
  margin: 0,
  padding: "0 0 0 18px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontSize: 13,
  color: "var(--text-secondary)",
  lineHeight: 1.4,
};

const STEPS: { id: number; short: string; title: string }[] = [
  { id: 0, short: "1 · Recipe", title: "Not an LLM" },
  { id: 1, short: "2 · Regions", title: "Why these three — (~11k neurons), not the whole 166k MaleCNS." },
  { id: 2, short: "3 · Cascade", title: "Brain + search" },
  { id: 3, short: "4 · Proof", title: "Wiring matters" },
  { id: 4, short: "5 · Why", title: "Map brains" },
];

function RecipeDiagram() {
  const stages = [
    { label: "Board", sub: "cars · trees" },
    { label: "Encoder", sub: "tiny in-layer" },
    { label: "Frozen W", sub: "MaleCNS LIF" },
    { label: "Decoder", sub: "tiny out-layer" },
    { label: "Hops", sub: "stay↑←→" },
  ];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 4,
        flexWrap: "wrap",
        background: "var(--bg-inset)",
        borderRadius: "var(--radius-md)",
        border: "1px solid var(--border-subtle)",
        padding: 10,
      }}
    >
      {stages.map((s, i) => (
        <React.Fragment key={s.label}>
          <div
            style={{
              flex: "1 1 72px",
              minWidth: 68,
              textAlign: "center",
              padding: "8px 6px",
              borderRadius: "var(--radius-sm)",
              background:
                s.label === "Frozen W" ? "rgba(45,212,191,0.12)" : "var(--bg-elevated)",
              border:
                s.label === "Frozen W"
                  ? "1px solid var(--border-accent)"
                  : "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              {s.sub}
            </div>
          </div>
          {i < stages.length - 1 && (
            <div
              style={{
                alignSelf: "center",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
              }}
            >
              →
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function ProofDiagram() {
  const narrow = useNarrowLayout();
  return (
    <div
      style={{
        width: "95%",
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: narrow ? "1fr" : "1fr 1fr",
        gap: 10,
      }}
    >
      <div
        style={{
          background: "var(--bg-inset)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-accent)",
          padding: 10,
          textAlign: "center",
        }}
      >
        <svg viewBox="0 0 120 70" width="100%" height={66} aria-hidden>
          <circle cx="30" cy="35" r="6" fill="#2dd4bf" />
          <circle cx="60" cy="20" r="6" fill="#2dd4bf" />
          <circle cx="60" cy="50" r="6" fill="#2dd4bf" />
          <circle cx="90" cy="35" r="6" fill="#2dd4bf" />
          <line x1="36" y1="35" x2="54" y2="22" stroke="#2dd4bf" strokeWidth="1.5" />
          <line x1="36" y1="35" x2="54" y2="48" stroke="#2dd4bf" strokeWidth="1.5" />
          <line x1="66" y1="22" x2="84" y2="33" stroke="#2dd4bf" strokeWidth="1.5" />
          <line x1="66" y1="48" x2="84" y2="37" stroke="#2dd4bf" strokeWidth="1.5" />
        </svg>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--accent-teal)", fontWeight: 700 }}>
          Intact wiring
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 17, color: "var(--text-primary)", fontWeight: 700 }}>
          ~95%
        </div>
        <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>matches teacher moves</div>
      </div>
      <div
        style={{
          background: "var(--bg-inset)",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-subtle)",
          padding: 10,
          textAlign: "center",
        }}
      >
        <svg viewBox="0 0 120 70" width="100%" height={66} aria-hidden>
          <circle cx="30" cy="35" r="6" fill="#64748b" />
          <circle cx="60" cy="20" r="6" fill="#64748b" />
          <circle cx="60" cy="50" r="6" fill="#64748b" />
          <circle cx="90" cy="35" r="6" fill="#64748b" />
          <line x1="30" y1="35" x2="90" y2="35" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 2" />
          <line x1="60" y1="20" x2="30" y2="35" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 2" />
          <line x1="60" y1="50" x2="90" y2="35" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 2" />
          <line x1="60" y1="20" x2="90" y2="35" stroke="#94a3b8" strokeWidth="1.2" opacity="0.5" />
        </svg>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-muted)", fontWeight: 700 }}>
          Shuffled wiring
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 17, color: "var(--text-primary)", fontWeight: 700 }}>
          ~10%
        </div>
        <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>same neurons, random edges</div>
      </div>
    </div>
  );
}

function RegionMini({
  label,
  color,
  blurb,
  glossary,
  children,
}: {
  label: string;
  color: string;
  /** One plain line — what this circuit does. */
  blurb: string;
  /** Tiny legend so jargon on the diagram is self-explained. */
  glossary: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--bg-inset)",
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
          background: "var(--bg-elevated)",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border-subtle)",
          aspectRatio: "280 / 86",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.3,
            letterSpacing: "0.02em",
          }}
        >
          {blurb}
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-muted)",
            lineHeight: 1.35,
          }}
        >
          {glossary}
        </div>
      </div>
    </div>
  );
}

function StepRecipe() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={body}>
        We freeze real MaleCNS wiring forever. Then we only train two thin layers around it: an{" "}
        <strong style={{ color: "var(--text-primary)" }}>encoder</strong> that turns the Crossy board into
        neuron-friendly signals, and a <strong style={{ color: "var(--text-primary)" }}>decoder</strong> that
        reads those signals into hop preferences. In the middle, each connectome cell acts like a tiny
        bucket: charge builds up, it fires a spike, then drains — a simple stand-in for a real neuron
        (called LIF).
      </p>
      <RecipeDiagram />
    </div>
  );
}

function StepRegions() {
  const narrow = useNarrowLayout();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: narrow
            ? "1fr"
            : "minmax(0, 0.9fr) minmax(0, 1.1fr)",
          gap: 12,
          alignItems: "start",
        }}
      >
        <a
          href={NEUROGLANCER_PATHWAY_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Open AL + MB + CX in Neuroglancer"
          style={{
            display: "block",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            border: "1px solid var(--border-subtle)",
            background: "#0a0e14",
          }}
        >
          <img
            src="/images/where-it-lives/al_mb_cx.png"
            alt="MaleCNS antennal lobe, mushroom body, and central complex in Neuroglancer"
            style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
          />
        </a>
        <ul style={bullets}>
          <li>
            <strong style={{ color: "#8cff59" }}>AL (antennal lobe)</strong> — smell/sense relay
            in the fly; here it reads nearby board danger.
          </li>
          <li>
            <strong style={{ color: "#ff6bf2" }}>MB (mushroom body)</strong> — learning/memory;
            here it soft-biases the next stage.
          </li>
          <li>
            <strong style={{ color: "#73ebff" }}>CX (central complex)</strong> — navigation /
            steering; here it scores stay / forward / left / right.
          </li>
        </ul>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: narrow ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        <RegionMini
          label="AL"
          color="#8cff59"
          blurb="ORN → PN"
          glossary="danger sensors → relay cells (pass the signal on)"
        >
          <AlCircuitSchematic />
        </RegionMini>
        <RegionMini
          label="MB"
          color="#ff6bf2"
          blurb="Kenyon → MBON"
          glossary="memory cells → output cells (soft-bias next stage)"
        >
          <MbCircuitSchematic />
        </RegionMini>
        <RegionMini
          label="CX"
          color="#73ebff"
          blurb="Ring → PFN → PFL"
          glossary="where I'm facing → combine cues → score stay / ↑ / ← / →"
        >
          <CxCircuitSchematic compact />
        </RegionMini>
      </div>
    </div>
  );
}

function StepCascade() {
  return (
    <ul style={bullets}>
      <li>
        Each decision: AL soft-feeds MB, which soft-feeds CX.
      </li>
      <li>
        CX outputs move preferences (sidebar bars). Look-ahead search still picks the valid hop, but brain
        scores dominate the first choice.
      </li>
      <li>
        Bars = what the brain prefers; badge = hop that actually ran (search can override a suicidal
        favorite).
      </li>
    </ul>
  );
}

function StepProof() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={body}>
        Same neurons, two tests: keep the real MaleCNS edges vs randomly shuffle who connects to whom. Intact
        wiring matches the teacher ~95% of the time; shuffle collapses to ~10%. So the skill lives in the
        frozen graph — not a lucky decoder glued on the end.
      </p>
      <ProofDiagram />
    </div>
  );
}

function StepWhy() {
  return (
    <ul style={bullets}>
      <li>Wiring diagrams let scientists test which circuits do what — not just watch pixels fire.</li>
      <li>They inspire AI that is more structured and inspectable than a giant black-box LLM.</li>
      <li>Longer term, circuit maps open paths to understand disease and repair in nervous systems.</li>
      <li>
        A game makes that concrete: you feel the connectome as an opponent in 30 seconds — then the science
        sticks.
      </li>
    </ul>
  );
}

const PANELS = [StepRecipe, StepRegions, StepCascade, StepProof, StepWhy];

export function LearnHomeBlock({ fillHeight = false }: { fillHeight?: boolean }) {
  const [step, setStep] = useState(0);
  const Panel = PANELS[step] ?? StepRecipe;
  const narrow = useNarrowLayout();

  return (
    <div
      style={{
        ...card,
        padding: narrow ? "12px 12px" : card.padding,
        ...(fillHeight
          ? {
              height: "100%",
              flex: "1 1 auto",
              minHeight: 0,
              overflow: "hidden",
              boxSizing: "border-box",
            }
          : null),
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.12em",
          color: "var(--text-muted)",
          textTransform: "uppercase",
          flexShrink: 0,
        }}
      >
        Learn
      </div>

      <div
        role="tablist"
        aria-label="Learn steps"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          flexShrink: 0,
        }}
      >
        {STEPS.map((s) => {
          const active = s.id === step;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStep(s.id)}
              title={s.title}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: narrow ? 10 : 11,
                fontWeight: 700,
                letterSpacing: "0.04em",
                padding: narrow ? "10px 10px" : "8px 12px",
                borderRadius: "var(--radius-pill)",
                cursor: "pointer",
                border: active ? "1px solid var(--border-accent)" : "1px solid var(--border-subtle)",
                background: active ? "rgba(45,212,191,0.14)" : "var(--bg-inset)",
                color: active ? "var(--accent-teal)" : "var(--text-secondary)",
                minHeight: 40,
                touchAction: "manipulation",
              }}
            >
              {s.short}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          minHeight: 0,
          flex: fillHeight ? "1 1 0" : undefined,
          overflowY: fillHeight ? "auto" : undefined,
          WebkitOverflowScrolling: fillHeight ? "touch" : undefined,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--text-primary)",
            letterSpacing: "0.02em",
            flexShrink: 0,
          }}
        >
          {STEPS[step]?.title}
        </div>
        <Panel />
      </div>
    </div>
  );
}
