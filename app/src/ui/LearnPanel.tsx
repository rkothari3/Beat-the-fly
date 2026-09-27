/**
 * Full-screen Learn overlay — 5 curriculum beats with one diagram each.
 * Entry: RegionPicker "Learn" button. Back returns to the start screen.
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

export function LearnPanel({ onBack }: { onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const beat = SCIENCE_BEATS[index];
  const n = SCIENCE_BEATS.length;

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxHeight: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div>
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
          <h2
            style={{
              margin: "4px 0 0",
              fontSize: 22,
              fontWeight: 700,
              color: "var(--text-primary)",
              lineHeight: 1.2,
            }}
          >
            How the fly thinks (honestly)
          </h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-secondary)",
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-pill)",
            padding: "8px 14px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ← Back
        </button>
      </div>

      {/* Section tabs */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          flexShrink: 0,
        }}
      >
        {SCIENCE_BEATS.map((b, i) => {
          const active = i === index;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => setIndex(i)}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: active ? 700 : 500,
                color: active ? "#052e28" : "var(--text-secondary)",
                background: active ? "var(--accent-teal)" : "var(--bg-inset)",
                border: active ? "none" : "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-pill)",
                padding: "6px 10px",
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
          flex: "1 1 auto",
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
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
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          Beat {index + 1} / {n}
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "var(--text-primary)",
            lineHeight: 1.25,
          }}
        >
          {beat.title}
        </h3>

        <div
          style={{
            aspectRatio: "320 / 140",
            width: "100%",
            maxHeight: 200,
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {DIAGRAMS[beat.id]}
        </div>

        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--accent-teal)",
            letterSpacing: "0.02em",
          }}
        >
          {beat.caption}
        </div>

        <ul
          style={{
            margin: 0,
            padding: "0 0 0 18px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.45,
          }}
        >
          {beat.body.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <div
          style={{
            marginTop: "auto",
            paddingTop: 10,
            borderTop: "1px solid var(--border-subtle)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-muted)",
            lineHeight: 1.4,
          }}
        >
          {SCIENCE_SCOPE}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: index === 0 ? "var(--text-muted)" : "var(--text-secondary)",
            background: "var(--bg-inset)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-pill)",
            padding: "10px 16px",
            cursor: index === 0 ? "default" : "pointer",
            opacity: index === 0 ? 0.5 : 1,
          }}
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => {
            if (index >= n - 1) onBack();
            else setIndex((i) => i + 1);
          }}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 700,
            color: "#052e28",
            background: "var(--accent-teal)",
            border: "none",
            borderRadius: "var(--radius-pill)",
            padding: "10px 18px",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(45,212,191,0.25)",
          }}
        >
          {index >= n - 1 ? "Done" : "Next"}
        </button>
      </div>
    </div>
  );
}
