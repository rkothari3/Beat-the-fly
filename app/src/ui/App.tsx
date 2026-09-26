/**
 * Main demo UI — live match chrome + pathway / region picker overlay.
 *
 * Live pathway (default science mode): AL→MB→CX LIF scores moves, look-ahead
 * search picks the hop (Fly Chess hybrid). Single-region = ablation LIF-only.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LaneWorld, ACTION_FORWARD, ACTION_LEFT, ACTION_RIGHT, ACTION_STAY, Action } from "../core/LaneWorld";
import { observe } from "../core/observe";
import { scriptedBot } from "../core/scriptedBot";
import { SplitScreen } from "../game/SplitScreen";
import { preloadCrossyAssets } from "../game/CrossyAssets";
import { LifEngine, loadRegion, RegionKey, StepResult } from "../brain/LifEngine";
import { PathwayEngine, PlayMode, isPathway, isRegionKey } from "../brain/PathwayEngine";
import { BrainPanel } from "./BrainPanel";
import { RegionPicker, PLAY_MODES, FlyOpponent } from "./RegionPicker";
import { TopBar, ViewportPill } from "./TopBar";

type Phase = "picker" | "playing" | "over";
/**
 * Live decision source for the fly.
 * "bot" = look-ahead only.
 * "brain" = pathway hybrid (prior + search) or single-region LIF ablation.
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
  const pathwayRef = useRef<PathwayEngine | null>(null);
  const pendingHuman = useRef<Action | null>(null);

  const [phase, setPhase] = useState<Phase>("picker");
  const [playMode, setPlayMode] = useState<PlayMode>("pathway");
  const [controller, setController] = useState<FlyController>("bot");
  const [opponent, setOpponent] = useState<FlyOpponent>("brain");
  const [scores, setScores] = useState({ human: 0, fly: 0 });
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [diag, setDiag] = useState<StepResult | null>(null);
  const [status, setStatus] = useState("Pick a play mode to start.");
  const [stats, setStats] = useState<{ region: string; matches: number; fly_wins: number }[]>([]);
  const [pickerSelection, setPickerSelection] = useState<PlayMode>("pathway");
  const seedRef = useRef(1);

  useEffect(() => {
    void preloadCrossyAssets().catch((e) =>
      console.error("[crossy] preload failed", e)
    );
  }, []);

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

  async function startRound(nextMode: PlayMode, nextOpponent: FlyOpponent = opponent) {
    setPlayMode(nextMode);
    setPickerSelection(nextMode);
    setOpponent(nextOpponent);
    setStatus("Loading...");
    seedRef.current = (Math.random() * 1e9) | 0;
    const [h, f] = LaneWorld.pair(seedRef.current);
    humanRef.current = h;
    flyRef.current = f;

    let mode: FlyController = opponentToController(nextOpponent);
    engineRef.current = null;
    pathwayRef.current = null;

    try {
      if (isPathway(nextMode)) {
        const path = await PathwayEngine.load();
        const err = path.runSelfcheck();
        if (err > 1e-2) console.warn("pathway selfcheck logit error", err);
        pathwayRef.current = path;
        if (mode === "brain") {
          setStatus(
            err > 1e-2
              ? `Selfcheck warn (max err=${err.toFixed(4)}) — pathway hybrid.`
              : "Live pathway AL→MB→CX + look-ahead search. ↑←→ / WASD to hop!"
          );
        } else {
          setStatus("Look-ahead fly. Atlas shows AL→MB→CX pathway glow. ↑←→ / WASD!");
        }
      } else {
        const bundle = await loadRegion(nextMode);
        const eng = new LifEngine(bundle);
        const err = eng.runSelfcheck();
        if (err > 1e-2) console.warn("selfcheck logit error", err);
        engineRef.current = eng;
        if (mode === "brain") {
          setStatus(
            err > 1e-2
              ? `Selfcheck warn (max err=${err.toFixed(4)}) — single-region ablation.`
              : `Ablation: live ${bundle.label} LIF only (no search). ↑←→ / WASD!`
          );
        } else {
          setStatus(`Look-ahead fly. Panel shows ${bundle.label}. ↑←→ / WASD to hop!`);
        }
      }
    } catch (e) {
      console.warn("Brain load failed", e);
      engineRef.current = null;
      pathwayRef.current = null;
      if (mode === "brain") {
        mode = "bot";
        setOpponent("bot");
        setStatus("Brain weights not found — fly uses look-ahead bot. ↑←→ / WASD!");
      } else {
        setStatus("Look-ahead fly ready (no brain weights). ↑←→ / WASD to hop!");
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
            const path = pathwayRef.current;
            const eng = engineRef.current;

            if (controller === "brain" && path && isPathway(playMode)) {
              // Hybrid: pathway scores → look-ahead picks legal hop.
              const result = path.step(observe(fly));
              setDiag(result);
              action = scriptedBot(fly, { prior: result.probs });
            } else if (controller === "brain" && eng) {
              // Single-region ablation: LIF chooses directly.
              const result = eng.step(observe(fly));
              action = result.action as Action;
              setDiag(result);
            } else if (controller === "bot") {
              action = scriptedBot(fly);
              if (path) {
                setDiag(path.step(observe(fly)));
              } else if (eng) {
                setDiag(eng.step(observe(fly)));
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
            const [h2, f2] = LaneWorld.pair(seedRef.current);
            humanRef.current = h2;
            flyRef.current = f2;
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
  }, [phase, controller, playMode]);

  function finishRound(human: LaneWorld, fly: LaneWorld) {
    const winner =
      human.score === fly.score ? "Tie" : human.score > fly.score ? "Human wins" : "Fly wins";
    setStatus(`${winner}! Human ${human.score} — Fly ${fly.score}. Pick a mode to rematch.`);
    setPhase("over");
    fetch("http://localhost:8787/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        region: playMode,
        human_score: human.score,
        fly_score: fly.score,
        controller,
        duration_s: human.time,
        spike_summary: diag?.stageSpikes ?? {},
      }),
    }).catch(() => {});
  }

  const modeMeta = useMemo(
    () => PLAY_MODES.find((r) => r.key === playMode)!,
    [playMode]
  );
  const showPicker = phase === "picker" || phase === "over";
  const pathwayMode = isPathway(playMode);
  const vizRegion: RegionKey | undefined = isRegionKey(playMode) ? playMode : undefined;

  const flyPillLabel =
    pathwayMode
      ? "FLY · AL→MB→CX"
      : `FLY · ${modeMeta.label}`;

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

      <div style={{ position: "relative", flex: 1, minHeight: 0, minWidth: 0 }}>
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
            }}
          >
            <canvas
              ref={canvasRef}
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                background: "#0a0c10",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
              }}
            >
              <div style={{ position: "relative" }}>
                <ViewportPill color="var(--accent-you)">YOU · ↑←→ / WASD</ViewportPill>
              </div>
              <div style={{ position: "relative" }}>
                <ViewportPill color="var(--accent-fly)">
                  {flyPillLabel}
                  {phase === "playing" && controller === "bot" ? " · look-ahead" : ""}
                  {phase === "playing" &&
                  controller === "brain" &&
                  pathwayMode
                    ? " · hybrid"
                    : ""}
                </ViewportPill>
                {phase === "playing" && controller === "brain" && pathwayMode && (
                  <ViewportPill
                    color="var(--accent-teal)"
                    style={{ position: "absolute", right: 0, bottom: 0 }}
                  >
                    PATHWAY + SEARCH · 0.25 s
                  </ViewportPill>
                )}
                {phase === "playing" && controller === "brain" && !pathwayMode && (
                  <ViewportPill
                    color="var(--accent-teal)"
                    style={{ position: "absolute", right: 0, bottom: 0 }}
                  >
                    ABLATION LIF · every 0.25 s
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
              playMode={playMode}
              regionKey={vizRegion ?? "central_complex"}
              label={modeMeta.label}
              diag={diag}
              nSteps={
                pathwayRef.current?.cx.region.nSteps ??
                engineRef.current?.region.nSteps
              }
              liveBrain={controller === "brain"}
              pathwayMode={pathwayMode}
            />
          </aside>
        </div>

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
