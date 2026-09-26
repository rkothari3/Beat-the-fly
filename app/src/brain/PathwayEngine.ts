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
   * AL sees real game obs; MB/CX see softObs from upstream logits.
   * Returned action/logits/probs are CX (steering); stageSpikes from CX for RING/PFN/PFL UI.
   */
  step(obs: Float32Array | number[]): PathwayStepResult {
    const al = this.al.step(obs);
    const mb = this.mb.step(softObsFromLogits(al.logits));
    const cx = this.cx.step(softObsFromLogits(mb.logits));
    return {
      ...cx,
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
