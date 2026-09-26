import React from "react";

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
}: {
  humanScore: number;
  flyScore: number;
  timeLeft: number;
  roundSeconds: number;
}) {
  const mins = Math.floor(timeLeft / 60);
  const secs = Math.ceil(timeLeft % 60);
  const clock = `${mins}:${secs.toString().padStart(2, "0")}`;
  const progress = Math.max(0, Math.min(1, timeLeft / roundSeconds));

  return (
    <header
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: 16,
        padding: "10px 18px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--bg-panel)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <BrandMark />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: 0.2 }}>Beat the Fly</div>
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
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-pill)",
            padding: "6px 18px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <ScoreChip color="var(--accent-you)" label="YOU" value={humanScore} />
          <ScoreChip color="var(--accent-fly)" label="FLY" value={flyScore} />
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--text-muted)",
            letterSpacing: "0.04em",
          }}
        >
          rows crossed
        </div>
      </div>

      <div style={{ justifySelf: "end", textAlign: "right" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-mono-lg)",
            fontWeight: 600,
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {clock}
        </div>
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
        <div
          style={{
            marginTop: 6,
            width: 88,
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
              // Cheap CSS transition smooths the 1 Hz clock updates.
              transition: "width 0.3s linear",
            }}
          />
        </div>
      </div>
    </header>
  );
}

function ScoreChip({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          // No neon glow — player identity dots stay flat (Linear-style restraint).
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          color: "var(--text-secondary)",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 18,
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
