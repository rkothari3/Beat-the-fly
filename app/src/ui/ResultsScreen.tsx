/**
 * Post-round screen: score roast → leaderboard → play again.
 * Loss: brief roast, then redirect to the consolation YouTube clip.
 */

import React, { useEffect } from "react";
import { LeaderEntry } from "./leaderboard";
import { LeaderboardPanel } from "./LeaderboardPanel";

/** Consolation redirect when the fly outscores the human (not on ties). */
const LOSE_REDIRECT_URL =
  "https://m.youtube.com/watch?v=8hN8cVe3hzU&pp=ygUTbW9tbXkgYXNtciBnb29kIGJveQ%3D%3D&ra=m";

/** Let the roast land before navigating away. */
const LOSE_REDIRECT_DELAY_MS = 1400;

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
  const lost = !won && !tie;
  const headline = tie ? "Tie!" : won ? "You beat the fly" : "The fly wins";
  const roast = tie
    ? "Even with a fruit fly. Respectfully, rematch."
    : won
      ? "Ts not tuff — you just beat a fly."
      : "C'mon, you can't even beat a fly?";

  useEffect(() => {
    if (!lost) return;
    const t = window.setTimeout(() => {
      window.location.assign(LOSE_REDIRECT_URL);
    }, LOSE_REDIRECT_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [lost]);

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
        {lost && (
          <p
            style={{
              margin: "10px 0 0",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--text-muted)",
              letterSpacing: "0.04em",
            }}
          >
            Sending you somewhere softer…
          </p>
        )}
      </div>

      {!lost && (
        <LeaderboardPanel
          entries={board}
          source={boardSource}
          highlightId={highlightId}
          compact
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lost ? (
          <a
            href={LOSE_REDIRECT_URL}
            style={{
              display: "block",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              fontWeight: 700,
              color: "#052e28",
              background: "var(--accent-teal)",
              border: "none",
              borderRadius: "var(--radius-pill)",
              padding: "12px 20px",
              textDecoration: "none",
              boxShadow: "0 6px 20px rgba(45,212,191,0.25)",
              minHeight: 48,
              lineHeight: "24px",
              touchAction: "manipulation",
            }}
          >
            Take me there now
          </a>
        ) : (
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
              minHeight: 48,
              touchAction: "manipulation",
            }}
          >
            Play again
          </button>
        )}
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
            minHeight: 44,
            touchAction: "manipulation",
          }}
        >
          Back to start
        </button>
      </div>
    </div>
  );
}
