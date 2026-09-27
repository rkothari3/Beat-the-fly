/**
 * Main demo UI — live match chrome + pathway / region picker overlay.
 *
 * Live pathway (default science mode): AL→MB→CX LIF scores moves, brain-weighted
 * look-ahead search picks the hop (Fly Chess hybrid, priorStrength 18).
 * Single-region = ablation LIF-only.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { LaneWorld, ACTION_FORWARD, ACTION_LEFT, ACTION_RIGHT, ACTION_STAY, Action } from "../core/LaneWorld";
import { observe } from "../core/observe";
import { scriptedBot } from "../core/scriptedBot";
import { SplitScreen } from "../game/SplitScreen";
import { preloadCrossyAssets } from "../game/CrossyAssets";
import { preloadFlyModel } from "../game/characters/FlyCharacter";
import { LifEngine, loadRegion, RegionKey, StepResult } from "../brain/LifEngine";
import { PathwayEngine, PlayMode, isPathway, isRegionKey } from "../brain/PathwayEngine";
import { BrainPanel } from "./BrainPanel";
import { RegionPicker, PLAY_MODES, FlyOpponent } from "./RegionPicker";
import { ResultsScreen } from "./ResultsScreen";
import { LearnPanel } from "./LearnPanel";
import { TopBar, ViewportPill } from "./TopBar";
import {
  LeaderEntry,
  addLocalEntry,
  loadBoard,
  loadPlayerName,
  postMatch,
  savePlayerName,
} from "./leaderboard";

type Phase = "picker" | "learn" | "playing" | "results";
/**
 * Live decision source for the fly.
 * "bot" = look-ahead only.
 * "brain" = pathway hybrid (prior + search) or single-region LIF ablation.
 */
type FlyController = "brain" | "bot" | "random";

const ROUND_SECONDS = 30;
/**
 * How often the fly picks a new hop.
 *
 * Why ~300ms (not 720 / not 180):
 *   - The LIF pathway already finishes in one JS call — speed isn’t a language problem.
 *   - 180ms was so fast the AL→MB→CX *animation* never left AL (reset every decision).
 *   - 720ms fixed that but felt sluggish. 300ms + a compressed cascade (~250ms)
 *     keeps the story readable without sandbagging the fly.
 */
const DECISION_EVERY_MS = 300;

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
  const [status, setStatus] = useState("Enter a name and start the pathway.");
  const [playerName, setPlayerName] = useState(() => loadPlayerName());
  const [board, setBoard] = useState<LeaderEntry[]>([]);
  const [boardSource, setBoardSource] = useState<"remote" | "local">("local");
  const [lastEntryId, setLastEntryId] = useState<string | undefined>();
  /** False when Play with empty name — watch-only, no leaderboard. */
  const [humanCompete, setHumanCompete] = useState(true);
  const seedRef = useRef(1);

  useEffect(() => {
    void preloadCrossyAssets().catch((e) =>
      console.error("[crossy] preload failed", e)
    );
    void preloadFlyModel().catch((e) =>
      console.error("[fly] preload failed", e)
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
      if (phase !== "playing" || !humanCompete) return;
      const k = e.key.toLowerCase();
      if (k === "arrowup" || k === "w") pendingHuman.current = ACTION_FORWARD;
      else if (k === "arrowleft" || k === "a") pendingHuman.current = ACTION_LEFT;
      else if (k === "arrowright" || k === "d") pendingHuman.current = ACTION_RIGHT;
      else if (k === " ") pendingHuman.current = ACTION_STAY;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, humanCompete]);

  useEffect(() => {
    let cancelled = false;
    loadBoard().then(({ entries, source }) => {
      if (!cancelled) {
        setBoard(entries);
        setBoardSource(source);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [phase]);

  function updatePlayerName(name: string) {
    setPlayerName(name);
    savePlayerName(name);
  }

  async function startRound(nextMode: PlayMode, nextOpponent: FlyOpponent = opponent) {
    const compete = playerName.trim().length > 0;
    setHumanCompete(compete);
    setPlayMode(nextMode);
    setOpponent(nextOpponent);
    setStatus(compete ? "Loading..." : "Watching the fly — enter a name to compete.");
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
            compete
              ? err > 1e-2
                ? `Selfcheck warn (max err=${err.toFixed(4)}) — pathway hybrid.`
                : "Live pathway AL→MB→CX + look-ahead search. ↑←→ / WASD to hop!"
              : "Spectating the pathway fly. Enter a name on the home screen to compete."
          );
        } else {
          setStatus(
            compete
              ? "Look-ahead fly. Atlas shows AL→MB→CX pathway glow. ↑←→ / WASD!"
              : "Spectating. Enter a name to compete."
          );
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
    pendingHuman.current = null;
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
          if (pendingHuman.current !== null && human.alive && humanCompete) {
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
              // Hybrid: pathway scores nudge look-ahead (brain-weighted priorStrength 18).
              const result = path.step(observe(fly));
              action = scriptedBot(fly, {
                prior: result.probs,
                priorStrength: 18,
              });
              // Fresh copies so UI bars always see this hop’s CX probs
              // (never a mutated buffer from the next step).
              setDiag({
                ...result,
                action,
                probs: Float32Array.from(result.probs),
                logits: Float32Array.from(result.logits),
              });
            } else if (controller === "brain" && eng) {
              // Single-region ablation: LIF chooses directly.
              const result = eng.step(observe(fly));
              action = result.action as Action;
              setDiag({
                ...result,
                probs: Float32Array.from(result.probs),
                logits: Float32Array.from(result.logits),
              });
            } else if (controller === "bot") {
              action = scriptedBot(fly);
              if (path) {
                const result = path.step(observe(fly));
                setDiag({
                  ...result,
                  probs: Float32Array.from(result.probs),
                  logits: Float32Array.from(result.logits),
                });
              } else if (eng) {
                const result = eng.step(observe(fly));
                setDiag({
                  ...result,
                  probs: Float32Array.from(result.probs),
                  logits: Float32Array.from(result.logits),
                });
              }
            } else {
              action = ((Math.random() * 4) | 0) as Action;
            }
            fly.act(action);
          }
        }

        setScores({ human: human.score, fly: fly.score });
        if (humanCompete) {
          // Match clock follows whoever is still alive — LaneWorld freezes
          // `.time` on death, so human.time alone would stick the UI at death.
          const matchTime = Math.max(human.time, fly.time);
          setTimeLeft(Math.max(0, ROUND_SECONDS - matchTime));
          if (!ended && (matchTime >= ROUND_SECONDS || (!human.alive && !fly.alive))) {
            ended = true;
            finishRound(human, fly);
          }
        } else {
          // Infinite spectate: never end; respawn when the worlds die out.
          if (!human.alive && !fly.alive) {
            seedRef.current = (seedRef.current + 1) | 0;
            const [h2, f2] = LaneWorld.pair(seedRef.current);
            humanRef.current = h2;
            flyRef.current = f2;
            split.human.reset();
            split.fly.reset();
          }
        }
      } else if (phase === "picker" || phase === "learn") {
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
  }, [phase, controller, playMode, humanCompete]);

  function finishRound(human: LaneWorld, fly: LaneWorld) {
    const winner =
      human.score === fly.score ? "Tie" : human.score > fly.score ? "You win" : "Fly wins";
    setStatus(`${winner}! ${human.score} — ${fly.score}`);
    setScores({ human: human.score, fly: fly.score });

    if (humanCompete) {
      const name = playerName.trim().slice(0, 24);
      const entry = addLocalEntry({
        name,
        humanScore: human.score,
        flyScore: fly.score,
        mode: playMode,
      });
      setLastEntryId(entry.id);

      void postMatch({
        region: playMode,
        human_score: human.score,
        fly_score: fly.score,
        controller,
        duration_s: Math.max(human.time, fly.time),
        player_name: name,
        spike_summary: diag?.stageSpikes ?? {},
      })
        .then(() => loadBoard())
        .then(({ entries, source }) => {
          setBoard(entries);
          setBoardSource(source);
        });

      void loadBoard().then(({ entries, source }) => {
        setBoard(entries);
        setBoardSource(source);
      });
    } else {
      setLastEntryId(undefined);
    }

    setPhase("results");
  }

  const modeMeta = useMemo(
    () => PLAY_MODES.find((r) => r.key === playMode)!,
    [playMode]
  );
  const showOverlay = phase === "picker" || phase === "learn" || phase === "results";
  const pathwayMode = isPathway(playMode);
  const vizRegion: RegionKey | undefined = isRegionKey(playMode) ? playMode : undefined;

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
        timeLeft={phase === "playing" ? timeLeft : phase === "results" ? 0 : ROUND_SECONDS}
        roundSeconds={ROUND_SECONDS}
        showScoreboard={phase !== "picker"}
        flyScoreOnly={phase === "playing" && !humanCompete}
        showTimer={phase === "playing" && humanCompete}
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
            {/* Greyscale lock on YOU when playing without a name */}
            {phase === "playing" && !humanCompete && (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "50%",
                  backdropFilter: "grayscale(1) brightness(0.55)",
                  WebkitBackdropFilter: "grayscale(1) brightness(0.55)",
                  background: "rgba(8,10,15,0.35)",
                  pointerEvents: "none",
                  zIndex: 2,
                }}
              />
            )}
            <div
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                zIndex: 3,
              }}
            >
              <div style={{ position: "relative" }}>
                <ViewportPill color="var(--accent-you)">YOU</ViewportPill>
              </div>
              <div style={{ position: "relative" }}>
                <ViewportPill color="var(--accent-fly)">FLY</ViewportPill>
              </div>
            </div>
            {phase === "playing" && !humanCompete && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: "50%",
                  zIndex: 5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  boxSizing: "border-box",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: 300,
                    pointerEvents: "auto",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-accent)",
                    borderRadius: "var(--radius-lg)",
                    padding: "16px 18px",
                    boxShadow: "0 12px 40px rgba(0,0,0,0.55)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Watch mode
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      lineHeight: 1.25,
                    }}
                  >
                    Think you can beat the fly?
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "var(--text-secondary)",
                      lineHeight: 1.45,
                    }}
                  >
                    Enter a name on the home screen to compete and join the leaderboard.
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: "var(--text-muted)",
                      lineHeight: 1.4,
                    }}
                  >
                    You&apos;re only watching — the fly side stays clear.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPhase("picker")}
                    style={{
                      marginTop: 4,
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#052e28",
                      background: "var(--accent-teal)",
                      border: "none",
                      borderRadius: "var(--radius-pill)",
                      padding: "10px 16px",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    ← Back
                  </button>
                </div>
              </div>
            )}
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

        {showOverlay && (
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
              padding: "16px 28px 20px",
              overflow: "hidden",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {phase === "results" ? (
              <ResultsScreen
                humanScore={scores.human}
                flyScore={scores.fly}
                playerName={playerName.trim() || "Anonymous"}
                board={board}
                boardSource={boardSource}
                highlightId={lastEntryId}
                onPlayAgain={() => startRound("pathway", "brain")}
                onBackHome={() => setPhase("picker")}
              />
            ) : phase === "learn" ? (
              <LearnPanel onBack={() => setPhase("picker")} />
            ) : (
              <RegionPicker
                onPick={(r, op) => startRound(r, op)}
                onLearn={() => setPhase("learn")}
                playerName={playerName}
                onPlayerName={updatePlayerName}
                board={board}
                boardSource={boardSource}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
