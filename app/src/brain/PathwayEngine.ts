/**
 * Soft AL → MB → CX cascade (hackathon pathway mode).
 *
 * Why soft (not anatomical edges): fetch_connectome only keeps within-region
 * synapses. We chain three frozen exported LIFs: real observe() → AL → map
 * logits into the next engine's 16-D obs → MB → CX. CX probs bias look-ahead.
 */

import {
  LifEngine,
  RegionKey,
  StepResult,
  loadRegion,
} from "./LifEngine";

export type PlayMode = RegionKey | "pathway";

export function isPathway(mode: PlayMode): mode is "pathway" {
  return mode === "pathway";
}

export function isRegionKey(mode: PlayMode): mode is RegionKey {
  return mode !== "pathway";
}

/** Softmax logits → 16-D obs (dims 0–3 = probs; rest 0). Keeps each encoder's contract. */
export function softObsFromLogits(logits: Float32Array): Float32Array {
  const o = new Float32Array(16);
  let max = -Infinity;
  for (let i = 0; i < logits.length; i++) max = Math.max(max, logits[i]);
  let sum = 0;
  for (let i = 0; i < logits.length; i++) {
    const e = Math.exp(logits[i] - max);
    o[i] = e;
    sum += e;
  }
  if (sum > 0) {
    for (let i = 0; i < logits.length; i++) o[i] /= sum;
  }
  return o;
}

export interface PathwayStepResult extends StepResult {
  /** Per-stage spike totals for atlas multi-glow. */
  stageResults: {
    antennal_lobe: StepResult;
    mushroom_body: StepResult;
    central_complex: StepResult;
  };
}

export class PathwayEngine {
  readonly al: LifEngine;
  readonly mb: LifEngine;
  readonly cx: LifEngine;

  constructor(al: LifEngine, mb: LifEngine, cx: LifEngine) {
    this.al = al;
    this.mb = mb;
    this.cx = cx;
  }

  static async load(): Promise<PathwayEngine> {
    const [alB, mbB, cxB] = await Promise.all([
      loadRegion("antennal_lobe"),
      loadRegion("mushroom_body"),
      loadRegion("central_complex"),
    ]);
    return new PathwayEngine(new LifEngine(alB), new LifEngine(mbB), new LifEngine(cxB));
  }

  /**
   * AL sees real game obs; MB soft-sees AL logits (pathway story);
   * CX sees real game obs (board danger). Move probs are a blend of all three
   * stages — CX alone often collapses to one prior (~54% forward) on quiet
   * boards, which made the UI bars look frozen.
   */
  step(obs: Float32Array | number[]): PathwayStepResult {
    const real =
      obs instanceof Float32Array ? obs : Float32Array.from(obs as number[]);
    const al = this.al.step(real);
    const mb = this.mb.step(softObsFromLogits(al.logits));
    const cx = this.cx.step(real);

    // Weighted pathway readout for bars + scriptedBot prior.
    const probs = new Float32Array(4);
    for (let a = 0; a < 4; a++) {
      probs[a] = 0.35 * al.probs[a] + 0.25 * mb.probs[a] + 0.4 * cx.probs[a];
    }
    let sum = 0;
    for (let a = 0; a < 4; a++) sum += probs[a];
    if (sum > 0) {
      for (let a = 0; a < 4; a++) probs[a] /= sum;
    }
    let action = 0;
    for (let a = 1; a < 4; a++) if (probs[a] > probs[action]) action = a;

    return {
      ...cx,
      action,
      probs,
      stageResults: {
        antennal_lobe: al,
        mushroom_body: mb,
        central_complex: cx,
      },
    };
  }

  runSelfcheck(): number {
    return Math.max(this.al.runSelfcheck(), this.mb.runSelfcheck(), this.cx.runSelfcheck());
  }
}
