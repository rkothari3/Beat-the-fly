import React from "react";
import { useNarrowLayout } from "./useNarrowLayout";

/** Fly emoji mark in the top bar — reads as the product, not a generic logo. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        fontSize: size * 0.9,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      🪰
    </span>
  );
}

export function TopBar({
  humanScore,
  flyScore,
  timeLeft,
  roundSeconds,
  showScoreboard = true,
  flyScoreOnly = false,
  showTimer = true,
}: {
  humanScore: number;
  flyScore: number;
  timeLeft: number;
  roundSeconds: number;
  /** Hide YOU/FLY chip on the home (picker) screen. */
  showScoreboard?: boolean;
  /** Spectate mode: only show the fly's score. */
  flyScoreOnly?: boolean;
  /** Hide clock + bar (home + infinite spectate). */
  showTimer?: boolean;
}) {
  const narrow = useNarrowLayout();
  const mins = Math.floor(timeLeft / 60);
  const secs = Math.ceil(timeLeft % 60);
  const clock = `${mins}:${secs.toString().padStart(2, "0")}`;
  const progress = Math.max(0, Math.min(1, timeLeft / roundSeconds));

  // Mobile: drop the long subtitle + "rows crossed" caption so brand, score,
  // and timer stay on one calm row without wrapping into the game viewport.
  return (
    <header
      style={{
        display: "grid",
        gridTemplateColumns: narrow ? "auto 1fr auto" : "1fr auto 1fr",
        alignItems: "center",
        gap: narrow ? 8 : 16,
        padding: narrow ? "8px 10px" : "10px 18px",
        // Notch / Dynamic Island: keep brand clear of the status bar.
        paddingTop: narrow ? "calc(8px + env(safe-area-inset-top, 0px))" : "10px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: narrow ? 6 : 10, minWidth: 0 }}>
        <BrandMark size={narrow ? 22 : 28} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: narrow ? 14 : 16,
              letterSpacing: 0.2,
              whiteSpace: "nowrap",
            }}
          >
            Beat the Fly
          </div>
          {!narrow && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-mono-sm)",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Real MaleCNS connectome · frozen wiring
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          justifySelf: narrow ? "center" : undefined,
          visibility: showScoreboard ? "visible" : "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: narrow ? 10 : 16,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-pill)",
            padding: narrow ? "4px 10px" : "6px 18px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {!flyScoreOnly && (
            <ScoreChip
              color="var(--accent-you)"
              label="YOU"
              value={humanScore}
              compact={narrow}
            />
          )}
          <ScoreChip
            color="var(--accent-fly)"
            label="FLY"
            value={flyScore}
            compact={narrow}
          />
        </div>
        {!narrow && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--text-muted)",
              letterSpacing: "0.04em",
            }}
          >
            {flyScoreOnly ? "watching · rows crossed" : "rows crossed"}
          </div>
        )}
      </div>

      <div
        style={{
          justifySelf: "end",
          display: "flex",
          alignItems: "center",
          gap: narrow ? 8 : 14,
        }}
      >
        <div
          style={{
            textAlign: "right",
            visibility: showTimer ? "visible" : "hidden",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: narrow ? 18 : "var(--text-mono-lg)",
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
            }}
          >
            {clock}
          </div>
          {!narrow && (
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "var(--text-mono-sm)",
                color: "var(--text-muted)",
                marginTop: 4,
              }}
            >
              round · {roundSeconds} s
            </div>
          )}
          <div
            style={{
              marginTop: narrow ? 4 : 6,
              width: narrow ? 56 : 88,
              height: 3,
              borderRadius: "var(--radius-pill)",
              background: "var(--bg-inset)",
              marginLeft: "auto",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                background: "var(--accent-teal)",
                borderRadius: "var(--radius-pill)",
                transition: "width 0.3s linear",
              }}
            />
          </div>
        </div>

        <a
          href="https://github.com/rkothari3/Beat-the-fly"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Beat the Fly on GitHub"
          title="GitHub"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: narrow ? 30 : 34,
            height: narrow ? 30 : 34,
            borderRadius: "var(--radius-md)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-card)",
            flexShrink: 0,
            transition: "color 0.15s ease, border-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-primary)";
            e.currentTarget.style.borderColor = "var(--border-accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-secondary)";
            e.currentTarget.style.borderColor = "var(--border-subtle)";
          }}
        >
          <GitHubMark size={narrow ? 16 : 18} />
        </a>
      </div>
    </header>
  );
}

/** Official GitHub Mark — simple monochrome SVG, inherits `currentColor`. */
function GitHubMark({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function ScoreChip({
  color,
  label,
  value,
  compact = false,
}: {
  color: string;
  label: string;
  value: number;
  compact?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 5 : 8 }}>
      <span
        style={{
          width: compact ? 6 : 8,
          height: compact ? 6 : 8,
          borderRadius: "50%",
          background: color,
          // No neon glow — player identity dots stay flat (Linear-style restraint).
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: compact ? 10 : 11,
          color: "var(--text-secondary)",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: compact ? 15 : 18,
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export function ViewportPill({
  color,
  children,
  style,
}: {
  color: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "rgba(10,12,16,0.72)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "var(--radius-pill)",
        padding: "5px 10px",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--text-primary)",
        backdropFilter: "blur(6px)",
        pointerEvents: "none",
        ...style,
      }}
    >
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color }} />
      {children}
    </div>
  );
}
