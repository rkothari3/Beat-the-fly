import React from "react";
import { LeaderEntry } from "./leaderboard";

export function LeaderboardPanel({
  entries,
  source,
  highlightId,
  compact = false,
}: {
  entries: LeaderEntry[];
  source: "remote" | "local";
  highlightId?: string;
  compact?: boolean;
}) {
  const top = entries.slice(0, compact ? 5 : 10);

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: compact ? "10px 12px" : "14px 16px",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
          gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.12em",
            color: "var(--text-muted)",
            textTransform: "uppercase",
          }}
        >
          Leaderboard
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--text-muted)",
          }}
        >
          {source === "remote" ? "shared" : "this browser"} · margin vs fly
        </div>
      </div>

      {top.length === 0 ? (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.4,
          }}
        >
          No scores yet — finish a round and you&apos;ll land here.
        </p>
      ) : (
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
          {top.map((e, i) => {
            const hot = e.id === highlightId;
            return (
              <li
                key={e.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "28px 1fr auto auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "6px 8px",
                  borderRadius: "var(--radius-md)",
                  background: hot ? "rgba(45,212,191,0.12)" : "transparent",
                  border: hot ? "1px solid rgba(45,212,191,0.35)" : "1px solid transparent",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>#{i + 1}</span>
                <span
                  style={{
                    color: "var(--text-primary)",
                    fontWeight: hot ? 700 : 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.name || "Anonymous"}
                </span>
                <span style={{ color: e.won ? "var(--accent-teal)" : "var(--text-muted)" }}>
                  {e.humanScore}–{e.flyScore}
                </span>
                <span
                  style={{
                    color: e.margin >= 0 ? "var(--accent-teal)" : "var(--text-muted)",
                    minWidth: 36,
                    textAlign: "right",
                  }}
                >
                  {e.margin >= 0 ? "+" : ""}
                  {e.margin}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
