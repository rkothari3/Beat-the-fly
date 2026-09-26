/**
 * Main demo UI — live match chrome (prompt_1) + region picker overlay (prompt_2).
 *
 * Silent-first design: a stranger should understand the game from on-screen
 * text alone (loud hackathon floor = no audio dependency).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LaneWorld, ACTION_FORWARD, ACTION_LEFT, ACTION_RIGHT, ACTION_STAY, Action } from "../core/LaneWorld";
import { observe } from "../core/observe";
import { scriptedBot } from "../core/scriptedBot";
import { SplitScreen } from "../game/SplitScreen";
import { preloadCrossyAssets } from "../game/CrossyAssets";
import { LifEngine, loadRegion, RegionKey, StepResult } from "../brain/LifEngine";
import { BrainPanel } from "./BrainPanel";
import { RegionPicker, REGIONS, FlyOpponent } from "./RegionPicker";
import { TopBar, ViewportPill } from "./TopBar";

type Phase = "picker" | "playing" | "over";
/**
 * Live decision source for the fly.
 * Default "bot" = one scripted look-ahead opponent (no Strong/Hard tiers).
 * "brain" = region LIF demo (science story; can be easier than the bot).
 *
 * Why look-ahead is enough (flychess analogy): chess.js filters illegal moves so
 * search stays on legal play — our bot scores only safe hops. Don't port full chess RL.
 */
type FlyController = "brain" | "bot" | "random";

const ROUND_SECONDS = 45;
const DECISION_EVERY_MS = 250;

function opponentToController(op: FlyOpponent): FlyController {
  return op === "brain" ? "brain" : "bot";
}

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const splitRef = useRef<SplitScreen | null>(null);
  const humanRef = useRef<LaneWorld | null>(null);
  const flyRef = useRef<LaneWorld | null>(null);
  const engineRef = useRef<LifEngine | null>(null);
  const pendingHuman = useRef<Action | null>(null);

  const [phase, setPhase] = useState<Phase>("picker");
  const [region, setRegion] = useState<RegionKey>("central_complex");
  const [controller, setController] = useState<FlyController>("bot");
  const [opponent, setOpponent] = useState<FlyOpponent>("bot");
  const [scores, setScores] = useState({ human: 0, fly: 0 });
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [diag, setDiag] = useState<StepResult | null>(null);
  const [status, setStatus] = useState("Pick a brain region to start.");
  const [stats, setStats] = useState<{ region: string; matches: number; fly_wins: number }[]>([]);
  const [pickerSelection, setPickerSelection] = useState<RegionKey>("central_complex");
  const seedRef = useRef(1);

  // Warm MagicaVoxel kit as soon as the UI mounts so play doesn't flash boxes.
  useEffect(() => {
    void preloadCrossyAssets().catch((e) =>
      console.error("[crossy] preload failed", e)
    );
  }, []);

  // Bootstrap WebGL once. ResizeObserver keeps the buffer non-zero when the
  // flex layout settles (a 0x0 first paint was making the canvas look blank).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const split = new SplitScreen(canvas);
    splitRef.current = split;

    const applySize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      if (w > 0 && h > 0) split.resize(w, h);
    };
    applySize();
    const ro = new ResizeObserver(applySize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    return () => {
      ro.disconnect();
      split.dispose();
      if (splitRef.current === split) splitRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== "playing") return;
      const k = e.key.toLowerCase();
      // No Down/S — classic Crossy allows hop-back; we removed that affordance entirely.
      // Space = wait in place (STAY), not reverse.
      if (k === "arrowup" || k === "w") pendingHuman.current = ACTION_FORWARD;
      else if (k === "arrowleft" || k === "a") pendingHuman.current = ACTION_LEFT;
      else if (k === "arrowright" || k === "d") pendingHuman.current = ACTION_RIGHT;
      else if (k === " ") pendingHuman.current = ACTION_STAY;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  useEffect(() => {
    fetch("http://localhost:8787/stats")
      .then((r) => (r.ok ? r.json() : []))
      .then(setStats)
      .catch(() => setStats([]));
  }, [phase]);

  async function startRound(nextRegion: RegionKey, nextOpponent: FlyOpponent = opponent) {
    setRegion(nextRegion);
    setPickerSelection(nextRegion);
    setOpponent(nextOpponent);
    setStatus("Loading...");
    seedRef.current = (Math.random() * 1e9) | 0;
    const [h, f] = LaneWorld.pair(seedRef.current);
    humanRef.current = h;
    flyRef.current = f;

    // Why default to bot? The connectome brain imitates the teacher. Until (re)trained
    // on a strong teacher, live "brain" mode is often easier to beat than the look-ahead bot.
    let mode: FlyController = opponentToController(nextOpponent);

    try {
      const bundle = await loadRegion(nextRegion);
      const eng = new LifEngine(bundle);
      const err = eng.runSelfcheck();
      if (err > 1e-2) {
        console.warn("selfcheck logit error", err);
      }
      engineRef.current = eng;

      if (mode === "brain") {
        setStatus(
          err > 1e-2
            ? `Selfcheck warn (max err=${err.toFixed(4)}) — live brain playing.`
            : `Live brain: ${bundle.label} (${bundle.n} real neurons). ↑←→ / WASD to hop!`
        );
      } else {
        setStatus(
          `Look-ahead fly bot. Region panel shows ${bundle.label}. ↑←→ / WASD to hop!`
        );
      }
    } catch (e) {
      console.warn("Brain load failed", e);
      engineRef.current = null;
      if (mode === "brain") {
        mode = "bot";
        setOpponent("bot");
        setStatus("Brain weights not found — fly uses look-ahead bot. ↑←→ / WASD to hop!");
      } else {
        setStatus("Look-ahead fly ready (no brain weights — bot only). ↑←→ / WASD to hop!");
      }
    }
    setController(mode);
    setTimeLeft(ROUND_SECONDS);
    setScores({ human: 0, fly: 0 });
    setDiag(null);
    splitRef.current?.human.reset();
    splitRef.current?.fly.reset();
    setPhase("playing");
  }

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let decisionAcc = 0;
    let ended = false;

    if (!humanRef.current || !flyRef.current) {
      const [h, f] = LaneWorld.pair(42);
      humanRef.current = h;
      flyRef.current = f;
    }

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const split = splitRef.current;
      const human = humanRef.current;
      const fly = flyRef.current;
      if (!split || !human || !fly) return;

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (phase === "playing") {
        acc += dt;
        decisionAcc += dt * 1000;
        const worldDt = human.dt;

        while (acc >= worldDt) {
          acc -= worldDt;
          if (pendingHuman.current !== null && human.alive) {
            human.act(pendingHuman.current);
            pendingHuman.current = null;
          }
          human.tick();
          fly.tick();
        }

        if (decisionAcc >= DECISION_EVERY_MS) {
          decisionAcc = 0;
          if (fly.alive) {
            let action: Action = ACTION_STAY;
            if (controller === "brain" && engineRef.current) {
              const obs = observe(fly);
              const result = engineRef.current.step(obs);
              action = result.action as Action;
              setDiag(result);
            } else if (controller === "bot") {
              // One opponent path: deep look-ahead (no Strong/Hard UI tiers).
              action = scriptedBot(fly);
              // Still step the region LIF for the full-brain activity display (viz only).
              // Pitch: glowing atlas ≠ the bot that picks the hop.
              if (engineRef.current) {
                const result = engineRef.current.step(observe(fly));
                setDiag(result);
              }
            } else {
              action = ((Math.random() * 4) | 0) as Action;
            }
            fly.act(action);
          }
        }

        setScores({ human: human.score, fly: fly.score });
        setTimeLeft(Math.max(0, ROUND_SECONDS - human.time));

        if (!ended && (human.time >= ROUND_SECONDS || (!human.alive && !fly.alive))) {
          ended = true;
          finishRound(human, fly);
        }
      } else if (phase === "picker") {
        acc += dt;
        decisionAcc += dt * 1000;
        const worldDt = human.dt;
        while (acc >= worldDt) {
          acc -= worldDt;
          human.tick();
          fly.tick();
        }
        if (decisionAcc >= DECISION_EVERY_MS) {
          decisionAcc = 0;
          if (human.alive) human.act(scriptedBot(human));
          if (fly.alive) fly.act(scriptedBot(fly));
          if (!human.alive && !fly.alive) {
            seedRef.current = (seedRef.current + 1) | 0;
            const [h, f] = LaneWorld.pair(seedRef.current);
            humanRef.current = h;
            flyRef.current = f;
            split.human.reset();
            split.fly.reset();
          }
        }
      }

      split.render(humanRef.current!, flyRef.current!);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, controller, region]);

  function finishRound(human: LaneWorld, fly: LaneWorld) {
    const winner =
      human.score === fly.score ? "Tie" : human.score > fly.score ? "Human wins" : "Fly wins";
    setStatus(`${winner}! Human ${human.score} — Fly ${fly.score}. Pick a region to rematch.`);
    setPhase("over");
    fetch("http://localhost:8787/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region,
        human_score: human.score,
        fly_score: fly.score,
        controller,
        duration_s: human.time,
        spike_summary: diag?.stageSpikes ?? {},
      }),
    }).catch(() => {});
  }

  const regionMeta = useMemo(() => REGIONS.find((r) => r.key === region)!, [region]);
  const showPicker = phase === "picker" || phase === "over";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        overflow: "hidden",
        background: "var(--bg-app)",
      }}
    >
      <TopBar
        humanScore={scores.human}
        flyScore={scores.fly}
        timeLeft={phase === "playing" ? timeLeft : phase === "over" ? 0 : ROUND_SECONDS}
        roundSeconds={ROUND_SECONDS}
      />

      {/*
        Why a relative wrapper: the match grid (game + brain) stays mounted underneath,
        while the RegionPicker is a full-bleed overlay — matching prompt_2, not a side panel.
      */}
      <div style={{ position: "relative", flex: 1, minHeight: 0, minWidth: 0 }}>
        {/*
          Equal thirds of the window: human | fly | brain.
          One WebGL canvas spans columns 1–2 (2/3 width); SplitScreen scissors
          50/50 so each play pane is exactly 1/3 of the page. Column 3 = HUD.
        */}
        <div
          style={{
            height: "100%",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              gridColumn: "1 / 3",
              position: "relative",
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
              background: "var(--bg-inset)",
              margin: 12,
              marginRight: 6,
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-viewport)",
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                display: "block",
                borderRadius: "var(--radius-lg)",
              }}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: "50%",
                width: 1,
                background: "rgba(255,255,255,0.09)",
                pointerEvents: "none",
                zIndex: 2,
              }}
            />

            {/* Viewport chrome — wraps existing SplitScreen canvas */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                pointerEvents: "none",
                zIndex: 3,
                padding: 10,
              }}
            >
              <div style={{ position: "relative" }}>
                <ViewportPill color="var(--accent-you)">YOU · ↑←→ / WASD</ViewportPill>
              </div>
              <div style={{ position: "relative" }}>
                <ViewportPill color="var(--accent-fly)">
                  FLY · {regionMeta.label}
                  {phase === "playing" && controller === "bot" ? " · look-ahead" : ""}
                </ViewportPill>
                {phase === "playing" && controller === "brain" && (
                  <ViewportPill
                    color="var(--accent-teal)"
                    style={{ position: "absolute", right: 0, bottom: 0 }}
                  >
                    LIVE BRAIN · every 0.25 s
                  </ViewportPill>
                )}
                {phase === "playing" && controller === "bot" && (
                  <ViewportPill
                    color="var(--accent-teal)"
                    style={{ position: "absolute", right: 0, bottom: 0 }}
                  >
                    LOOK-AHEAD BOT
                  </ViewportPill>
                )}
              </div>
            </div>
          </div>

          <aside
            style={{
              gridColumn: "3",
              minWidth: 0,
              minHeight: 0,
              borderLeft: "1px solid var(--border-subtle)",
              overflow: "hidden",
              background: "var(--bg-panel)",
              boxShadow: "var(--shadow-panel)",
            }}
          >
            <BrainPanel
              regionKey={region}
              label={regionMeta.label}
              diag={diag}
              nSteps={engineRef.current?.region.nSteps}
              liveBrain={controller === "brain"}
            />
          </aside>
        </div>

        {/* Full-width picker overlay — dims game + brain, centered cards (prompt_2) */}
        {showPicker && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              background: "rgba(8,10,15,0.78)",
              backdropFilter: "blur(10px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px 24px 16px",
              overflow: "hidden",
            }}
          >
            <RegionPicker
              onPick={(r, op) => startRound(r, op)}
              selected={pickerSelection}
              onSelect={setPickerSelection}
              opponent={opponent}
              onOpponent={setOpponent}
              headline={phase === "over" ? status : undefined}
              stats={stats}
            />
          </div>
        )}
      </div>
    </div>
  );
}

