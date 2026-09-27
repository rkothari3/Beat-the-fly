/**
 * Start screen layout:
 *   Header — pathway one-liner + title
 *   L1 — Name + random + Play + hop hint
 *   L2 — Video 30% | Learn 70%
 *   L3 — Leaderboard
 */

import React from "react";
import { PlayMode } from "../brain/PathwayEngine";
import { LeaderEntry, randomPlayerName } from "./leaderboard";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { LearnHomeBlock } from "./LearnHomeBlock";

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

export function RegionPicker({
  onPick,
  playerName,
  onPlayerName,
  board = [],
  boardSource = "local",
}: {
  onPick: (k: PlayMode, opponent: FlyOpponent) => void;
  playerName: string;
  onPlayerName: (name: string) => void;
  board?: LeaderEntry[];
  boardSource?: "remote" | "local";
  headline?: string;
  stats?: { region: string; matches: number; fly_wins: number }[];
}) {
  const play = () => onPick("pathway", "brain");

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 980,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        minHeight: 0,
        maxHeight: "100%",
        overflow: "hidden",
        padding: "0 4px 8px",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            letterSpacing: "0.02em",
            color: "var(--text-secondary)",
            lineHeight: 1.35,
          }}
        >
          Split-screen Crossy Road: you vs a frozen MaleCNS pathway.
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

      {/* Line 1 — Name | Play | hop hint */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flex: "1 1 200px",
            minWidth: 0,
          }}
        >
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
              if (e.key === "Enter") play();
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
              color: "var(--text-primary)",
              background: "var(--bg-inset)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

        <button
          type="button"
          onClick={play}
          aria-label="Play full pathway AL to MB to CX"
          style={{
            flexShrink: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "#052e28",
            background: "var(--accent-teal)",
            border: "none",
            borderRadius: "var(--radius-pill)",
            padding: "10px 22px",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(45,212,191,0.25)",
            minHeight: 36,
          }}
        >
          Play
        </button>

        <div
          style={{
            flexShrink: 0,
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-secondary)",
            letterSpacing: "0.06em",
            padding: "8px 12px",
            background: "var(--bg-inset)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            whiteSpace: "nowrap",
          }}
        >
          ← ↑ → to hop
        </div>
      </div>

      {/* Line 2 — Video sets height; Learn fills same box and scrolls inside */}
      <div
        style={{
          position: "relative",
          flexShrink: 0,
          width: "100%",
          // Video width = min(30% of row, 280px); ~20% taller than square.
          // Learn is absolutely positioned so it cannot grow this row.
        }}
      >
        <div
          style={{
            position: "relative",
            width: "min(30%, 280px)",
            aspectRatio: "1 / 1.2",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            border: "1px solid var(--border-subtle)",
            background: "#0a0e14",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <video
            src="/videos/home-loop.mp4"
            autoPlay
            muted
            loop
            playsInline
            aria-label="Connectome demo loop"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
            }}
          />
        </div>

        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: "calc(min(30%, 280px) + 14px)",
            right: 0,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <LearnHomeBlock fillHeight />
        </div>
      </div>

      {/* Line 3 — Leaderboard */}
      <div style={{ flexShrink: 0, minHeight: 0, maxHeight: 200, overflow: "auto" }}>
        <LeaderboardPanel entries={board} source={boardSource} compact />
      </div>
    </div>
  );
}
