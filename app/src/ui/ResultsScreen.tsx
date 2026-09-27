/**
 * Post-round screen: score roast → leaderboard → play again.
 */

import React from "react";
import { LeaderEntry } from "./leaderboard";
import { LeaderboardPanel } from "./LeaderboardPanel";

export function ResultsScreen({
  humanScore,
  flyScore,
  playerName,
  board,
  boardSource,
  highlightId,
  onPlayAgain,
  onBackHome,
}: {
  humanScore: number;
  flyScore: number;
  playerName: string;
  board: LeaderEntry[];
  boardSource: "remote" | "local";
  highlightId?: string;
  roundSeed?: number;
  onPlayAgain: () => void;
  onBackHome: () => void;
}) {
  const won = humanScore > flyScore;
  const tie = humanScore === flyScore;
  const headline = tie ? "Tie!" : won ? "You beat the fly" : "The fly wins";
  const roast = tie
    ? "Even with a fruit fly. Respectfully, rematch."
    : won
      ? "Ts not tuff — you just beat a fly."
      : "C'mon, you can't even beat a fly?";

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 520,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: 14,
        maxHeight: "100%",
        overflow: "auto",
        padding: "4px 0",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          Round over
        </div>
        <h2
          style={{
            margin: "6px 0 4px",
            fontSize: 28,
            fontWeight: 700,
            color: won || tie ? "var(--accent-teal)" : "var(--text-primary)",
          }}
        >
          {headline}
        </h2>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 18,
            color: "var(--text-secondary)",
          }}
        >
          {playerName || "You"} {humanScore} · Fly {flyScore}
        </div>
      </div>

      <div
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-accent)",
          borderRadius: "var(--radius-lg)",
          padding: "14px 16px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.4,
            color: "var(--text-primary)",
            fontWeight: 600,
          }}
        >
          {roast}
        </p>
      </div>

      <LeaderboardPanel
        entries={board}
        source={boardSource}
        highlightId={highlightId}
        compact
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          onClick={onPlayAgain}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            fontWeight: 700,
            color: "#052e28",
            background: "var(--accent-teal)",
            border: "none",
            borderRadius: "var(--radius-pill)",
            padding: "12px 20px",
            cursor: "pointer",
            boxShadow: "0 6px 20px rgba(45,212,191,0.25)",
          }}
        >
          Play again
        </button>
        <button
          type="button"
          onClick={onBackHome}
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            color: "var(--text-secondary)",
            background: "transparent",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-pill)",
            padding: "10px 16px",
            cursor: "pointer",
          }}
        >
          Back to start
        </button>
      </div>
    </div>
  );
}
