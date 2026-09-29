/**
 * Mobile hop controls — mirrors keyboard ↑ ← → Space.
 *
 * UX choices (why not swipe):
 *   - This game has an explicit "stay" action; swipe maps poorly to stay.
 *   - Home/Learn panels scroll; swipe-to-hop fights that gesture language.
 *   - Visible buttons teach the four hops in one glance (same as desktop hint).
 *
 * Placement: bottom of the YOU half so the FLY pane + brain story stay clear.
 * pointerdown (not click) fires immediately — hops feel snappy on touchscreens.
 */

import React from "react";
import { ACTION_FORWARD, ACTION_LEFT, ACTION_RIGHT, ACTION_STAY, Action } from "../core/LaneWorld";

const BTN: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(10,12,16,0.62)",
  color: "var(--text-primary)",
  fontFamily: "var(--font-mono)",
  fontSize: 17,
  fontWeight: 700,
  lineHeight: 1,
  display: "grid",
  placeItems: "center",
  cursor: "pointer",
  touchAction: "manipulation",
  WebkitTapHighlightColor: "transparent",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
  userSelect: "none",
  padding: 0,
};

function HopButton({
  label,
  ariaLabel,
  action,
  onHop,
  style,
}: {
  label: string;
  ariaLabel: string;
  action: Action;
  onHop: (a: Action) => void;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      style={{ ...BTN, ...style }}
      onPointerDown={(e) => {
        // Prevent synthetic mouse click + focus scroll jank on mobile Safari.
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        onHop(action);
      }}
    >
      {label}
    </button>
  );
}

export function TouchHopPad({
  onHop,
  disabled = false,
}: {
  onHop: (action: Action) => void;
  disabled?: boolean;
}) {
  if (disabled) return null;

  return (
    <div
      role="group"
      aria-label="Hop controls"
      style={{
        position: "absolute",
        left: 0,
        bottom: 0,
        width: "50%",
        zIndex: 6,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        padding: "0 8px calc(8px + env(safe-area-inset-bottom, 0px))",
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          pointerEvents: "auto",
          display: "grid",
          gridTemplateColumns: "46px 46px 46px",
          gridTemplateRows: "46px 46px",
          gap: 7,
          justifyItems: "center",
        }}
      >
        <div style={{ gridColumn: 2, gridRow: 1 }}>
          <HopButton label="↑" ariaLabel="Hop forward" action={ACTION_FORWARD} onHop={onHop} />
        </div>
        <div style={{ gridColumn: 1, gridRow: 2 }}>
          <HopButton label="←" ariaLabel="Hop left" action={ACTION_LEFT} onHop={onHop} />
        </div>
        <div style={{ gridColumn: 2, gridRow: 2 }}>
          <HopButton
            label="·"
            ariaLabel="Stay"
            action={ACTION_STAY}
            onHop={onHop}
            style={{ fontSize: 22 }}
          />
        </div>
        <div style={{ gridColumn: 3, gridRow: 2 }}>
          <HopButton label="→" ariaLabel="Hop right" action={ACTION_RIGHT} onHop={onHop} />
        </div>
      </div>
    </div>
  );
}
