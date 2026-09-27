/**
 * Compact Learn block for the start screen — sits above AL|MB|CX.
 * Tabs cycle the 5 curriculum beats in-place; optional deep-dive opens LearnPanel.
 */

import React, { useState } from "react";
import { SCIENCE_BEATS, SCIENCE_SCOPE, type ScienceBeatId } from "./scienceCopy";
import {
  CascadeSearchDiagram,
  ProofWiringDiagram,
  RecipeDiagram,
  WhyMapDiagram,
  WhyThreeDiagram,
} from "./learn/LearnDiagrams";

const DIAGRAMS: Record<ScienceBeatId, React.ReactNode> = {
  recipe: <RecipeDiagram />,
  whyThree: <WhyThreeDiagram />,
  cascadeSearch: <CascadeSearchDiagram />,
  proofWiring: <ProofWiringDiagram />,
  whyMap: <WhyMapDiagram />,
};

export function LearnStrip({ onExplore }: { onExplore?: (beatIndex: number) => void }) {
  const [index, setIndex] = useState(0);
  const beat = SCIENCE_BEATS[index];
  const n = SCIENCE_BEATS.length;

  return (
    <section
      aria-label="Learn how the fly brain works"
      style={{
        flexShrink: 0,
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "10px 12px",
        boxShadow: "var(--shadow-card)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-label)",
              letterSpacing: "0.14em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            Learn
          </div>
          <div
            style={{
              marginTop: 2,
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.25,
            }}
          >
            How the fly thinks
          </div>
        </div>
        {onExplore ? (
          <button
            type="button"
            onClick={() => onExplore(index)}
            aria-label="Open full Learn lesson"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: "var(--text-secondary)",
              background: "var(--bg-inset)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-pill)",
              padding: "6px 12px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Explore →
          </button>
        ) : null}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 5,
        }}
      >
        {SCIENCE_BEATS.map((b, i) => {
          const active = i === index;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={active}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                color: active ? "#052e28" : "var(--text-secondary)",
                background: active ? "var(--accent-teal)" : "var(--bg-inset)",
                border: active ? "none" : "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-pill)",
                padding: "4px 8px",
                cursor: "pointer",
              }}
            >
              {i + 1}. {b.nav}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)",
          gap: 10,
          alignItems: "stretch",
          minWidth: 0,
        }}
      >
        <div
          style={{
            aspectRatio: "320 / 140",
            maxHeight: 88,
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            background: "var(--bg-inset)",
          }}
        >
          {DIAGRAMS[beat.id]}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            minWidth: 0,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            {index + 1} / {n}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.3,
            }}
          >
            {beat.title}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              lineHeight: 1.35,
            }}
          >
            {beat.body[0]}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--accent-teal)",
              letterSpacing: "0.02em",
              lineHeight: 1.3,
            }}
          >
            {beat.caption}
          </div>
        </div>
      </div>

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          color: "var(--text-muted)",
          lineHeight: 1.35,
          borderTop: "1px solid var(--border-subtle)",
          paddingTop: 6,
        }}
      >
        {SCIENCE_SCOPE}
      </div>
    </section>
  );
}
